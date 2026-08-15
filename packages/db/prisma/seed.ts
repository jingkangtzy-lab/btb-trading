// Seeds roles + permissions so RBAC checks have real data to evaluate against.
// Run with: npx ts-node packages/db/prisma/seed.ts   (wired into `npm run db:seed`)

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ROLES = [
  "SUPER_ADMIN",
  "FINANCE_ADMIN",
  "TRADING_ADMIN",
  "CUSTOMER_SUPPORT",
  "KYC_REVIEWER",
  "RISK_OFFICER",
  "AGENT_MANAGER",
  "AUDITOR",
] as const;

const PERMISSIONS = [
  "customer:view",
  "kyc:approve",
  "kyc:view",
  "ledger:write",
  "ledger:read",
  "withdrawal:approve",
  "withdrawal:approve_second",
  "market:configure",
  "account:freeze",
  "account:freeze_request",
  "agent:manage",
  "audit:read",
  "settings:write",
  "risk:flag",
] as const;

// role -> permission keys, matching the admin permission matrix in the architecture doc
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [...PERMISSIONS], // full access
  FINANCE_ADMIN: ["customer:view", "ledger:write", "ledger:read", "withdrawal:approve", "withdrawal:approve_second"],
  TRADING_ADMIN: ["market:configure"],
  CUSTOMER_SUPPORT: ["customer:view", "account:freeze_request"],
  KYC_REVIEWER: ["customer:view", "kyc:approve", "kyc:view"],
  RISK_OFFICER: ["customer:view", "account:freeze", "risk:flag", "withdrawal:approve"],
  AGENT_MANAGER: ["agent:manage"],
  AUDITOR: ["audit:read", "ledger:read", "customer:view"],
};

async function main() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  for (const name of ROLES) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    for (const permKey of ROLE_PERMISSIONS[name]) {
      const perm = await prisma.permission.findUniqueOrThrow({ where: { key: permKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  console.log("Seeded roles and permissions.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
