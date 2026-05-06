import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { adminAuth } from "../middleware/admin-auth.js";
import type { IEventRepository } from "../db/repositories/event.repository.js";
import type { ICryptoService } from "../services/crypto/crypto.interface.js";
import type { TwilioService } from "../services/twilio.service.js";
import type { ConversationService } from "../services/conversation.service.js";

export interface AdminRouterDeps {
  prisma: PrismaClient;
  eventRepo: IEventRepository;
  adminApiKey: string;
  crypto: ICryptoService;
  twilio: TwilioService;
  conversation: ConversationService;
}

export function createAdminRouter(deps: AdminRouterDeps): Router {
  const router = Router();

  router.get(
    "/admin/stats",
    adminAuth(deps.adminApiKey),
    async (_req, res) => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [userCount, messageCount, optInCount, optInCount24h, pageViews24h, pageViewsTotal] =
        await Promise.all([
          deps.prisma.user.count(),
          deps.prisma.message.count(),
          deps.prisma.consent.count(),
          deps.prisma.consent.count({ where: { createdAt: { gte: since24h } } }),
          deps.eventRepo.countEvents({ since: since24h }),
          deps.eventRepo.countEvents({}),
        ]);

      res.json({
        status: "ok",
        users: { total: userCount },
        messages: { total: messageCount },
        optIns: { total: optInCount, last24h: optInCount24h },
        visits: { total: pageViewsTotal, last24h: pageViews24h },
      });
    },
  );

  router.post(
    "/admin/checkins/run",
    adminAuth(deps.adminApiKey),
    async (_req, res) => {
      const users = await deps.prisma.user.findMany({
        where: {
          isOptedOut: false,
          phoneNumberEnc: { not: null },
        },
        select: { id: true, phoneNumberEnc: true },
        take: 100,
      });

      let attempted = 0;
      let sent = 0;

      for (const u of users) {
        if (!u.phoneNumberEnc) continue;
        attempted++;
        const to = await deps.crypto.decryptFromBase64(u.phoneNumberEnc);
        const msg = await deps.conversation.generateProactiveCheckIn(u.id);
        await deps.twilio.sendSms(to, msg);
        sent++;
      }

      res.json({ status: "ok", attempted, sent });
    },
  );

  return router;
}

