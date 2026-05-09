# Iris — SMS AI companion (POC)

Production-minded proof-of-concept: inbound SMS via **Twilio** webhooks, **PostgreSQL** history via **Prisma**, replies generated with **DeepSeek** (OpenAI-compatible chat completions). Phone numbers are stored only as **SHA-256 hashes**.

## Stack

- Node.js 22+, TypeScript, Express 5  
- PostgreSQL + Prisma ORM  
- Twilio (signature-validated webhooks + outbound SMS)  
- DeepSeek API with retries/backoff on `429` / `529`  
- Docker / docker-compose for local and containerized runs  
- Structured logging with **pino** (no `console.log` in application code)

## Local development

### Option A: Docker (app + Postgres)

1. Copy environment template and fill in secrets:

   ```bash
   cp .env.example .env
   ```

2. Set `TWILIO_WEBHOOK_URL` to the **exact** public URL Twilio will `POST` to, including path — for example `https://abcd.ngrok-free.app/webhook/sms`. This must match what Twilio sends (signature validation).

3. Start services:

   ```bash
   docker compose up --build
   ```

   The API listens on port **3000**. Migrations run automatically before `node dist/index.js`.

### Option B: Postgres in Docker, app on the host

1. Run only Postgres (adjust `docker-compose.yml` or use `docker compose run` / a trimmed compose file). Default compose DB URL for host access:

   `postgresql://iris:iris@localhost:5432/iris_sms?schema=public`

2. Set `DATABASE_URL` and other vars in `.env`, then:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run dev
   ```

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Used for webhook signature validation and REST API |
| `TWILIO_PHONE_NUMBER` | Your Twilio SMS-capable number (E.164), used as `From` on outbound replies (optional if using `TWILIO_MESSAGING_SERVICE_SID`) |
| `TWILIO_MESSAGING_SERVICE_SID` | Optional: Twilio Messaging Service SID (MG...), used to send outbound SMS without specifying `From` |
| `TWILIO_WEBHOOK_URL` | Full webhook URL **exactly** as configured in Twilio (scheme + host + path), e.g. `https://your-host/webhook/sms` |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `DEEPSEEK_BASE_URL` | Base URL for OpenAI-compatible API (default `https://api.deepseek.com`) |
| `DEEPSEEK_MODEL` | Model name (default `deepseek-chat`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `development`, `production`, or `test` |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window (default 1 hour) |
| `RATE_LIMIT_MAX` | Max inbound SMS per hashed phone per window (default `20`) |

Optional: `LOG_LEVEL` for pino (defaults to `info`).

## Twilio webhook setup

1. In the [Twilio Console](https://console.twilio.com/), open your phone number (or Messaging Service) **Webhook** configuration.
2. Set **when a message comes in** to HTTP **POST** and point to:

   `https://<your-public-host>/webhook/sms`

3. Save. Twilio will send `application/x-www-form-urlencoded` bodies; this app validates `X-Twilio-Signature` against `TWILIO_WEBHOOK_URL` and `TWILIO_AUTH_TOKEN`.

For local testing, expose port 3000 with **ngrok**, **Cloudflare Tunnel**, or similar, and set `TWILIO_WEBHOOK_URL` to that HTTPS URL including `/webhook/sms`.

## Security behavior (summary)

- Invalid webhook signatures → **403** with **empty body**  
- Phone numbers hashed (SHA-256) before persistence; raw number exists only during the request  
- Rate limiting per hashed phone (in-memory; swap for Redis via `IRateLimiter`)  
- Inbound SMS HTML/script stripped before the model sees content  
- Opt-out: `STOP`, `UNSUBSCRIBE`, or `QUIT` (case-insensitive) sets `isOptedOut`; **no further outbound SMS**  
- Inbound length cap: **1600** characters after sanitization  
- Helmet security headers; global error handler returns generic JSON messages (no stack traces)

## Health check

`GET /health` → `{ "status": "ok", "uptime": <seconds>, "version": "<semver>" }`

## Architecture notes

- **TwilioService**, **DeepSeekService**, **ConversationService** receive config/deps via constructors (no hidden globals).  
- **IConversationRepository** abstracts persistence for easier swaps/tests.  
- **IRateLimiter** documents the seam for a Redis-backed implementation later.

## Before real production

- Replace in-memory rate limiting with **Redis** (or Twilio-level throttling) so limits hold across instances.  
- Store secrets in a **secrets manager** (AWS Secrets Manager, GCP Secret Manager, Vault), not plain compose env files.  
- Add **observability**: tracing, metrics, alerting on webhook errors and AI latency.  
- **Horizontal scaling**: sticky sessions not required for webhooks, but rate limits and any future state must be shared (Redis).  
- Review **Twilio compliance** (HELP/STOP handling in all regions you operate).  
- Tune DeepSeek `max_tokens`, SMS segmentation, and crisis-response copy with legal/clinical guidance if applicable.  
- Run regular dependency and container image updates; enforce HTTPS termination at your edge.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | `tsx watch` for local development |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled app |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:migrate:dev` | Create/apply dev migrations |
| `npm run admin:stats` | Fetch and print `/admin/stats` |

## Deploy (GitHub Actions → Elastic Beanstalk)

This repo includes a workflow that deploys on pushes to `main`.

### Required GitHub Secrets

Set these in GitHub → Settings → Secrets and variables → Actions:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (e.g. `us-east-1`)
- `EB_DEPLOY_BUCKET` (an S3 bucket name for bundles)
- `EB_APP_NAME` (Elastic Beanstalk application name)
- `EB_ENV_NAME` (Elastic Beanstalk environment name)

## RDS backups (Terraform Postgres)

Provisioned RDS uses **automated backups**:

- Retention defaults to **7 days** (`rds_backup_retention_period` in `infra/terraform/variables.tf`). Increase up to **35** for stricter recovery objectives.
- **Backup window** and **maintenance window** are set in **UTC** (`rds_backup_window`, `rds_maintenance_window`) so applies don't rely on AWS-assigned random slots.

Optional safeguards:

- `rds_deletion_protection = true` stops accidental deletes once you have real traffic (Terraform unset/delete protection changes apply normally).
- `rds_skip_final_snapshot = false` plus optional `rds_final_snapshot_identifier` tells RDS to write a **final snapshot** when the instance is destroyed (recommended before tearing down meaningful data).

**Manual snapshot:** RDS console → your instance → **Take snapshot** (good before risky migrations).

**Restore:** Console → **Snapshots** or **Automated backups** → restore to a **new** instance (same VPC/security posture), then point Beanstalk `DATABASE_URL` at the new endpoint—or use **point-in-time recovery** from automated backups.

```bash
terraform -chdir=infra/terraform output rds_identifier
terraform -chdir=infra/terraform output rds_latest_restorable_time
```

**Local docker-compose Postgres:** `docker compose exec postgres pg_dump -U iris iris_sms > backup.sql` (restore with `psql` into an empty database).

## License

Private / POC — assign a license before external distribution.
