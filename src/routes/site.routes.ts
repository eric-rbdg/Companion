import { Router } from "express";
import { hashPhoneNumber } from "../utils/phone-hash.js";
import type { IConversationRepository } from "../db/repositories/conversation.repository.js";
import type { IConsentRepository } from "../db/repositories/consent.repository.js";
import type { IEventRepository } from "../db/repositories/event.repository.js";
import type { TwilioService } from "../services/twilio.service.js";
import type { ICryptoService } from "../services/crypto/crypto.interface.js";
import type { Logger } from "../utils/logger.js";

const BRAND = "Apricity";
const DISCLOSURE_VERSION = "2026-05-06";

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${BRAND} — ${title}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; padding: 32px; background: #0b1220; color: #e8eefc; }
      a { color: #9cc2ff; }
      .card { max-width: 720px; margin: 0 auto; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 24px; }
      h1 { margin: 0 0 8px 0; font-size: 28px; }
      p { line-height: 1.5; color: rgba(232,238,252,0.9); }
      label { display:block; margin-top: 14px; margin-bottom: 6px; font-weight: 600; }
      input { width: 100%; padding: 12px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.18); background: rgba(0,0,0,0.18); color: #e8eefc; }
      button { margin-top: 16px; width: 100%; padding: 12px; border-radius: 12px; border: 0; background: #5b8cff; color: #041029; font-weight: 700; cursor: pointer; }
      .muted { font-size: 13px; color: rgba(232,238,252,0.75); }
      .row { display:flex; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
      .pill { display:inline-block; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; background: rgba(255,255,255,0.04); }
      .hr { height: 1px; background: rgba(255,255,255,0.12); margin: 16px 0; }
      ul { padding-left: 20px; }
    </style>
  </head>
  <body>
    <div class="card">
      ${body}
      <div class="hr"></div>
      <div class="row">
        <a class="pill" href="/">Home</a>
        <a class="pill" href="/opt-in">SMS Opt-in</a>
        <a class="pill" href="/privacy">Privacy</a>
        <a class="pill" href="/terms">SMS Terms</a>
      </div>
      <p class="muted">© ${new Date().getFullYear()} ${BRAND}. US only.</p>
    </div>
  </body>
</html>`;
}

function normalizePhoneInput(phone: string): string {
  return phone.trim().replace(/\s+/g, "");
}

function isLikelyE164(phone: string): boolean {
  return /^\+\d{10,15}$/.test(phone);
}

export interface SiteRouterDeps {
  conversationRepo: IConversationRepository;
  consentRepo: IConsentRepository;
  eventRepo: IEventRepository;
  twilio: TwilioService;
  crypto: ICryptoService;
  logger: Logger;
}

export function createSiteRouter(deps: SiteRouterDeps): Router {
  const router = Router();

  async function trackPageView(path: string): Promise<void> {
    // Fire-and-forget. Monitoring must not break the site.
    try {
      await deps.eventRepo.createEvent({ type: "PAGE_VIEW", path });
    } catch (err) {
      deps.logger.warn({ err }, "Failed to record page view");
    }
  }

  router.get("/", (_req, res) => {
    void trackPageView("/");
    res.type("text/html").send(
      page(
        "Home",
        `<h1>${BRAND}</h1>
        <p>A warm, SMS-based companion named <strong>Iris</strong>.</p>
        <div class="row">
          <span class="pill">US only</span>
          <span class="pill">Reply STOP to opt out</span>
          <span class="pill">Msg & data rates may apply</span>
        </div>
        <div class="hr"></div>
        <p><a href="/opt-in">Opt in to receive SMS messages</a>.</p>`,
      ),
    );
  });

  router.get("/opt-in", (_req, res) => {
    void trackPageView("/opt-in");
    res.type("text/html").send(
      page(
        "SMS Opt-in",
        `<h1>SMS opt-in</h1>
        <p>Enter your phone number to receive SMS messages from ${BRAND}.</p>
        <form method="post" action="/opt-in">
          <label for="phone">Phone number (E.164)</label>
          <input id="phone" name="phone" placeholder="+15551234567" autocomplete="tel" required />
          <p class="muted">
            By submitting, you agree to receive SMS messages from ${BRAND}. Message frequency varies.
            Msg & data rates may apply. Reply STOP to unsubscribe, HELP for help.
          </p>
          <button type="submit">I agree — text me</button>
        </form>`,
      ),
    );
  });

  router.post("/opt-in", async (req, res) => {
    try {
      const rawPhone = typeof req.body?.phone === "string" ? req.body.phone : "";
      const phone = normalizePhoneInput(rawPhone);

      if (!isLikelyE164(phone)) {
        res.status(400).type("text/html").send(
          page(
            "SMS Opt-in",
            `<h1>SMS opt-in</h1>
             <p>That phone number doesn’t look like E.164. Please use a format like <code>+15551234567</code>.</p>`,
          ),
        );
        return;
      }

      const phoneHash = hashPhoneNumber(phone);
      const user = await deps.conversationRepo.findOrCreateUserByPhoneHash(phoneHash);

      // Persist encrypted phone so we can do proactive/scheduled outbound messages later.
      const enc = await deps.crypto.encryptToBase64(phone);
      await deps.conversationRepo.setEncryptedPhoneForUser({
        userId: user.id,
        phoneNumberEnc: enc.ciphertextB64,
        phoneNumberEncKeyId: enc.keyId,
      });

      await deps.consentRepo.createConsent({
        userId: user.id,
        source: "web:/opt-in",
        ip: req.ip,
        userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
        disclosureVersion: DISCLOSURE_VERSION,
      });

      // If they were opted out, allow a new opt-in to re-enable messaging.
      // (We do NOT message people who are opted-out unless they opt in again.)
      if (user.isOptedOut) {
        await deps.conversationRepo.setOptedIn(user.id);
      }

      // Send a short confirmation (trial-safe length enforced elsewhere).
      await deps.twilio.sendSms(
        phone,
        `${BRAND}: You’re opted in. Reply STOP to unsubscribe, HELP for help.`,
      );

      res.type("text/html").send(
        page(
          "Opted in",
          `<h1>You’re opted in</h1>
           <p>If texting is enabled for your number, you’ll receive a confirmation SMS shortly.</p>`,
        ),
      );
    } catch (err) {
      deps.logger.error({ err }, "Opt-in failed");
      res.status(500).type("text/html").send(
        page(
          "Error",
          `<h1>Something went wrong</h1>
           <p>Please try again in a moment.</p>`,
        ),
      );
    }
  });

  router.get("/privacy", (_req, res) => {
    void trackPageView("/privacy");
    res.type("text/html").send(
      page(
        "Privacy",
        `<h1>Privacy Policy (POC)</h1>
         <p>${BRAND} is a proof-of-concept SMS companion. US only.</p>
         <ul>
           <li>We store your phone number only as a <strong>SHA-256 hash</strong>.</li>
           <li>We store recent message history to respond in context.</li>
           <li>We store opt-in events (timestamp, source, and optional device metadata) for compliance.</li>
         </ul>
         <p>To stop messages at any time, reply <strong>STOP</strong>.</p>`,
      ),
    );
  });

  router.get("/terms", (_req, res) => {
    void trackPageView("/terms");
    res.type("text/html").send(
      page(
        "SMS Terms",
        `<h1>SMS Terms (POC)</h1>
         <ul>
           <li>By opting in, you agree to receive SMS messages from ${BRAND}.</li>
           <li>Message frequency varies. Msg & data rates may apply.</li>
           <li>Reply <strong>STOP</strong> to unsubscribe.</li>
           <li>Reply <strong>HELP</strong> for help.</li>
           <li>US numbers only.</li>
         </ul>`,
      ),
    );
  });

  return router;
}

