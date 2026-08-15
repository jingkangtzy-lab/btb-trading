import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// MFA secrets are encrypted at rest with AES-256-GCM using a server-side key
// (MFA_ENCRYPTION_KEY, 32 bytes) — never stored or logged in plaintext.

function getEncryptionKey(): Buffer {
  const key = process.env.MFA_ENCRYPTION_KEY;
  if (!key || Buffer.from(key, "base64").length !== 32) {
    throw new Error("MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return Buffer.from(key, "base64");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export async function generateMfaEnrollmentQrCode(email: string, secret: string): Promise<string> {
  const otpauthUrl = authenticator.keyuri(email, "BTB TRADING", secret);
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyMfaCode(secret: string, code: string): boolean {
  // window: 1 allows a 30s clock-skew tolerance either side, standard practice.
  return authenticator.verify({ token: code, secret });
}
