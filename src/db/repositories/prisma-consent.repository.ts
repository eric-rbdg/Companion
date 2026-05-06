import type { PrismaClient } from "@prisma/client";
import type { Consent } from "@prisma/client";
import type { CreateConsentInput, IConsentRepository } from "./consent.repository.js";

export class PrismaConsentRepository implements IConsentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createConsent(input: CreateConsentInput): Promise<Consent> {
    return this.prisma.consent.create({
      data: {
        userId: input.userId,
        source: input.source,
        ip: input.ip,
        userAgent: input.userAgent,
        disclosureVersion: input.disclosureVersion,
      },
    });
  }
}

