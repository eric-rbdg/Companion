import twilio from "twilio";
import type { Twilio } from "twilio";

export interface TwilioServiceConfig {
  accountSid: string;
  authToken: string;
  fromNumber?: string;
  messagingServiceSid?: string;
  webhookUrl: string;
}

export class TwilioService {
  private readonly client: Twilio;

  constructor(private readonly config: TwilioServiceConfig) {
    this.client = twilio(config.accountSid, config.authToken);
  }

  /**
   * Validates Twilio X-Twilio-Signature against the configured webhook URL and body params.
   */
  validateWebhookSignature(
    signature: string | undefined,
    body: Record<string, string>,
  ): boolean {
    if (!signature) {
      return false;
    }
    return twilio.validateRequest(
      this.config.authToken,
      signature,
      this.config.webhookUrl,
      body,
    );
  }

  async sendSms(to: string, body: string): Promise<void> {
    if (this.config.messagingServiceSid) {
      await this.client.messages.create({
        messagingServiceSid: this.config.messagingServiceSid,
        to,
        body,
      });
      return;
    }

    if (!this.config.fromNumber) {
      throw new Error(
        "TwilioService misconfigured: provide fromNumber or messagingServiceSid",
      );
    }

    await this.client.messages.create({ from: this.config.fromNumber, to, body });
  }
}
