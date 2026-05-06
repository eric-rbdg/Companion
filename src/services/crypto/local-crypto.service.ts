import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { ICryptoService } from "./crypto.interface.js";

/**
 * Local dev fallback only. Uses AES-256-GCM with a base64-encoded 32-byte key.
 * Ciphertext format: base64(iv).base64(ciphertext).base64(tag)
 */
export class LocalAesGcmCryptoService implements ICryptoService {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    const buf = Buffer.from(base64Key, "base64");
    if (buf.length !== 32) {
      throw new Error("LOCAL_ENCRYPTION_KEY must be base64 for 32 bytes");
    }
    this.key = buf;
  }

  async encryptToBase64(
    plaintext: string,
  ): Promise<{ ciphertextB64: string; keyId?: string }> {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    const out = [
      iv.toString("base64"),
      ciphertext.toString("base64"),
      tag.toString("base64"),
    ].join(".");

    return { ciphertextB64: out, keyId: "local-aes-256-gcm" };
  }

  async decryptFromBase64(ciphertextB64: string): Promise<string> {
    const [ivB64, ctB64, tagB64] = ciphertextB64.split(".");
    if (!ivB64 || !ctB64 || !tagB64) {
      throw new Error("Invalid local ciphertext format");
    }

    const iv = Buffer.from(ivB64, "base64");
    const ct = Buffer.from(ctB64, "base64");
    const tag = Buffer.from(tagB64, "base64");

    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plaintext.toString("utf8");
  }
}

