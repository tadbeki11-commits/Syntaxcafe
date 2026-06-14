# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps

# Enable corepack to activate pnpm package manager locked at v9.15.4
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Install dependencies based on the lockfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Stage 2: Build Stage ---
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# NEXT_PUBLIC_* values are inlined at build time, so the API URL must be
# supplied as a build argument (not just a runtime env var).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# --- Stage 3: Runtime Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy the public assets and the standalone server output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# server.js is produced by Next.js standalone output
CMD ["node", "server.js"]
