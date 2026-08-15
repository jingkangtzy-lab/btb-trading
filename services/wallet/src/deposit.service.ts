import { PrismaClient, Prisma } from "@prisma/client";
import { postDoubleEntry } from "../../ledger/src/ledger.service";
import { CustodyProvider, DepositWebhookEvent } from "./custody-provider.interface";

const prisma = new PrismaClient();

export class WalletError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export class DepositService {
  constructor(private custody: CustodyProvider) {}

  async getOrCreateDepositAddress(userId: string, assetSymbol: string, networkCode: string) {
    const asset = await prisma.asset.findUniqueOrThrow({ where: { symbol: assetSymbol } });
    const network = await prisma.network.findUniqueOrThrow({ where: { code: networkCode } });

    const existing = await prisma.walletAddress.findUnique({
      where: { userId_assetId_networkId: { userId, assetId: asset.id, networkId: network.id } },
    });
    if (existing) return existing;

    const result = await this.custody.generateDepositAddress({ userId, assetSymbol, networkCode });

    return prisma.walletAddress.create({
      data: {
        userId,
        assetId: asset.id,
        networkId: network.id,
        address: result.address,
        memoTag: result.memoTag,
        providerRef: result.providerRef,
      },
    });
  }

  /**
   * Handles an inbound deposit webhook from the custody provider. The caller
   * (the HTTP route) MUST have already verified the webhook signature via
   * custody.verifyWebhookSignature() before this is invoked — this function
   * assumes the event is authentic.
   */
  async handleDepositWebhook(event: DepositWebhookEvent) {
    const asset = await prisma.asset.findUniqueOrThrow({ where: { symbol: event.assetSymbol } });
    const network = await prisma.network.findUniqueOrThrow({ where: { code: event.networkCode } });

    const walletAddress = await prisma.walletAddress.findFirst({
      where: { address: event.destinationAddress, assetId: asset.id, networkId: network.id },
    });
    if (!walletAddress) {
      // Deposit to an address we don't recognize — log for investigation,
      // never silently credit anyone.
      console.error(`[wallet] Deposit webhook for unknown address: ${event.destinationAddress}`);
      return;
    }

    const REQUIRED_CONFIRMATIONS = this.getRequiredConfirmations(event.networkCode);

    const deposit = await prisma.deposit.upsert({
      where: { txHash: event.txHash },
      update: { confirmations: event.confirmations },
      create: {
        userId: walletAddress.userId,
        assetId: asset.id,
        networkId: network.id,
        amount: new Prisma.Decimal(event.amount),
        txHash: event.txHash,
        confirmations: event.confirmations,
        requiredConfirmations: REQUIRED_CONFIRMATIONS,
        status: event.confirmations >= REQUIRED_CONFIRMATIONS ? "CONFIRMED" : "PENDING",
      },
    });

    // Only credit the customer's ledger once, at the moment confirmations
    // first cross the threshold — never on every webhook re-delivery.
    if (deposit.status === "CONFIRMED" && !deposit.creditedAt) {
      const account = await prisma.balanceAccount.upsert({
        where: { userId_assetId: { userId: walletAddress.userId, assetId: asset.id } },
        update: {},
        create: { userId: walletAddress.userId, assetId: asset.id, cachedBalance: new Prisma.Decimal(0) },
      });

      const platformCustodyAccount = await this.getPlatformCustodyAccount(asset.id);

      await postDoubleEntry({
        referenceType: "BLOCKCHAIN_DEPOSIT",
        referenceId: deposit.id,
        createdBy: "system:wallet-webhook",
        lines: [
          { accountId: platformCustodyAccount.id, amount: deposit.amount.negated(), type: "DEBIT" },
          { accountId: account.id, amount: deposit.amount, type: "CREDIT" },
        ],
      });

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: "CREDITED", creditedAt: new Date() },
      });
    }
  }

  private getRequiredConfirmations(networkCode: string): number {
    // Configurable per network via SystemSetting in the real implementation;
    // sane conservative defaults here.
    const defaults: Record<string, number> = { BTC: 3, ERC20: 12, TRC20: 20 };
    return defaults[networkCode] ?? 12;
  }

  private async getPlatformCustodyAccount(assetId: string) {
    const PLATFORM_CUSTODY_USER_ID = "00000000-0000-0000-0000-000000000001"; // system account, seeded in Phase 2 migration
    return prisma.balanceAccount.upsert({
      where: { userId_assetId: { userId: PLATFORM_CUSTODY_USER_ID, assetId } },
      update: {},
      create: { userId: PLATFORM_CUSTODY_USER_ID, assetId, cachedBalance: new Prisma.Decimal(0) },
    });
  }
}
