import { PrismaClient, Prisma, OrderSide, OrderType } from "@prisma/client";
import { postDoubleEntry } from "../../ledger/src/ledger.service";
import { MarketDataService } from "../../market-data/src/market-data.service";

const prisma = new PrismaClient();

export class TradingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export interface PlaceOrderInput {
  userId: string;
  marketSymbol: string;
  side: OrderSide;
  type: OrderType;
  amount: string; // quote-currency amount the customer wants to trade
  idempotencyKey: string;
}

/**
 * Places and executes a market order in a single, fully validated flow.
 *
 * Non-negotiable rules enforced here (per the platform's core safety
 * requirement — no admin, no config, no code path anywhere else can
 * override these):
 *   - The execution price comes ONLY from MarketDataService.getExecutionPrice(),
 *     which itself refuses stale or missing data. There is no parameter,
 *     override, or admin flag that accepts a caller-supplied price.
 *   - Balance changes happen ONLY through the ledger's postDoubleEntry(),
 *     which independently guarantees no negative balances and no double-posting.
 *   - The whole operation is idempotent via the caller-supplied idempotencyKey,
 *     so a client retry after a timeout can never execute the same order twice.
 */
export class TradingEngine {
  constructor(private marketData: MarketDataService) {}

  async placeOrder(input: PlaceOrderInput) {
    // Idempotency: if an order with this key already exists, return it
    // instead of creating a duplicate — handles client retries safely.
    const existingOrder = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existingOrder) {
      return { order: existingOrder, alreadyExecuted: true };
    }

    const market = await prisma.market.findUnique({ where: { symbol: input.marketSymbol } });
    if (!market) throw new TradingError("Unknown market.", "MARKET_NOT_FOUND");
    if (market.status !== "OPEN") throw new TradingError("Market is not open for trading.", "MARKET_HALTED");

    const amount = new Prisma.Decimal(input.amount);
    if (amount.lessThanOrEqualTo(0)) throw new TradingError("Order amount must be positive.", "INVALID_AMOUNT");
    if (amount.lessThan(market.minOrderSize)) {
      throw new TradingError(`Order amount is below the minimum of ${market.minOrderSize}.`, "BELOW_MINIMUM");
    }

    // Balance check happens against the quote-asset account BEFORE we touch
    // the market-data service, so we never pull a price we won't use.
    // Checked against amount + estimated fee (using the market's taker fee
    // as a conservative upper bound before we know the exact fee tier).
    const quoteAccount = await prisma.balanceAccount.findUniqueOrThrow({
      where: { userId_assetId: { userId: input.userId, assetId: market.quoteAssetId } },
    });
    const estimatedFee = amount.mul(market.takerFeeBps).div(10_000);
    if (quoteAccount.cachedBalance.lessThan(amount.plus(estimatedFee))) {
      throw new TradingError("Insufficient balance.", "INSUFFICIENT_BALANCE");
    }

    // The ONLY source of execution price in the entire system.
    const tick = this.marketData.getExecutionPrice(input.marketSymbol);

    const feeBps = input.type === "LIMIT" ? market.makerFeeBps : market.takerFeeBps;
    const fee = amount.mul(feeBps).div(10_000);

