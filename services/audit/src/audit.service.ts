import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface AuditEvent {
  actorId: string | null; // null for unauthenticated events, e.g. failed login attempts
  role: string | null;
  action: string; // UPPER_SNAKE_CASE, e.g. "WITHDRAWAL_APPROVED", "KYC_STATUS_CHANGED"
  targetType?: string; // e.g. "Withdrawal", "User", "SystemSetting"
  targetId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  requestId: string; // correlates this log entry back to the originating HTTP request
}

/**
 * The single function every service in the platform calls to record an
 * audit event. Nothing writes to AuditLog directly — this keeps the audit
 * trail's shape consistent and makes it possible to reason about "is
 * everything that should be logged, actually logged" by auditing call sites
 * of this one function instead of every service individually.
 *
 * Design choices:
 *  - Never throws to the caller on logging failure for a successful business
 *    operation — a logging outage should not be able to block, say, a
 *    customer login. Instead it logs the audit-write failure itself to
 *    stderr/monitoring, which should page someone.
 *  - Called AFTER the business transaction commits for read-mostly events
 *    (logins, views), but INSIDE the same transaction for state-changing
 *    financial/administrative actions — see auditWithinTransaction below.
 */
export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: event.actorId ?? undefined,
        role: event.role ?? undefined,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        previousValue: event.previousValue as any,
        newValue: event.newValue as any,
        ipAddress: event.ipAddress,
        requestId: event.requestId,
      },
    });
  } catch (err) {
    // A failed audit write must never silently disappear — this needs to be
    // wired to real alerting (e.g. PagerDuty/Slack) in production, since an
    // audit gap is itself a compliance and security concern.
    console.error(`[audit] FAILED TO WRITE AUDIT LOG for action=${event.action}: ${(err as Error).message}`, event);
  }
}

/**
 * For financial/administrative state changes, the audit write must succeed
 * atomically with the business change — if one fails, both roll back. Pass
 * the same Prisma transaction client used for the business write.
 */
export async function recordAuditEventInTransaction(tx: any, event: AuditEvent): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: event.actorId ?? undefined,
      role: event.role ?? undefined,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      previousValue: event.previousValue as any,
      newValue: event.newValue as any,
      ipAddress: event.ipAddress,
      requestId: event.requestId,
    },
  });
}

// The canonical list of actions that MUST be audited, per the platform's
// security requirements. Used by a CI check (see test file) that scans
// service source for calls to recordAuditEvent/recordAuditEventInTransaction
// and flags any of these action strings that never appear as a literal.
export const REQUIRED_AUDITED_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "PASSWORD_CHANGED",
  "MFA_ENABLED",
  "MFA_DISABLED",
  "KYC_STATUS_CHANGED",
  "MANUAL_BALANCE_ADJUSTMENT",
  "WITHDRAWAL_APPROVED",
  "WITHDRAWAL_REJECTED",
  "ACCOUNT_FROZEN",
  "ACCOUNT_UNFROZEN",
  "ROLE_PERMISSION_CHANGED",
  "SYSTEM_SETTING_CHANGED",
  "MARKET_CONFIG_CHANGED",
] as const;
