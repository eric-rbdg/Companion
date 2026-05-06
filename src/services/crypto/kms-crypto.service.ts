import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";
import type { ICryptoService } from "./crypto.interface.js";

export interface KmsCryptoServiceConfig {
  region: string;
  keyId: string;
}

export class KmsCryptoService implements ICryptoService {
  private readonly client: KMSClient;

  constructor(private readonly config: KmsCryptoServiceConfig) {
    this.client = new KMSClient({ region: config.region });
  }

  async encryptToBase64(
    plaintext: string,
  ): Promise<{ ciphertextB64: string; keyId?: string }> {
    const out = await this.client.send(
      new EncryptCommand({
        KeyId: this.config.keyId,
        Plaintext: Buffer.from(plaintext, "utf8"),
      }),
    );

    if (!out.CiphertextBlob) {
      throw new Error("KMS Encrypt returned no CiphertextBlob");
    }

    return {
      ciphertextB64: Buffer.from(out.CiphertextBlob).toString("base64"),
      keyId: out.KeyId ?? this.config.keyId,
    };
  }

  async decryptFromBase64(ciphertextB64: string): Promise<string> {
    const out = await this.client.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(ciphertextB64, "base64"),
      }),
    );

    if (!out.Plaintext) {
      throw new Error("KMS Decrypt returned no Plaintext");
    }

    return Buffer.from(out.Plaintext).toString("utf8");
  }
}

