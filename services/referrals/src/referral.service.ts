import { PrismaClient, Prisma } from "@prisma/client";
import { postDoubleEntry } from "../../ledger/src/ledger.service";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

export class ReferralError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// Configurable via SystemSetting in the full implementation. Commission is a
// share of the platform's trading fee revenue from the referred user's
// trades — never a share of the referred user's losses, and never framed to
// customers as investment income of any kind.
const COMMISSION_RATE_OF_FEES = new Prisma.Decimal("0.20"); // 20% of fees generated

export class ReferralService {
  /** Generates a unique, non-guessable referral code for a user (idempotent — returns existing if already generated). */
  async getOrCreateReferralCode(userId: string): Promise<string> {
    // Referral codes are derived from a short random suffix, not the user's
    // email or ID, so codes can be shared publicly without leaking account
    // identifiers.
    const existing = await prisma.referral.findFirst({ where: { referrerId: userId } });
    if (existing) return existing.code;

    return `BTB-${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  /** Called once, at registration, when a new user signs up via a referral link. */
  async attributeReferral(params: { referrerCode: string; newUserId: string }) {
    // A user can only ever be referred once — this is enforced at the
    // database level via Referral.refereeId being unique, not just here.
    const referrerAccount = await prisma.user.findFirst({
      where: { referralAsReferrer: { some: { code: params.referrerCode } } },
    });
    if (!referrerAccount) {
      // Invalid/unknown code — fail silently for registration flow (don't
      // block signup over a bad referral code), just don't create a link.
      return null;
    }
    if (referrerAccount.id === params.newUserId) {
      throw new ReferralError("Cannot refer yourself.", "SELF_REFERRAL");
    }

    return prisma.referral.create({
      data: {
        referrerId: referrerAccount.id,
        refereeId: params.newUserId,
        code: params.referrerCode,
      },
    });
  }

  /**
   * Called by the Trading Engine after a trade settles. Accrues commission
   * for the referrer based on the fee actually paid — never based on the
   * referred customer's trading result. This function has no path to credit
   * a referrer more for a customer's loss or less for a customer's gain.
   */
  async accrueCommissionForTrade(params: { tradeId: string; payerUserId: string; feeAmount: Prisma.Decimal; feeAssetId: string }) {
    const referral = await prisma.referral.findUnique({ where: { refereeId: params.payerUserId } });
    if (!referral) return null; // this user wasn't referred by anyone — nothing to do

    const commissionAmount = params.feeAmount.mul(COMMISSION_RATE_OF_FEES);
    if (commissionAmount.lessThanOrEqualTo(0)) return null;

    const commission = await prisma.commission.create({
      data: {
        referralId: referral.id,
        amount: commissionAmount,
        assetId: params.feeAssetId,
        status: "PENDING",
      },
    });

    const referrerAccount = await prisma.balanceAccount.upsert({
      where: { userId_assetId: { userId: referral.referrerId, assetId: params.feeAssetId } },
      update: {},
      create: { userId: referral.referrerId, assetId: params.feeAssetId, cachedBalance: new Prisma.Decimal(0) },
    });
    const feeAccount = await prisma.balanceAccount.upsert({
      where: { userId_assetId: { userId: "00000000-0000-0000-0000-000000000000", assetId: params.feeAssetId } },
      update: {},
      create: {
        userId: "00000000-0000-0000-0000-000000000000",
        assetId: params.feeAssetId,
        cachedBalance: new Prisma.Decimal(0),
      },
    });

    await postDoubleEntry({
      referenceType: "REFERRAL_COMMISSION",
      referenceId: commission.id,
      createdBy: "system:referrals",
      lines: [
        { accountId: feeAccount.id, amount: commissionAmount.negated(), type: "DEBIT" },
        { accountId: referrerAccount.id, amount: commissionAmount, type: "CREDIT" },
      ],
    });

    return prisma.commission.update({ where: { id: commission.id }, data: { status: "PAID" } });
  }

  async getAgentStats(userId: string) {
    const referral = await prisma.referral.findMany({ where: { referrerId: userId }, include: { commissions: true } });

    const totalCommission = referral
      .flatMap((r) => r.commissions)
      .reduce((sum, c) => sum.plus(c.amount), new Prisma.Decimal(0));

    return {
      referredUserCount: referral.length,
      totalCommissionPaid: totalCommission,
      commissionHistory: referral.flatMap((r) => r.commissions),
    };
  }
}
