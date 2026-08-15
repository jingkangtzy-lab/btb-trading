import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { hashPassword, verifyPassword, validatePasswordStrength } from "./password";
import { signAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken, Audience } from "./tokens";
import { verifyMfaCode } from "./mfa";
import { recordAuditEvent } from "../../audit/src/audit.service";

const prisma = new PrismaClient();

export class AuthError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

interface RegisterInput {
  email: string;
  password: string;
}

export async function registerCustomer(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();

  const strength = validatePasswordStrength(input.password);
  if (!strength.valid) {
    throw new AuthError(strength.reason!, "WEAK_PASSWORD");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Do not reveal whether the account exists — generic response prevents
    // account enumeration.
    throw new AuthError("Unable to complete registration.", "REGISTRATION_FAILED");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      status: "PENDING_VERIFICATION",
    },
  });

  // NOTE: actual email delivery is handled by the Notifications service,
  // which this function would enqueue a job to (e.g. via Redis/BullMQ).
  // The verification token itself should be a signed, single-use, short-lived
  // token — implemented alongside the Notifications service in a later phase.

  return { userId: user.id, email: user.email };
}

interface LoginInput {
  email: string;
  password: string;
  audience: Audience;
  mfaCode?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface LoginResult {
  status: "OK" | "MFA_REQUIRED";
  accessToken?: string;
  refreshToken?: string;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  // Constant-shape failure path: don't leak whether the email exists.
  if (!user) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  if (user.status === "FROZEN" || user.status === "CLOSED") {
    throw new AuthError("This account cannot sign in. Contact support.", "ACCOUNT_BLOCKED");
  }

  const passwordOk = await verifyPassword(user.passwordHash, input.password);
  if (!passwordOk) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  // Admin audience requires MFA unconditionally, no exceptions.
  const mfaRequired = input.audience === "btb-admin" ? true : user.mfaEnabled;

  if (mfaRequired) {
    if (!user.mfaSecret) {
      throw new AuthError("MFA is required for this account but is not configured.", "MFA_NOT_CONFIGURED");
    }
    if (!input.mfaCode) {
      return { status: "MFA_REQUIRED" };
    }
    const { decryptSecret } = await import("./mfa");
    const secret = decryptSecret(user.mfaSecret);
    if (!verifyMfaCode(secret, input.mfaCode)) {
      throw new AuthError("Invalid MFA code.", "INVALID_MFA");
    }
  }

  if (input.audience === "btb-admin" && !user.isAdmin) {
    throw new AuthError("Not authorized for admin access.", "NOT_ADMIN");
  }

  const roles = user.roles.map((ur) => ur.role.name);
  const { token: refreshToken, hash, expiresAt } = generateRefreshToken();
  const sessionId = uuidv4();

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      audience: input.audience,
      refreshTokenHash: hash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt,
    },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    aud: input.audience,
    roles,
    sessionId,
  });

  // Logged after the session is created, not inside its transaction — a
  // logging hiccup should never be able to block a legitimate login. The
  // recordAuditEvent function itself guarantees the failure is surfaced to
  // monitoring rather than silently dropped.
  await recordAuditEvent({
    actorId: user.id,
    role: roles.join(",") || null,
    action: "LOGIN",
    targetType: "User",
    targetId: user.id,
    ipAddress: input.ipAddress,
    requestId: sessionId,
  });

  return { status: "OK", accessToken, refreshToken };
}

export async function refreshSession(refreshToken: string, audience: Audience) {
  const hash = hashRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hash },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date() || session.audience !== audience) {
    throw new AuthError("Session expired or invalid. Please log in again.", "INVALID_SESSION");
  }

  // Rotate: revoke the old refresh token and issue a new one. This limits
  // the blast radius if a refresh token is ever stolen (replay is detectable
  // because the old hash becomes unusable immediately).
  const { token: newRefreshToken, hash: newHash, expiresAt } = generateRefreshToken();

  await prisma.$transaction([
    prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
    prisma.session.create({
      data: {
        id: uuidv4(),
        userId: session.userId,
        audience,
        refreshTokenHash: newHash,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt,
      },
    }),
  ]);

  const roles = session.user.roles.map((ur) => ur.role.name);
  const accessToken = signAccessToken({
    userId: session.userId,
    aud: audience,
    roles,
    sessionId: session.id,
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string) {
  const hash = hashRefreshToken(refreshToken);
  await prisma.session.updateMany({
    where: { refreshTokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Used by the API gateway middleware on every protected request.
export function requireAuth(token: string, audience: Audience) {
  try {
    return verifyAccessToken(token, audience);
  } catch {
    throw new AuthError("Invalid or expired access token.", "UNAUTHENTICATED");
  }
}
