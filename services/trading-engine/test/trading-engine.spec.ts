// These document the required behavior of the trading engine. The pure
// P&L-math test runs standalone; everything touching Prisma/the ledger
// needs a real test database, wired up once we're on a hosting platform —
// listed as it.todo() so the contract is explicit and nothing is forgotten.

import { Prisma } from "@prisma/client";

describe("TradingEngine — order validation (contract)", () => {
  it.todo("rejects an order on a halted or delisted market");
  it.todo("rejects an order below the market's minimum size");
  it.todo("rejects an order when the customer's balance is insufficient");
  it.todo("never accepts a caller-supplied execution price — always pulls from MarketDataService");
  it.todo("refuses to execute when MarketDataService reports stale data (propagates StaleDataError)");
});

describe("TradingEngine — idempotency (contract)", () => {
  it.todo("placing an order twice with the same idempotencyKey executes it only once");
  it.todo("a client retry after a network timeout never results in a double-debit");
});

describe("TradingEngine — position close (contract)", () => {
  it.todo("closing an already-closed position is rejected");
  it.todo("realized P&L is computed only from open/close execution prices and size — no hidden inputs");
});

describe("P&L math (runs without DB)", () => {
  it("computes positive P&L correctly for a price increase", () => {
    const open = new Prisma.Decimal(50000);
    const close = new Prisma.Decimal(51000);
    const size = new Prisma.Decimal(1000); // quote-currency size
    const pnl = close.minus(open).mul(size).div(open);
    expect(pnl.toFixed(2)).toBe("20.00");
  });

  it("computes negative P&L correctly for a price decrease", () => {
    const open = new Prisma.Decimal(50000);
    const close = new Prisma.Decimal(49000);
    const size = new Prisma.Decimal(1000);
    const pnl = close.minus(open).mul(size).div(open);
    expect(pnl.toFixed(2)).toBe("-20.00");
  });

  it("computes zero P&L when price is unchanged", () => {
    const open = new Prisma.Decimal(50000);
    const close = new Prisma.Decimal(50000);
    const size = new Prisma.Decimal(1000);
    const pnl = close.minus(open).mul(size).div(open);
    expect(pnl.toFixed(2)).toBe("0.00");
  });
});