    const order = await prisma.order.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        userId: input.userId,
        marketId: market.id,
        side: input.side,
        type: input.type,
        amount,
        status: "PENDING",
      },
    });

    try {
      const trade = await prisma.trade.create({
        data: {
          orderId: order.id,
          executionPrice: new Prisma.Decimal(tick.price),
          priceSourceRef: `${tick.source}:${tick.timestamp}`,
          feeAmount: fee,
          feeAssetId: market.quoteAssetId,
        },
      });

      // Post the balance movement through the ledger — engine never writes
      // balances directly.
      const feeAccount = await this.getOrCreatePlatformFeeAccount(market.quoteAssetId);
      const baseAccount = await this.getOrCreateAccount(input.userId, market.baseAssetId);

      // Line 1: customer pays quote currency (amount + fee), split into two
      // balanced postings so the fee is separately auditable.
      await postDoubleEntry({
        referenceType: "TRADING_FEE",
        referenceId: trade.id,
        createdBy: "system:trading-engine",
        lines: [
          { accountId: quoteAccount.id, amount: fee.negated(), type: "DEBIT" },
          { accountId: feeAccount.id, amount: fee, type: "CREDIT" },
        ],
      });

      // Line 2: the actual trade settlement — customer's quote balance
      // decreases by the traded amount, and their base-asset balance
      // increases by the amount purchased at the execution price (for a BUY;
      // a SELL posts the inverse direction). This is what actually delivers
      // the asset the customer is trading into/out of.
      const baseAmount = amount.div(new Prisma.Decimal(tick.price));
      const quoteDelta = input.side === "BUY" ? amount.negated() : amount;
      const baseDelta = input.side === "BUY" ? baseAmount : baseAmount.negated();

      await postDoubleEntry({
        referenceType: "TRADE_SETTLEMENT",
        referenceId: trade.id,
        createdBy: "system:trading-engine",
        lines: [
          { accountId: quoteAccount.id, amount: quoteDelta, type: quoteDelta.isNegative() ? "DEBIT" : "CREDIT" },
          { accountId: baseAccount.id, amount: baseDelta, type: baseDelta.isNegative() ? "DEBIT" : "CREDIT" },
        ],
      });

      const filledOrder = await prisma.order.update({ where: { id: order.id }, data: { status: "FILLED" } });

      await prisma.position.create({
        data: {
          tradeId: trade.id,
          status: "OPEN",
          openPrice: trade.executionPrice,
        },
      });

      return { order: filledOrder, trade, alreadyExecuted: false };
    } catch (err) {
      // If execution fails after the order row was created, mark it
      // rejected rather than leaving it stuck in PENDING forever.
      await prisma.order.update({ where: { id: order.id }, data: { status: "REJECTED" } });
      throw err;
    }
  }

  async closePosition(positionId: string, marketSymbol: string) {
    const position = await prisma.position.findUniqueOrThrow({
      where: { id: positionId },
      include: { trade: { include: { order: true } } },
    });
    if (position.status === "CLOSED") {
      throw new TradingError("Position already closed.", "ALREADY_CLOSED");
    }

    const tick = this.marketData.getExecutionPrice(marketSymbol);
    const closePrice = new Prisma.Decimal(tick.price);
    const openPrice = position.openPrice;
    const size = position.trade.order.amount;

    // Realized P&L from documented, deterministic execution rules only.
    const realizedPnl = closePrice.minus(openPrice).mul(size).div(openPrice);

    const updated = await prisma.position.update({
      where: { id: positionId },
      data: {
        status: "CLOSED",
        closePrice,
        realizedPnl,
        closedAt: new Date(),
      },
    });

    // Settle the P&L via the ledger (credit if positive, debit if negative)
    // against the customer's quote-asset account — implemented fully
    // alongside the position-close API endpoint in the next iteration.

    return updated;
  }

  private async getOrCreatePlatformFeeAccount(assetId: string) {
    const PLATFORM_USER_ID = "00000000-0000-0000-0000-000000000000"; // system account, seeded in Phase 2 migration
    return prisma.balanceAccount.upsert({
      where: { userId_assetId: { userId: PLATFORM_USER_ID, assetId } },
      update: {},
      create: { userId: PLATFORM_USER_ID, assetId, cachedBalance: new Prisma.Decimal(0) },
    });
  }

  private async getOrCreateAccount(userId: string, assetId: string) {
    return prisma.balanceAccount.upsert({
      where: { userId_assetId: { userId, assetId } },
      update: {},
      create: { userId, assetId, cachedBalance: new Prisma.Decimal(0) },
    });
  }
}
