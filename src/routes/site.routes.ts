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
    <meta name="theme-color" content="#0c1222" />
    <title>${BRAND} — ${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" rel="stylesheet" />
    <style>
      :root {
        color-scheme: dark;
        --bg0: #0b1020;
        --bg1: #121a32;
        --accent: #f4b942;
        --accent-soft: rgba(244, 185, 66, 0.18);
        --text: #eef2ff;
        --text-muted: rgba(238, 242, 255, 0.72);
        --surface: rgba(255, 255, 255, 0.055);
        --border: rgba(255, 255, 255, 0.11);
        --shadow: 0 22px 60px rgba(5, 10, 25, 0.55);
        --radius-lg: 22px;
        --radius-md: 14px;
        --radius-sm: 999px;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        font-size: 17px;
        line-height: 1.55;
        color: var(--text);
        background:
          radial-gradient(900px 520px at 18% -8%, rgba(244, 185, 66, 0.14), transparent 55%),
          radial-gradient(760px 480px at 108% 12%, rgba(120, 170, 255, 0.16), transparent 55%),
          linear-gradient(165deg, var(--bg0), var(--bg1));
      }
      .shell {
        max-width: 740px;
        margin: 0 auto;
        padding: clamp(24px, 5vw, 48px) clamp(18px, 4vw, 28px) 56px;
      }
      .card {
        position: relative;
        overflow: hidden;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: clamp(26px, 4vw, 38px);
        box-shadow: var(--shadow);
        backdrop-filter: blur(14px);
      }
      .card::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(135deg, rgba(255,255,255,0.07), transparent 42%);
        opacity: 0.55;
      }
      .card-inner { position: relative; z-index: 1; }
      .brand-mark {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 22px;
      }
      .brand-icon {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: linear-gradient(145deg, var(--accent), #e8942e);
        box-shadow: 0 10px 28px rgba(244, 185, 66, 0.28);
        display: grid;
        place-items: center;
        font-family: "Fraunces", Georgia, serif;
        font-weight: 600;
        font-size: 20px;
        color: #1a1208;
      }
      .brand-word {
        font-family: "Fraunces", Georgia, serif;
        font-weight: 600;
        font-size: 1.35rem;
        letter-spacing: -0.02em;
      }
      .brand-tag {
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent);
        margin-top: 2px;
      }
      h1 {
        margin: 0 0 12px 0;
        font-family: "Fraunces", Georgia, serif;
        font-weight: 600;
        font-size: clamp(1.65rem, 4vw, 2rem);
        letter-spacing: -0.02em;
        line-height: 1.2;
      }
      .lead {
        margin: 0 0 16px 0;
        font-size: 1.05rem;
        color: var(--text-muted);
      }
      p { margin: 0 0 14px 0; color: rgba(238, 242, 255, 0.88); }
      p:last-child { margin-bottom: 0; }
      a {
        color: #b8d4ff;
        text-decoration: none;
        font-weight: 600;
        border-bottom: 1px solid rgba(184, 212, 255, 0.35);
        transition: color 0.15s ease, border-color 0.15s ease;
      }
      a:hover {
        color: #dce9ff;
        border-bottom-color: rgba(220, 233, 255, 0.65);
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.92em;
        padding: 0.15em 0.45em;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid rgba(255,255,255,0.08);
      }
      label {
        display: block;
        margin-top: 18px;
        margin-bottom: 8px;
        font-weight: 600;
        font-size: 0.82rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: rgba(238, 242, 255, 0.72);
      }
      input {
        width: 100%;
        padding: 14px 16px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(8, 12, 28, 0.55);
        color: var(--text);
        font-size: 1rem;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      input::placeholder { color: rgba(238, 242, 255, 0.38); }
      input:focus {
        outline: none;
        border-color: rgba(244, 185, 66, 0.55);
        box-shadow: 0 0 0 4px var(--accent-soft);
      }
      button[type="submit"], .btn-primary {
        margin-top: 22px;
        width: 100%;
        padding: 14px 20px;
        border-radius: var(--radius-md);
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 1rem;
        font-weight: 700;
        color: #1a1208;
        background: linear-gradient(165deg, #ffd073, var(--accent));
        box-shadow: 0 14px 36px rgba(244, 185, 66, 0.28);
        transition: transform 0.12s ease, box-shadow 0.12s ease;
      }
      button[type="submit"]:hover, .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 18px 44px rgba(244, 185, 66, 0.36);
      }
      button[type="submit"]:active, .btn-primary:active {
        transform: translateY(0);
      }
      .muted {
        font-size: 0.82rem;
        line-height: 1.55;
        color: var(--text-muted);
      }
      .row {
        display: flex;
        gap: 10px;
        margin-top: 18px;
        flex-wrap: wrap;
        align-items: center;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        padding: 8px 14px;
        border-radius: var(--radius-sm);
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.045);
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: rgba(238, 242, 255, 0.82);
      }
      .hr {
        height: 1px;
        margin: 26px 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
      }
      .nav-links {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 14px;
      }
      .nav-links a {
        font-weight: 600;
        font-size: 0.92rem;
        padding: 8px 0;
        border-bottom: none;
        color: rgba(238, 242, 255, 0.82);
        opacity: 0.92;
      }
      .nav-links a:hover {
        color: var(--text);
        opacity: 1;
      }
      ul.prose {
        margin: 12px 0 18px 0;
        padding-left: 1.25rem;
        color: rgba(238, 242, 255, 0.88);
      }
      ul.prose li { margin-bottom: 10px; }
      ul.prose li::marker { color: var(--accent); }
      .hero-cta {
        margin-top: 22px;
      }
      /* Home: equal vertical rhythm between pills, primary button, and helper text */
      .home-cta-group {
        margin-top: 18px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 24px;
      }
      .home-cta-group .row {
        margin-top: 0;
      }
      .home-cta-group .hero-cta {
        margin-top: 0;
      }
      .home-cta-group > .muted {
        margin: 0;
      }
      .hero-cta a.btn-primary {
        display: inline-block;
        width: auto;
        text-align: center;
        border-bottom: none;
        padding-inline: 28px;
        margin-top: 0;
      }
      .success-banner {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 14px 16px;
        margin-bottom: 18px;
        border-radius: var(--radius-md);
        background: rgba(74, 222, 128, 0.12);
        border: 1px solid rgba(74, 222, 128, 0.28);
      }
      .success-banner strong { color: #bbf7d0; display: block; margin-bottom: 4px; }
      .success-banner p {
        margin: 6px 0 0 0;
        font-size: 0.92rem;
        color: rgba(187, 247, 208, 0.88);
        line-height: 1.45;
      }
      .footer-note {
        margin-top: 14px;
        font-size: 0.78rem;
        color: rgba(238, 242, 255, 0.48);
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="card">
        <div class="card-inner">
          <header class="brand-mark">
            <span class="brand-icon" aria-hidden="true">A</span>
            <div>
              <div class="brand-word">${BRAND}</div>
              <div class="brand-tag">Warm SMS companion</div>
            </div>
          </header>
          ${body}
          <div class="hr"></div>
          <nav class="nav-links" aria-label="Site">
            <a href="/">Home</a>
            <a href="/opt-in">SMS opt-in</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">SMS terms</a>
          </nav>
          <p class="footer-note">© ${new Date().getFullYear()} ${BRAND}. United States only.</p>
        </div>
      </div>
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
        `<h1>Chat with Iris</h1>
        <p class="lead">A warm SMS companion from ${BRAND}. Short, thoughtful replies—no app required.</p>
        <div class="home-cta-group">
          <div class="row">
            <span class="pill">US only</span>
            <span class="pill">Reply STOP to opt out</span>
            <span class="pill">Msg &amp; data rates may apply</span>
          </div>
          <div class="hero-cta">
            <a class="btn-primary" href="/opt-in">Opt in for SMS</a>
          </div>
          <p class="muted">Already opted in? Reply from the same number you get texts on—we’ll pick up the thread.</p>
        </div>`,
      ),
    );
  });

  router.get("/opt-in", (_req, res) => {
    void trackPageView("/opt-in");
    res.type("text/html").send(
      page(
        "SMS Opt-in",
        `<h1>SMS opt-in</h1>
        <p class="lead">Enter your mobile number in E.164 format. We’ll send a confirmation text.</p>
        <form method="post" action="/opt-in">
          <label for="phone">Phone number</label>
          <input id="phone" name="phone" type="tel" placeholder="+1 555 123 4567" autocomplete="tel" inputmode="tel" required />
          <p class="muted">
            By submitting, you agree to receive SMS from ${BRAND}. Frequency varies.
            Msg &amp; data rates may apply. Reply STOP to unsubscribe, HELP for help.
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
             <p class="lead">That number doesn’t look like E.164.</p>
             <p>Use your country code and digits only, for example <code>+15551234567</code>.</p>`,
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
          `           <div class="success-banner" role="status">
             <span aria-hidden="true">✓</span>
             <div>
               <strong>You’re opted in</strong>
               <p>If texting is enabled for your number, you’ll get a confirmation SMS shortly.</p>
             </div>
           </div>
           <h1>Next steps</h1>
           <p class="lead">Save our number and send a message whenever you want to talk with Iris.</p>
           <p class="muted">Reply STOP at any time to unsubscribe.</p>`,
        ),
      );
    } catch (err) {
      deps.logger.error({ err }, "Opt-in failed");
      res.status(500).type("text/html").send(
        page(
          "Error",
          `<h1>Something went wrong</h1>
           <p class="lead">We couldn’t complete opt-in right now.</p>
           <p class="muted">Please wait a moment and try again. If it keeps happening, contact support.</p>`,
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
         <p class="lead">${BRAND} is a proof-of-concept SMS companion for US numbers.</p>
         <ul class="prose">
           <li>We derive a stable identity from your number using a <strong>SHA-256 hash</strong> (we don’t store the raw number in plain text for lookups).</li>
           <li>If you opt in on the web, we store your number <strong>encrypted</strong> so we can send optional proactive or scheduled messages you requested.</li>
           <li>We store recent message history so Iris can reply in context.</li>
           <li>We log opt-in events (time, source, optional IP / device info) for compliance.</li>
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
         <p class="lead">Short plain-language terms for this pilot.</p>
         <ul class="prose">
           <li>By opting in, you agree to receive SMS from ${BRAND}.</li>
           <li>Message frequency varies. Msg &amp; data rates may apply.</li>
           <li>Reply <strong>STOP</strong> to unsubscribe.</li>
           <li>Reply <strong>HELP</strong> for help.</li>
           <li>US numbers only.</li>
         </ul>`,
      ),
    );
  });

  return router;
}

