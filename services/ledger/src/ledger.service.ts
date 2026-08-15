import { PrismaClient, Prisma, LedgerEntryType, LedgerReferenceType } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { recordAuditEventInTransaction } from "../../audit/src/audit.service";

const prisma = new PrismaClient();

export class LedgerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export interface PostingLine {
  accountId: string;
  amount: Prisma.Decimal | string | number; // positive = credit, negative = debit
  type: LedgerEntryType;
}

export interface PostDoubleEntryInput {
  referenceType: LedgerReferenceType;
  referenceId: string;
  createdBy: string;
  lines: PostingLine[]; // must sum to exactly zero
}

/**
 * Posts a balanced set of ledger entries atomically. This is the ONLY
 * function in the codebase allowed to write to LedgerEntry — every balance
 * change in the entire platform (trades, deposits, withdrawals, fees,
 * manual adjustments) must go through this function so there is exactly one
 * code path to audit for correctness.
 *
 * Guarantees:
 *  - Lines must sum to zero (double-entry: nothing is created or destroyed).
 *  - Idempotent: calling twice with the same referenceType/referenceId/account
 *    combination is a no-op the second time (safe to retry on network error).
 *  - Atomic: either all lines are written and balances updated, or none are.
 *  - Row-locked: concurrent postings against the same account cannot race
 *    each other into an inconsistent balance.
 */
