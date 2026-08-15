// Seeds exactly one test account per role, per section 25 of the original
// spec. Run AFTER db:seed (roles/permissions must already exist).
//
// SECURITY: these passwords are for local/test environments only. This
// script must never run against a production database — it checks
// NODE_ENV before doing anything, as a guardrail.

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../../services/auth/src/password";

const prisma = new PrismaClient();

const TEST_PASSWORD = "TestPassword123!"; // local/test only — never used in production

const TEST_USERS: { email: string; roleName: string; isAdmin: boolean }[] = [
  { email: "customer@test.btbtrading.local", roleName: "", isAdmin: false },
  { email: "finance.admin@test.btbtrading.local", roleName: "FINANCE_ADMIN", isAdmin: true },
  { email: "trading.admin@test.btbtrading.local", roleName: "TRADING_ADMIN", isAdmin: true },
  { email: "support@test.btbtrading.local", roleName: "CUSTOMER_SUPPORT", isAdmin: true },
  { email: "kyc.reviewer@test.btbtrading.local", roleName: "KYC_REVIEWER", isAdmin: true },
  { email: "auditor@test.btbtrading.local", roleName: "AUDITOR", isAdmin: true },
  { email: "super.admin@test.btbtrading.local", roleName: "SUPER_ADMIN", isAdmin: true },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed test users into a production environment.");
  }

  const passwordHash = await hashPassword(TEST_PASSWORD);

  for (const spec of TEST_USERS) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {},
      create: {
        email: spec.email,
        passwordHash,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        isAdmin: spec.isAdmin,
        mfaEnabled: spec.isAdmin, // admin test accounts have MFA on, matching the mandatory-MFA rule
      },
    });

    if (spec.roleName) {
      const role = await prisma.role.findUniqueOrThrow({ where: { name: spec.roleName } });
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    console.log(`Seeded ${spec.email}${spec.roleName ? ` (${spec.roleName})` : " (customer, no admin role)"}`);
  }

  console.log(`\nAll test accounts use the password: ${TEST_PASSWORD}`);
  console.log("Admin accounts have mfaEnabled=true but no real TOTP secret seeded — enroll MFA manually via the auth service's mfa.ts helpers before testing admin login end-to-end.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
