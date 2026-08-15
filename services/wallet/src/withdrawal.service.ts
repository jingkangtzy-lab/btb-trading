import { PrismaClient, Prisma } from "@prisma/client";
import { postDoubleEntry } from "../../ledger/src/ledger.service";
import { CustodyProvider } from "./custody-provider.interface";
import { recordAuditEventInTransaction } from "../../audit/src/audit.service";
import { evaluateWithdrawal } from "../../kyc/src/aml-monitoring";

const prisma = new PrismaClient();

export class WithdrawalError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// Configurable via SystemSetting in the full implementation.
const SECOND_APPROVAL_THRESHOLD_USD = 10_000;

export class WithdrawalService {
  constructor(private custody: CustodyProvider) {}

  /** Customer-facing: submit a withdrawal request. Funds are held (not yet moved) pending review. */
  async requestWithdrawal(params: {
    userId: string;
    assetSymbol: string;
    networkCode: string;
    destinationAddress: string;
    destinationMemoTag?: string;
    amount: string;
  }) {
    const asset = await prisma.asset.findUniqueOrThrow({ where: { symbol: params.assetSymbol } });
    const network = await prisma.network.findUniqueOrThrow({ where: { code: params.networkCode } });

    if (!this.custody.isValidAddress(params.destinationAddress, params.networkCode)) {
      throw new WithdrawalError("Destination address is not valid for the selected network.", "INVALID_ADDRESS");
    }

    const kyc = await prisma.kYCProfile.findUnique({ where: { userId: params.userId } });
    if (!kyc || kyc.status !== "APPROVED") {
      throw new WithdrawalError("Withdrawals require an approved KYC profile.", "KYC_NOT_APPROVED");
    }

    const account = await prisma.balanceAccount.findUniqueOrThrow({
      where: { userId_assetId: { userId: params.userId, assetId: asset.id } },
    });
    const amount = new Prisma.Decimal(params.amount);
    const feeAmount = this.estimateNetworkFee(params.networkCode);

    if (account.cachedBalance.lessThan(amount.plus(feeAmount))) {
      throw new WithdrawalError("Insufficient available balance.", "INSUFFICIENT_BALANCE");
    }

    // Risk-based routing: combines the simple threshold check with the AML
    // monitoring rules (velocity, new-account patterns). Flags inform the
    // second-approval requirement — they never block or approve on their own.
    const amlFlags = await evaluateWithdrawal({ userId: params.userId, amountUsdEquivalent: amount });
    const requiresSecondApproval =
      (await this.exceedsRiskThreshold(params.userId, amount)) || amlFlags.some((f) => f.severity === "HIGH");

    // Hold the funds immediately by debiting into a "pending withdrawal"
    // holding account, so the customer can't spend the same balance twice
    // while the withdrawal is under review.
    const holdingAccount = await this.getWithdrawalHoldingAccount(asset.id);

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: params.userId,
        assetId: asset.id,
        networkId: network.id,
        destinationAddress: params.destinationAddress,
        amount,
        feeAmount,
        status: "PENDING_REVIEW",
        requiresSecondApproval,
      },
    });

    await postDoubleEntry({
      referenceType: "WITHDRAWAL",
      referenceId: withdrawal.id,
      createdBy: params.userId,
      lines: [
        { accountId: account.id, amount: amount.plus(feeAmount).negated(), type: "DEBIT" },
        { accountId: holdingAccount.id, amount: amount.plus(feeAmount), type: "CREDIT" },
      ],
    });

    return withdrawal;
  }

  /** Admin-facing: approve a withdrawal. Enforces second-approval rule for high-risk amounts. */
  async approveWithdrawal(withdrawalId: string, approverId: string, approverRoles: string[], requestId: string, ipAddress?: string) {
    if (!approverRoles.includes("FINANCE_ADMIN") && !approverRoles.includes("SUPER_ADMIN")) {
      throw new WithdrawalError("Not authorized to approve withdrawals.", "FORBIDDEN");
    }

    const withdrawal = await prisma.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });

    if (withdrawal.status !== "PENDING_REVIEW" && withdrawal.status !== "ADDITIONAL_VERIFICATION_REQUIRED") {
      throw new WithdrawalError("Withdrawal is not in a reviewable state.", "INVALID_STATE");
    }

    if (withdrawal.requiresSecondApproval && !withdrawal.approvedBy) {
      // First approval recorded, but funds are not released yet. Audited
      // atomically with the state change — if the audit write fails, the
      // approval itself rolls back rather than leaving an unlogged action.
      return prisma.$transaction(async (tx) => {
        const updated = await tx.withdrawal.update({ where: { id: withdrawalId }, data: { approvedBy: approverId } });
        await recordAuditEventInTransaction(tx, {
          actorId: approverId,
          role: approverRoles.join(","),
          action: "WITHDRAWAL_APPROVED",
          targetType: "Withdrawal",
          targetId: withdrawalId,
          previousValue: { approvedBy: null },
          newValue: { approvedBy: approverId, note: "first approval, awaiting second" },
          ipAddress,
          requestId,
        });
        return updated;
      });
    }

    if (withdrawal.requiresSecondApproval && withdrawal.approvedBy === approverId) {
      throw new WithdrawalError("The second approval must come from a different administrator.", "SAME_APPROVER");
    }

    // Either single approval is sufficient, or this is a genuine second approver.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "APPROVED",
          secondApprovedBy: withdrawal.requiresSecondApproval ? approverId : undefined,
          approvedBy: withdrawal.approvedBy ?? approverId,
        },
      });
      await recordAuditEventInTransaction(tx, {
        actorId: approverId,
        role: approverRoles.join(","),
        action: "WITHDRAWAL_APPROVED",
        targetType: "Withdrawal",
        targetId: withdrawalId,
        previousValue: { status: withdrawal.status },
        newValue: { status: "APPROVED", secondApprovedBy: withdrawal.requiresSecondApproval ? approverId : undefined },
        ipAddress,
        requestId,
      });
      return result;
    });

    const result = await this.custody.requestWithdrawal({
      assetSymbol: (await prisma.asset.findUniqueOrThrow({ where: { id: withdrawal.assetId } })).symbol,
      networkCode: (await prisma.network.findUniqueOrThrow({ where: { id: withdrawal.networkId } })).code,
      destinationAddress: withdrawal.destinationAddress,
      amount: withdrawal.amount.toString(),
      clientReference: withdrawal.id,
    });

    if (result.status === "REJECTED") {
      return this.rejectWithdrawal(withdrawalId, `Provider rejected: ${result.rejectionReason}`);
    }

    return prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "BROADCASTING" },
    });
  }

  /** Admin-facing: reject a withdrawal and release the held funds back to the customer. */
  async rejectWithdrawal(withdrawalId: string, reason: string) {
    const withdrawal = await prisma.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    const account = await prisma.balanceAccount.findUniqueOrThrow({
      where: { userId_assetId: { userId: withdrawal.userId, assetId: withdrawal.assetId } },
    });
    const holdingAccount = await this.getWithdrawalHoldingAccount(withdrawal.assetId);
    const totalHeld = withdrawal.amount.plus(withdrawal.feeAmount);

    await postDoubleEntry({
      referenceType: "REFUND",
      referenceId: `${withdrawal.id}-reject`,
      createdBy: "system:withdrawal-service",
      lines: [
        { accountId: holdingAccount.id, amount: totalHeld.negated(), type: "DEBIT" },
        { accountId: account.id, amount: totalHeld, type: "CREDIT" },
      ],
    });

    return prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "REJECTED", rejectedReason: reason },
    });
  }

  /** Called from the custody provider's webhook once the on-chain transaction confirms. */
  async completeWithdrawal(withdrawalId: string, txHash: string) {
    return prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "COMPLETED", txHash },
    });
  }

  private estimateNetworkFee(_networkCode: string): Prisma.Decimal {
    // Real implementation queries the custody provider's current network
    // fee estimate; using a placeholder constant for the reference build.
    return new Prisma.Decimal("0.0005");
  }

  private async exceedsRiskThreshold(_userId: string, amount: Prisma.Decimal): Promise<boolean> {
    // Simplified: flag anything over the threshold. A full RISK_OFFICER
    // configuration would also check velocity (withdrawals per day),
    // new-destination-address flags, and KYC tier.
    return amount.greaterThan(SECOND_APPROVAL_THRESHOLD_USD);
  }

  private async getWithdrawalHoldingAccount(assetId: string) {
    const HOLDING_USER_ID = "00000000-0000-0000-0000-000000000002"; // system account, seeded in Phase 2 migration
    return prisma.balanceAccount.upsert({
      where: { userId_assetId: { userId: HOLDING_USER_ID, assetId } },
      update: {},
      create: { userId: HOLDING_USER_ID, assetId, cachedBalance: new Prisma.Decimal(0) },
    });
  }
}