export async function postDoubleEntry(input: PostDoubleEntryInput): Promise<{ postingGroupId: string; alreadyPosted: boolean }> {
  const sum = input.lines.reduce((acc, l) => acc.plus(new Prisma.Decimal(l.amount)), new Prisma.Decimal(0));
  if (!sum.equals(0)) {
    throw new LedgerError(
      `Ledger postings must net to zero. Got ${sum.toString()} for reference ${input.referenceType}:${input.referenceId}`,
      "UNBALANCED_POSTING"
    );
  }
  if (input.lines.length < 2) {
    throw new LedgerError("A double-entry posting requires at least two lines.", "INSUFFICIENT_LINES");
  }

  const postingGroupId = uuidv4();

  return prisma.$transaction(async (tx) => {
    // Idempotency check: if any line's key already exists, the whole
    // operation was already applied — return without re-applying.
    const idempotencyKeys = input.lines.map((l) => `${input.referenceType}:${input.referenceId}:${l.accountId}`);
    const existing = await tx.ledgerEntry.findMany({
      where: { idempotencyKey: { in: idempotencyKeys } },
      select: { idempotencyKey: true, postingGroupId: true },
    });
    if (existing.length > 0) {
      return { postingGroupId: existing[0].postingGroupId, alreadyPosted: true };
    }

    // Lock accounts in a deterministic order (sorted by id) to prevent
    // deadlocks when two postings touch the same pair of accounts.
    const sortedAccountIds = [...new Set(input.lines.map((l) => l.accountId))].sort();
    for (const accountId of sortedAccountIds) {
      // SELECT ... FOR UPDATE via Prisma's raw query, since Prisma has no
      // native row-lock API. This serializes concurrent postings per account.
      await tx.$queryRaw`SELECT id FROM "BalanceAccount" WHERE id = ${accountId} FOR UPDATE`;
    }

    for (const line of input.lines) {
      await tx.ledgerEntry.create({
        data: {
          accountId: line.accountId,
          amount: new Prisma.Decimal(line.amount),
          type: line.type,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          postingGroupId,
          idempotencyKey: `${input.referenceType}:${input.referenceId}:${line.accountId}`,
          createdBy: input.createdBy,
        },
      });

      const account = await tx.balanceAccount.findUniqueOrThrow({ where: { id: line.accountId } });
      const newBalance = account.cachedBalance.plus(new Prisma.Decimal(line.amount));

      if (newBalance.lessThan(0)) {
        // Aborting inside the transaction rolls back every write above —
        // no partial posting can ever leave a negative balance.
        throw new LedgerError(
          `Posting would result in a negative balance for account ${line.accountId}.`,
          "INSUFFICIENT_BALANCE"
        );
      }

      await tx.balanceAccount.update({
        where: { id: line.accountId },
        data: { cachedBalance: newBalance },
      });
    }

    return { postingGroupId, alreadyPosted: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** Authoritative balance, recomputed directly from ledger entries — never trusts the cache. */
export async function getAuthoritativeBalance(accountId: string): Promise<Prisma.Decimal> {
  const result = await prisma.ledgerEntry.aggregate({
    where: { accountId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? new Prisma.Decimal(0);
}

/** Reconciliation job: compares cached balance to the ledger-derived truth and flags drift. Run on a schedule. */
export async function reconcileAccount(accountId: string): Promise<{ inSync: boolean; cached: Prisma.Decimal; authoritative: Prisma.Decimal }> {
  const account = await prisma.balanceAccount.findUniqueOrThrow({ where: { id: accountId } });
  const authoritative = await getAuthoritativeBalance(accountId);
  const inSync = account.cachedBalance.equals(authoritative);

  if (!inSync) {
    // Never silently "fix" it by overwriting — a drift means something else
    // is wrong (a bug or a bypassed code path) and needs investigation.
    // In production this should raise a RISK_OFFICER alert, not auto-correct.
    console.error(`LEDGER DRIFT DETECTED: account=${accountId} cached=${account.cachedBalance} authoritative=${authoritative}`);
  }

  return { inSync, cached: account.cachedBalance, authoritative };
}

// Convenience helper for the common two-line case (debit one account, credit another).
export async function postTransfer(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: Prisma.Decimal | string | number;
  referenceType: LedgerReferenceType;
  referenceId: string;
  createdBy: string;
}) {
  const amt = new Prisma.Decimal(params.amount);
  return postDoubleEntry({
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    createdBy: params.createdBy,
    lines: [
      { accountId: params.fromAccountId, amount: amt.negated(), type: "DEBIT" },
      { accountId: params.toAccountId, amount: amt, type: "CREDIT" },
    ],
  });
}

/**
 * Manual balance adjustments (promotional credit, compensation, correction).
 * This is the ONLY path for an admin to move a customer's balance outside of
 * a real trade/deposit/withdrawal — and it is inseparable from its audit
 * record and its AdminAction record: all three (ledger entries, AdminAction,
 * AuditLog) commit in one transaction, or none of them do.
 */
export async function postManualAdjustment(params: {
  operatorId: string;
  operatorRoles: string[];
  targetUserId: string;
  targetAccountId: string;
  platformOffsetAccountId: string;
  amount: Prisma.Decimal | string | number;
  reason: string;
  referenceNumber: string;
  requiresSecondApproval: boolean;
  requestId: string;
  ipAddress?: string;
}) {
  if (!params.operatorRoles.includes("FINANCE_ADMIN") && !params.operatorRoles.includes("SUPER_ADMIN")) {
    throw new LedgerError("Not authorized to make manual balance adjustments.", "FORBIDDEN");
  }
  if (!params.reason || params.reason.trim().length < 5) {
    throw new LedgerError("A meaningful reason is required for a manual adjustment.", "MISSING_REASON");
  }

  const amt = new Prisma.Decimal(params.amount);

  return prisma.$transaction(async (tx) => {
    const adminAction = await tx.adminAction.create({
      data: {
        operatorId: params.operatorId,
        actionType: "MANUAL_BALANCE_ADJUSTMENT",
        targetUserId: params.targetUserId,
        reason: params.reason,
        referenceNumber: params.referenceNumber,
        requiresSecondApproval: params.requiresSecondApproval,
      },
    });

    await recordAuditEventInTransaction(tx, {
      actorId: params.operatorId,
      role: params.operatorRoles.join(","),
      action: "MANUAL_BALANCE_ADJUSTMENT",
      targetType: "User",
      targetId: params.targetUserId,
      previousValue: null,
      newValue: { amount: amt.toString(), reason: params.reason, referenceNumber: params.referenceNumber, adminActionId: adminAction.id },
      ipAddress: params.ipAddress,
      requestId: params.requestId,
    });

    // Note: this reuses the same lock-ordering + negative-balance guard as
    // postDoubleEntry, inlined here because it must share this transaction
    // (postDoubleEntry opens its own transaction, which can't be nested).
    const sortedAccountIds = [params.targetAccountId, params.platformOffsetAccountId].sort();
    for (const accountId of sortedAccountIds) {
      await tx.$queryRaw`SELECT id FROM "BalanceAccount" WHERE id = ${accountId} FOR UPDATE`;
    }

    const postingGroupId = uuidv4();
    const lines: { accountId: string; amount: Prisma.Decimal; type: LedgerEntryType }[] = [
      { accountId: params.targetAccountId, amount: amt, type: amt.isNegative() ? "DEBIT" : "CREDIT" },
      { accountId: params.platformOffsetAccountId, amount: amt.negated(), type: amt.isNegative() ? "CREDIT" : "DEBIT" },
    ];

    for (const line of lines) {
      await tx.ledgerEntry.create({
        data: {
          accountId: line.accountId,
          amount: line.amount,
          type: line.type,
          referenceType: "MANUAL_ADJUSTMENT",
          referenceId: adminAction.id,
          postingGroupId,
          idempotencyKey: `MANUAL_ADJUSTMENT:${adminAction.id}:${line.accountId}`,
          createdBy: params.operatorId,
        },
      });

      const account = await tx.balanceAccount.findUniqueOrThrow({ where: { id: line.accountId } });
      const newBalance = account.cachedBalance.plus(line.amount);
      if (newBalance.lessThan(0)) {
        throw new LedgerError(`Adjustment would result in a negative balance for account ${line.accountId}.`, "INSUFFICIENT_BALANCE");
      }
      await tx.balanceAccount.update({ where: { id: line.accountId }, data: { cachedBalance: newBalance } });
    }

    return adminAction;
  });
}
