// Contract tests for deposit and withdrawal flows. Require a test database
// to actually execute (Prisma-backed) — captured as it.todo() so the
// required behavior is explicit and reviewable now, and becomes runnable
// CI once we're on a hosting environment with a real Postgres instance.

describe("DepositService", () => {
  it.todo("generates and persists a deposit address the first time, reuses it on subsequent calls");
  it.todo("ignores a webhook for an address the platform doesn't recognize, without crediting anyone");
  it.todo("does not credit the ledger until confirmations reach the required threshold for that network");
  it.todo("credits the ledger exactly once even if the same webhook is delivered multiple times (at-least-once delivery)");
  it.todo("never represents a manual balance adjustment as a BLOCKCHAIN_DEPOSIT");
});

describe("WithdrawalService — request", () => {
  it.todo("rejects a request with an address that fails network-specific format validation");
  it.todo("rejects a request when KYC is not APPROVED");
  it.todo("rejects a request when balance is insufficient to cover amount + network fee");
  it.todo("immediately holds the requested funds so they can't be spent elsewhere while pending review");
  it.todo("flags requests above the risk threshold as requiresSecondApproval");
});

describe("WithdrawalService — approval", () => {
  it.todo("a single FINANCE_ADMIN approval is sufficient for a normal-risk withdrawal");
  it.todo("a high-risk withdrawal is not released after only one approval");
  it.todo("rejects a second approval attempt from the same administrator who gave the first");
  it.todo("a non-FINANCE_ADMIN, non-SUPER_ADMIN role cannot approve a withdrawal");
  it.todo("rejecting a withdrawal returns the held funds to the customer's available balance");
});
