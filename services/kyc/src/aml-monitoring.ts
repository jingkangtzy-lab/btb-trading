import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface MonitoringFlag {
  ruleId: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
}

// Configurable via SystemSetting in the full implementation. These are
// starting-point rules only — real AML transaction monitoring for a live
// platform should be reviewed and tuned by a compliance professional and,
// for anything beyond basic velocity checks, likely backed by a licensed
// AML monitoring vendor (e.g. ComplyAdvantage, Chainalysis, Elliptic) rather
// than hand-rolled rules alone.
const RULES = {
  LARGE_SINGLE_WITHDRAWAL_USD: 10_000,
  DAILY_WITHDRAWAL_VELOCITY_USD: 25_000,
  NEW_ACCOUNT_LARGE_DEPOSIT_DAYS: 3,
  NEW_ACCOUNT_LARGE_DEPOSIT_USD: 5_000,
};

/**
 * Evaluates a withdrawal request against configured monitoring rules.
 * Returns flags for a RISK_OFFICER to review — this function NEVER blocks a
 * transaction itself and NEVER approves one. It only informs the human
 * decision that happens in the withdrawal approval workflow.
 */
export async function evaluateWithdrawal(params: {
  userId: string;
  amountUsdEquivalent: Prisma.Decimal;
}): Promise<MonitoringFlag[]> {
  const flags: MonitoringFlag[] = [];

  if (params.amountUsdEquivalent.greaterThan(RULES.LARGE_SINGLE_WITHDRAWAL_USD)) {
    flags.push({
      ruleId: "LARGE_SINGLE_WITHDRAWAL",
      severity: "MEDIUM",
      description: `Withdrawal of $${params.amountUsdEquivalent.toString()} exceeds the single-transaction threshold of $${RULES.LARGE_SINGLE_WITHDRAWAL_USD}.`,
    });
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentWithdrawals = await prisma.withdrawal.findMany({
    where: { userId: params.userId, createdAt: { gte: twentyFourHoursAgo }, status: { not: "REJECTED" } },
  });
  const rollingTotal = recentWithdrawals.reduce(
    (sum, w) => sum.plus(w.amount),
    new Prisma.Decimal(0)
  ).plus(params.amountUsdEquivalent);

  if (rollingTotal.greaterThan(RULES.DAILY_WITHDRAWAL_VELOCITY_USD)) {
    flags.push({
      ruleId: "WITHDRAWAL_VELOCITY",
      severity: "HIGH",
      description: `Rolling 24h withdrawal total of $${rollingTotal.toString()} exceeds the velocity threshold of $${RULES.DAILY_WITHDRAWAL_VELOCITY_USD}.`,
    });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: params.userId } });
  const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (
    accountAgeDays < RULES.NEW_ACCOUNT_LARGE_DEPOSIT_DAYS &&
    params.amountUsdEquivalent.greaterThan(RULES.NEW_ACCOUNT_LARGE_DEPOSIT_USD)
  ) {
    flags.push({
      ruleId: "NEW_ACCOUNT_HIGH_VALUE",
      severity: "HIGH",
      description: `Account is ${accountAgeDays.toFixed(1)} days old and is withdrawing above the new-account threshold.`,
    });
  }

  return flags;
}
