import * as argon2 from "argon2";

// Argon2id: resistant to both GPU-cracking and side-channel attacks — the
// current best-practice choice for password hashing (OWASP recommended).
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB, OWASP minimum recommendation
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // malformed hash or verification error — treat as failed auth, never throw to caller
    return false;
  }
}

// Minimum password policy — enforced server-side, never trust client-side-only validation.
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (password.length < 12) {
    return { valid: false, reason: "Password must be at least 12 characters." };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must include upper, lower case letters and a number." };
  }
  return { valid: true };
}
