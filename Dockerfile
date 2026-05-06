# --- Builder ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
# Prevent postinstall from running before prisma/ is copied.
RUN npm ci --ignore-scripts

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# --- Production ---
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 iris

COPY package.json package-lock.json* ./
# Prevent postinstall from running in the image build; we copy the generated prisma engine files from builder.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

# Ensure Prisma engines are present before dropping privileges.
# This avoids runtime downloads/writes under a non-root user.
RUN npx prisma generate \
  && chown -R iris:nodejs /app/prisma /app/dist /app/node_modules/@prisma /app/node_modules/.prisma

USER iris

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
