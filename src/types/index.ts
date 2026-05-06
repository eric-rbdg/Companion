import type { MessageRole } from "@prisma/client";

export type { MessageRole };

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber?: string;
    messagingServiceSid?: string;
    maxOutboundChars: number;
    webhookUrl: string;
  };
  deepseek: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  admin: {
    apiKey: string;
  };
  aws: {
    region: string;
  };
  crypto: {
    kmsKeyId?: string;
    localKey?: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}
