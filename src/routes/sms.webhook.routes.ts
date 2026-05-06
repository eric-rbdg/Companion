import { Router } from "express";
import { randomUUID } from "node:crypto";
import { MAX_SMS_CHARS } from "../constants.js";
import type { IConversationRepository } from "../db/repositories/conversation.repository.js";
import type { ConversationService } from "../services/conversation.service.js";
import type { IRateLimiter } from "../services/rate-limit/rate-limiter.interface.js";
import type { TwilioService } from "../services/twilio.service.js";
import type { ICryptoService } from "../services/crypto/crypto.interface.js";
import { catchAsync } from "../utils/catch-async.js";
import { hashPhoneNumber } from "../utils/phone-hash.js";
import { isOptOutKeyword } from "../utils/opt-out.js";
import { sanitizeSmsContent } from "../utils/sanitize.js";
import { twilioBodyToStringRecord } from "../utils/twilio-params.js";
import type { Logger } from "../utils/logger.js";

const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

const LENGTH_REPLY = `That message is longer than I can handle via SMS — please send ${MAX_SMS_CHARS} characters or fewer.`;

const RATE_LIMIT_REPLY =
  "You're sending messages quickly — please wait up to an hour and try again.";

const CLEAR_CONFIRMATION =
  "Got it — I cleared our conversation history. What would you like to talk about now?";

export interface SmsWebhookRouterDeps {
  twilio: TwilioService;
  conversation: ConversationService;
  repository: IConversationRepository;
  rateLimiter: IRateLimiter;
  logger: Logger;
  crypto: ICryptoService;
}

function sendEmptyTwiml(res: import("express").Response): void {
  res.type("text/xml").send(EMPTY_TWIML);
}

function readSignature(header: unknown): string | undefined {
  if (typeof header === "string") {
    return header;
  }
  if (Array.isArray(header) && typeof header[0] === "string") {
    return header[0];
  }
  return undefined;
}

export function createSmsWebhookRouter(deps: SmsWebhookRouterDeps): Router {
  const router = Router();

  router.post(
    "/webhook/sms",
    catchAsync(async (req, res) => {
      const requestId = randomUUID();
      const startedAt = Date.now();
      const signature = readSignature(req.headers["x-twilio-signature"]);
      const stringBody = twilioBodyToStringRecord(
        req.body as Record<string, unknown>,
      );

      if (!deps.twilio.validateWebhookSignature(signature, stringBody)) {
        deps.logger.warn({ requestId }, "Twilio signature validation failed");
        res.sendStatus(403);
        return;
      }

      const from = stringBody.From;
      const rawBody = stringBody.Body ?? "";

      if (!from) {
        deps.logger.warn({ requestId }, "Twilio webhook missing From");
        sendEmptyTwiml(res);
        return;
      }

      const sanitized = sanitizeSmsContent(rawBody);

      if (!sanitized) {
        deps.logger.info(
          { requestId, bodyLen: rawBody.length },
          "Empty sanitized body; ignoring",
        );
        sendEmptyTwiml(res);
        return;
      }

      const phoneHash = hashPhoneNumber(from);
      const user = await deps.repository.findOrCreateUserByPhoneHash(phoneHash);

      // Persist encrypted phone so we can do proactive/scheduled outbound messages later.
      const enc = await deps.crypto.encryptToBase64(from);
      await deps.repository.setEncryptedPhoneForUser({
        userId: user.id,
        phoneNumberEnc: enc.ciphertextB64,
        phoneNumberEncKeyId: enc.keyId,
      });

      if (user.isOptedOut) {
        deps.logger.info({ requestId, phoneHash }, "User opted out; ignoring");
        sendEmptyTwiml(res);
        return;
      }

      if (isOptOutKeyword(sanitized)) {
        await deps.repository.setOptedOut(user.id);
        deps.logger.info({ requestId, phoneHash }, "User opted out via keyword");
        sendEmptyTwiml(res);
        return;
      }

      if (sanitized === "CLEAR") {
        await deps.repository.clearConversation(user.id);
        deps.logger.info({ requestId, phoneHash, userId: user.id }, "Conversation cleared");
        await deps.twilio.sendSms(from, CLEAR_CONFIRMATION);
        sendEmptyTwiml(res);
        return;
      }

      if (sanitized.length > MAX_SMS_CHARS) {
        deps.logger.info(
          { requestId, phoneHash, bodyLen: sanitized.length },
          "Inbound too long; sending length reply",
        );
        await deps.twilio.sendSms(from, LENGTH_REPLY);
        sendEmptyTwiml(res);
        return;
      }

      const { allowed } = await deps.rateLimiter.consume(phoneHash);
      if (!allowed) {
        deps.logger.warn({ requestId, phoneHash }, "Rate limit exceeded");
        await deps.twilio.sendSms(from, RATE_LIMIT_REPLY);
        sendEmptyTwiml(res);
        return;
      }

      deps.logger.info(
        { requestId, phoneHash, userId: user.id, bodyLen: sanitized.length },
        "Processing inbound SMS",
      );

      const reply = await deps.conversation.handleInbound({
        userId: user.id,
        sanitizedBody: sanitized,
      });

      deps.logger.info(
        { requestId, phoneHash, userId: user.id, replyLen: reply.length },
        "Sending outbound SMS",
      );
      await deps.twilio.sendSms(from, reply);

      deps.logger.info(
        { requestId, phoneHash, userId: user.id, ms: Date.now() - startedAt },
        "Webhook handled successfully",
      );
      sendEmptyTwiml(res);
    }),
  );

  return router;
}
