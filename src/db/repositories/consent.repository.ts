import type { Consent } from "@prisma/client";

export interface CreateConsentInput {
  userId: string;
  source: string;
  ip?: string;
  userAgent?: string;
  disclosureVersion: string;
}

/**
 * Separate repository so consent storage can evolve independently.
 */
export interface IConsentRepository {
  createConsent(input: CreateConsentInput): Promise<Consent>;
}

