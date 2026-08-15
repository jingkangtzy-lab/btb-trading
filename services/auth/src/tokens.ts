import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";

export type Audience = "btb-customer" | "btb-admin";

const ACCESS_TOKEN_TTL_SECONDS = 10 * 60; // 10 minutes
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

interface AccessTokenPayload {
  sub: string; // user id
  aud: Audience;
  roles: string[];
  sid: string; // session id, lets us revoke a single session
}

function getSigningSecret(aud: Audience): string {
  // Deliberately different secrets per audience. Even if one secret leaks,
  // it cannot be used to mint tokens for the other audience.
  const secret = aud === "btb-admin" ? process.env.JWT_ADMIN_SECRET : process.env.JWT_CUSTOMER_SECRET;
  if (!secret) {
    throw new Error(`Missing signing secret for audience ${aud}. Check environment configuration.`);
  }
  return secret;
}

export function signAccessToken(params: { userId: string; aud: Audience; roles: string[]; sessionId: string }): string {
  const payload: AccessTokenPayload = {
    sub: params.userId,
    aud: params.aud,
    roles: params.roles,
    sid: params.sessionId,
  };
  return jwt.sign(payload, getSigningSecret(params.aud), {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    audience: params.aud,
    issuer: "btb-trading-auth",
  });
}

export function verifyAccessToken(token: string, expectedAud: Audience): AccessTokenPayload {
  const decoded = jwt.verify(token, getSigningSecret(expectedAud), {
    audience: expectedAud,
    issuer: "btb-trading-auth",
  });
  return decoded as unknown as AccessTokenPayload;
}

// Refresh tokens are opaque random strings, not JWTs — we store only their
// SHA-256 hash in the Session table so a DB leak alone can't be replayed.
export function generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(48).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  return { token, hash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
