import { loadEnv } from "./config/env.js";
import { createPrismaClient } from "./db/client.js";
import { PrismaConversationRepository } from "./db/repositories/prisma-conversation.repository.js";
import { PrismaConsentRepository } from "./db/repositories/prisma-consent.repository.js";
import { PrismaEventRepository } from "./db/repositories/prisma-event.repository.js";
import { createApp } from "./app.js";
import { DeepSeekService } from "./services/deepseek.service.js";
import { ConversationService } from "./services/conversation.service.js";
import { InMemoryRateLimiter } from "./services/rate-limit/in-memory-rate-limiter.js";
import { TwilioService } from "./services/twilio.service.js";
import { KmsCryptoService } from "./services/crypto/kms-crypto.service.js";
import { LocalAesGcmCryptoService } from "./services/crypto/local-crypto.service.js";
import type { ICryptoService } from "./services/crypto/crypto.interface.js";
import { createLogger } from "./utils/logger.js";

async function main(): Promise<void> {
  const config = loadEnv();
  const logger = createLogger();

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });

  const prisma = createPrismaClient();
  const repository = new PrismaConversationRepository(prisma);
  const consentRepo = new PrismaConsentRepository(prisma);
  const eventRepo = new PrismaEventRepository(prisma);

  const twilio = new TwilioService({
    accountSid: config.twilio.accountSid,
    authToken: config.twilio.authToken,
    fromNumber: config.twilio.phoneNumber,
    messagingServiceSid: config.twilio.messagingServiceSid,
    webhookUrl: config.twilio.webhookUrl,
  });

  const crypto: ICryptoService = config.crypto.kmsKeyId
    ? new KmsCryptoService({ region: config.aws.region, keyId: config.crypto.kmsKeyId })
    : new LocalAesGcmCryptoService(config.crypto.localKey!);

  const ai = new DeepSeekService({
    apiKey: config.deepseek.apiKey,
    baseUrl: config.deepseek.baseUrl,
    model: config.deepseek.model,
  });

  const conversation = new ConversationService({
    repository,
    ai,
    logger,
    maxOutboundChars: config.twilio.maxOutboundChars,
  });

  const rateLimiter = new InMemoryRateLimiter({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
  });

  const app = createApp({
    logger,
    twilio,
    conversation,
    repository,
    consentRepo,
    eventRepo,
    prisma,
    adminApiKey: config.admin.apiKey,
    crypto,
    rateLimiter,
  });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, "HTTP server listening");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
