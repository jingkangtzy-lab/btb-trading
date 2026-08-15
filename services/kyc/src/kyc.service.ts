import { PrismaClient } from "@prisma/client";
import { recordAuditEventInTransaction } from "../../audit/src/audit.service";
import { SanctionsProvider, ScreeningSubject } from "./sanctions-provider.interface";

const prisma = new PrismaClient();

export class KYCError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// Configurable via SystemSetting in the full implementation — jurisdictions
// the operator has decided NOT to serve, either for licensing reasons or
// sanctions-program reasons (e.g. OFAC-sanctioned countries). This list must
// be reviewed by the business/legal owner before launch — it ships empty
// intentionally rather than with a guessed list, since getting this wrong
// has real legal consequences.
const RESTRICTED_JURISDICTIONS: string[] = [];

export class KYCService {
  constructor(private sanctionsProvider: SanctionsProvider) {}

  async submitProfile(params: {
    userId: string;
    legalName: string;
    dateOfBirth: string;
    country: string;
    documentType: string;
    documentRef: string; // reference to a document already stored in a compliant document vault — raw files never pass through this service
  }) {
    if (RESTRICTED_JURISDICTIONS.includes(params.country)) {
      throw new KYCError(
        "BTB TRADING is not currently available in your jurisdiction.",
        "JURISDICTION_RESTRICTED"
      );
    }

    const profile = await prisma.kYCProfile.upsert({
      where: { userId: params.userId },
      update: {
        legalName: params.legalName,
        dateOfBirth: new Date(params.dateOfBirth),
        country: params.country,
        documentType: params.documentType,
        documentRef: params.documentRef,
        status: "PENDING",
      },
      create: {
        userId: params.userId,
        legalName: params.legalName,
        dateOfBirth: new Date(params.dateOfBirth),
        country: params.country,
        documentType: params.documentType,
        documentRef: params.documentRef,
        status: "PENDING",
      },
    });

    // Screen immediately on submission so the reviewer sees the result
    // before making a decision — never approved automatically based on
    // screening alone, and never skipped based on screening alone either.
    const screening = await this.sanctionsProvider.screen({
      legalName: params.legalName,
      dateOfBirth: params.dateOfBirth,
      country: params.country,
      documentNumber: params.documentRef,
    } satisfies ScreeningSubject);

    if (screening.status !== "CLEAR") {
      await prisma.kYCProfile.update({
        where: { userId: params.userId },
        data: { status: "ADDITIONAL_INFO_REQUIRED" },
      });
    }

    return { profile, screening };
  }

  /** KYC_REVIEWER or SUPER_ADMIN only. Cannot touch balances — this service has no dependency on the ledger. */
  async reviewProfile(params: {
    userId: string;
    reviewerId: string;
    reviewerRoles: string[];
    decision: "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
    requestId: string;
    ipAddress?: string;
  }) {
    if (!params.reviewerRoles.includes("KYC_REVIEWER") && !params.reviewerRoles.includes("SUPER_ADMIN")) {
      throw new KYCError("Not authorized to review KYC profiles.", "FORBIDDEN");
    }

    const existing = await prisma.kYCProfile.findUniqueOrThrow({ where: { userId: params.userId } });

    return prisma.$transaction(async (tx) => {
      const updated = await tx.kYCProfile.update({
        where: { userId: params.userId },
        data: {
          status: params.decision,
          reviewedBy: params.reviewerId,
          reviewedAt: new Date(),
        },
      });

      await recordAuditEventInTransaction(tx, {
        actorId: params.reviewerId,
        role: params.reviewerRoles.join(","),
        action: "KYC_STATUS_CHANGED",
        targetType: "KYCProfile",
        targetId: params.userId,
        previousValue: { status: existing.status },
        newValue: { status: params.decision },
        ipAddress: params.ipAddress,
        requestId: params.requestId,
      });

      return updated;
    });
  }

  async isWithdrawalEligible(userId: string): Promise<boolean> {
    const profile = await prisma.kYCProfile.findUnique({ where: { userId } });
    return profile?.status === "APPROVED";
  }
}
