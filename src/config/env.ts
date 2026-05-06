import { z } from "zod";
import type { AppConfig } from "../types/index.js";

function emptyToUndefined(val: unknown): unknown {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

const envSchema = z
  .object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  TWILIO_MESSAGING_SERVICE_SID: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  TWILIO_MAX_OUTBOUND_CHARS: z.coerce.number().int().positive().default(160),
  TWILIO_WEBHOOK_URL: z.string().url(),
  DEEPSEEK_API_KEY: z.string().min(1),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-chat"),
  ADMIN_API_KEY: z.string().min(16),
  AWS_REGION: z.string().min(1).default("us-east-1"),
  KMS_KEY_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  LOCAL_ENCRYPTION_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(3600000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
})
  .superRefine((val, ctx) => {
    if (!val.TWILIO_PHONE_NUMBER && !val.TWILIO_MESSAGING_SERVICE_SID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TWILIO_PHONE_NUMBER"],
        message:
          "Provide either TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID",
      });
    }

    if (!val.KMS_KEY_ID && !val.LOCAL_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["KMS_KEY_ID"],
        message: "Provide KMS_KEY_ID (AWS) or LOCAL_ENCRYPTION_KEY (local dev)",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): AppConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    process.stderr.write(
      `Invalid environment configuration: ${JSON.stringify(formatted)}\n`,
    );
    process.exit(1);
  }

  const e = parsed.data;

  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    twilio: {
      accountSid: e.TWILIO_ACCOUNT_SID,
      authToken: e.TWILIO_AUTH_TOKEN,
      phoneNumber: e.TWILIO_PHONE_NUMBER,
      messagingServiceSid: e.TWILIO_MESSAGING_SERVICE_SID,
      maxOutboundChars: e.TWILIO_MAX_OUTBOUND_CHARS,
      webhookUrl: e.TWILIO_WEBHOOK_URL,
    },
    deepseek: {
      apiKey: e.DEEPSEEK_API_KEY,
      baseUrl: e.DEEPSEEK_BASE_URL,
      model: e.DEEPSEEK_MODEL,
    },
    admin: {
      apiKey: e.ADMIN_API_KEY,
    },
    aws: {
      region: e.AWS_REGION,
    },
    crypto: {
      kmsKeyId: e.KMS_KEY_ID,
      localKey: e.LOCAL_ENCRYPTION_KEY,
    },
    rateLimit: {
      windowMs: e.RATE_LIMIT_WINDOW_MS,
      max: e.RATE_LIMIT_MAX,
    },
  };
}
