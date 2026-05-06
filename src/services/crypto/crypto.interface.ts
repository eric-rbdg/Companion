export interface ICryptoService {
  encryptToBase64(plaintext: string): Promise<{ ciphertextB64: string; keyId?: string }>;
  decryptFromBase64(ciphertextB64: string): Promise<string>;
}

