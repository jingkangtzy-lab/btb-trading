import { UnconfiguredSanctionsProvider } from "../src/sanctions-provider.interface";

describe("UnconfiguredSanctionsProvider — fail-closed behavior", () => {
  it("never returns CLEAR when no real provider is configured", async () => {
    const provider = new UnconfiguredSanctionsProvider();
    const result = await provider.screen({ legalName: "Test Person", country: "US" });
    expect(result.status).not.toBe("CLEAR");
  });
});

describe("KYCService (contract)", () => {
  it.todo("rejects submission from a restricted jurisdiction before any screening call is made");
  it.todo("screens every submission, and screening result is visible to the reviewer before a decision is recorded");
  it.todo("a non-CLEAR screening result moves the profile to ADDITIONAL_INFO_REQUIRED automatically, never to APPROVED");
  it.todo("only KYC_REVIEWER or SUPER_ADMIN can call reviewProfile");
  it.todo("every review decision writes an audit record atomically with the status change");
  it.todo("KYCService has no dependency on BalanceAccount or LedgerEntry — cannot touch balances even in principle");
});

describe("AML monitoring (contract)", () => {
  it.todo("flags a single withdrawal above the large-transaction threshold");
  it.todo("flags when the rolling 24h withdrawal total crosses the velocity threshold");
  it.todo("flags a large withdrawal from an account younger than the new-account window");
  it.todo("never blocks or approves a withdrawal itself — only returns flags for a human reviewer");
});
