import { hashPassword, verifyPassword, validatePasswordStrength } from "../src/password";

describe("password policy", () => {
  it("rejects short passwords", () => {
    expect(validatePasswordStrength("Short1").valid).toBe(false);
  });

  it("rejects passwords without a mix of cases and digits", () => {
    expect(validatePasswordStrength("alllowercase").valid).toBe(false);
  });

  it("accepts a strong password", () => {
    expect(validatePasswordStrength("Str0ngPassword123").valid).toBe(true);
  });
});

describe("password hashing", () => {
  it("hashes and verifies correctly", async () => {
    const hash = await hashPassword("Str0ngPassword123");
    expect(hash).not.toEqual("Str0ngPassword123");
    expect(await verifyPassword(hash, "Str0ngPassword123")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Str0ngPassword123");
    expect(await verifyPassword(hash, "WrongPassword123")).toBe(false);
  });

  it("never throws on a malformed hash, just returns false", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});

// --- Token audience isolation ---
// These tests would run against a test DB / mocked Prisma client in CI.
// Included here to document the required behavior for the review.

describe("token audience isolation (contract)", () => {
  it.todo("a customer-audience token must be rejected on any /admin/* route");
  it.todo("an admin-audience token must be rejected on any /app/* route");
  it.todo("admin login must require MFA even if the account has never enabled it manually");
  it.todo("customer login without MFA enabled must succeed without a code");
  it.todo("refresh token reuse after rotation must be rejected (replay detection)");
  it.todo("a frozen or closed account must not be able to log in");
  it.todo("registration must not reveal whether an email is already registered");
});
