import { MessageRole, type Message as DbMessage } from "@prisma/client";
import {
  FALLBACK_REPLY,
  IRIS_SYSTEM_PROMPT,
  MAX_SMS_CHARS,
} from "../constants.js";
import type { IConversationRepository } from "../db/repositories/conversation.repository.js";
import type { ConversationMessage } from "../types/index.js";
import type { Logger } from "../utils/logger.js";
import { trimMessagesForContext } from "../utils/conversation-trim.js";
import { truncateToSingleSegment } from "../utils/sms-segmentation.js";
import type { DeepSeekService } from "./deepseek.service.js";

export interface ConversationServiceDeps {
  repository: IConversationRepository;
  ai: DeepSeekService;
  logger: Logger;
  maxOutboundChars: number;
}

export class ConversationService {
  constructor(private readonly deps: ConversationServiceDeps) {}

  private mapHistory(rows: DbMessage[]): ConversationMessage[] {
    return rows.map((row) => ({
      role: row.role === "USER" ? "user" : "assistant",
      content: row.content,
    }));
  }

  /**
   * Persists the inbound message, generates a reply, persists assistant output, returns SMS-safe text.
   */
  async handleInbound(params: {
    userId: string;
    sanitizedBody: string;
  }): Promise<string> {
    const { repository, ai, logger, maxOutboundChars } = this.deps;

    await repository.saveMessage(params.userId, MessageRole.USER, params.sanitizedBody);

    const recent = await repository.getRecentMessages(params.userId, 20);
    const chronological = this.mapHistory(recent);
    const trimmed = trimMessagesForContext(chronological);

    try {
      const aiStartedAt = Date.now();
      logger.info(
        {
          userId: params.userId,
          historyMessages: trimmed.length,
          lastUserMsgLen: params.sanitizedBody.length,
        },
        "AI request starting",
      );

      const reply = await ai.complete({
        system: IRIS_SYSTEM_PROMPT,
        messages: trimmed,
      });

      logger.info(
        { userId: params.userId, ms: Date.now() - aiStartedAt, replyLen: reply.length },
        "AI request completed",
      );

      // First: keep within app-level hard cap.
      const withinHardCap =
        reply.length > MAX_SMS_CHARS ? `${reply.slice(0, MAX_SMS_CHARS - 1)}…` : reply;

      // Second: keep within Twilio trial-safe single segment (GSM-7 vs UCS-2).
      const singleSegment = truncateToSingleSegment(withinHardCap).truncated;

      // Third: optional stricter cap (e.g. TWILIO_MAX_OUTBOUND_CHARS=120).
      const smsSafe =
        singleSegment.length > maxOutboundChars
          ? `${singleSegment.slice(0, Math.max(0, maxOutboundChars - 1))}…`
          : singleSegment;

      await repository.saveMessage(params.userId, MessageRole.ASSISTANT, smsSafe);

      return smsSafe;
    } catch (err) {
      logger.error({ err, userId: params.userId }, "AI completion failed");
      return FALLBACK_REPLY;
    }
  }

  /**
   * Generate a proactive check-in based on recent history (no inbound user message required).
   */
  async generateProactiveCheckIn(userId: string): Promise<string> {
    const { repository, ai, logger, maxOutboundChars } = this.deps;

    const recent = await repository.getRecentMessages(userId, 20);
    const chronological = this.mapHistory(recent);
    const trimmed = trimMessagesForContext(chronological);

    const aiStartedAt = Date.now();
    logger.info({ userId, historyMessages: trimmed.length }, "AI check-in starting");

    try {
      const reply = await ai.complete({
        system:
          `${IRIS_SYSTEM_PROMPT}\n\n` +
          `Write a brief, friendly check-in text message. Keep it natural and under 1 SMS segment.`,
        messages: trimmed.length
          ? trimmed
          : [{ role: "user", content: "Send a warm first check-in message." }],
      });

      logger.info(
        { userId, ms: Date.now() - aiStartedAt, replyLen: reply.length },
        "AI check-in completed",
      );

      const withinHardCap =
        reply.length > MAX_SMS_CHARS ? `${reply.slice(0, MAX_SMS_CHARS - 1)}…` : reply;

      const singleSegment = truncateToSingleSegment(withinHardCap).truncated;

      const smsSafe =
        singleSegment.length > maxOutboundChars
          ? `${singleSegment.slice(0, Math.max(0, maxOutboundChars - 1))}…`
          : singleSegment;

      await repository.saveMessage(userId, MessageRole.ASSISTANT, smsSafe);
      return smsSafe;
    } catch (err) {
      logger.error({ err, userId }, "AI check-in failed");
      return FALLBACK_REPLY;
    }
  }
}
