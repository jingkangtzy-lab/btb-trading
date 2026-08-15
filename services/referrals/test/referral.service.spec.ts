describe("ReferralService (contract)", () => {
  it.todo("generates a code that does not embed the user's email or raw user ID");
  it.todo("returns the same code on repeated calls instead of generating a new one");
  it.todo("rejects self-referral even with a technically valid code");
  it.todo("a referee can only ever be attributed to one referrer (DB-level unique constraint)");
  it.todo("commission accrual is proportional only to the trading fee paid, never to the referred user's P&L");
  it.todo("a user with no referrer produces no commission activity");
  it.todo("commission postings go through the ledger's postDoubleEntry, never a direct balance write");
});
