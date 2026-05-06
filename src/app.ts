import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { createHealthRouter } from "./routes/health.routes.js";
import {
  createSmsWebhookRouter,
  type SmsWebhookRouterDeps,
} from "./routes/sms.webhook.routes.js";
import { createSiteRouter } from "./routes/site.routes.js";
import type { IConsentRepository } from "./db/repositories/consent.repository.js";
import type { IEventRepository } from "./db/repositories/event.repository.js";
import type { PrismaClient } from "@prisma/client";
import { createAdminRouter } from "./routes/admin.routes.js";
import type { ICryptoService } from "./services/crypto/crypto.interface.js";
import type { Logger } from "./utils/logger.js";

export interface CreateAppDeps extends SmsWebhookRouterDeps {
  logger: Logger;
  consentRepo: IConsentRepository;
  eventRepo: IEventRepository;
  prisma: PrismaClient;
  adminApiKey: string;
  crypto: ICryptoService;
}

export function createApp(deps: CreateAppDeps): express.Application {
  const app = express();

  // Needed for correct req.ip behind ELB/ALB (e.g. consent capture).
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.urlencoded({ extended: false }));

  app.use(createHealthRouter(deps.logger));
  app.use(
    createSiteRouter({
      conversationRepo: deps.repository,
      consentRepo: deps.consentRepo,
      eventRepo: deps.eventRepo,
      twilio: deps.twilio,
      crypto: deps.crypto,
      logger: deps.logger,
    }),
  );
  app.use(
    createAdminRouter({
      prisma: deps.prisma,
      eventRepo: deps.eventRepo,
      adminApiKey: deps.adminApiKey,
      crypto: deps.crypto,
      twilio: deps.twilio,
      conversation: deps.conversation,
    }),
  );
  app.use(
    createSmsWebhookRouter({
      twilio: deps.twilio,
      conversation: deps.conversation,
      repository: deps.repository,
      rateLimiter: deps.rateLimiter,
      logger: deps.logger,
      crypto: deps.crypto,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler(deps.logger));

  return app;
}
