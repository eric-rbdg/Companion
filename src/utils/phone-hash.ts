import { createHash } from "node:crypto";

/**
 * Normalize E.164-ish numbers and hash for DB storage (no plaintext PII at rest).
 */
export function hashPhoneNumber(rawPhone: string): string {
  const normalized = rawPhone.trim().replace(/\s+/g, "");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
