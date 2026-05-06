import { AI_RETRY_MAX, DEEPSEEK_MODEL } from "../constants.js";

export interface DeepSeekServiceConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export type DeepSeekChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 529;
}

export class DeepSeekService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: DeepSeekServiceConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://api.deepseek.com").replace(/\/+$/, "");
    this.model = config.model ?? DEEPSEEK_MODEL;
  }

  /**
   * OpenAI-compatible chat completions with retries/backoff on 429/529.
   */
  async complete(params: {
    system: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<string> {
    let lastError: unknown;

    const payloadMessages: DeepSeekChatMessage[] = [
      { role: "system", content: params.system },
      ...params.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    for (let attempt = 0; attempt <= AI_RETRY_MAX; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: payloadMessages,
            temperature: 0.7,
            max_tokens: 256,
          }),
        });

        if (!res.ok) {
          const status = res.status;
          const text = await res.text().catch(() => "");
          if (!isRetryableStatus(status) || attempt === AI_RETRY_MAX) {
            throw new Error(
              `DeepSeek request failed: ${status} ${res.statusText}${text ? ` - ${text}` : ""}`,
            );
          }

          const base = 500 * 2 ** attempt;
          const jitter = Math.floor(Math.random() * 150);
          await sleep(base + jitter);
          continue;
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        const content = data.choices?.[0]?.message?.content ?? "";
        return String(content).trim();
      } catch (err) {
        lastError = err;
        // Network / parsing errors: retry like rate-limit errors (POC behavior).
        if (attempt === AI_RETRY_MAX) {
          throw err;
        }
        const base = 500 * 2 ** attempt;
        const jitter = Math.floor(Math.random() * 150);
        await sleep(base + jitter);
      }
    }

    throw lastError;
  }
}

