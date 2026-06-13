# --- Stage 1: Build Stage ---
FROM node:22-alpine AS builder

# Enable corepack to activate pnpm package manager locked at v9.15.4
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy dependency lock files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies needed for build compilation)
RUN pnpm install --frozen-lockfile

# Copy configuration files and source code
COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
COPY drizzle/ ./drizzle/

# Compile TypeScript code to dist/ folder
RUN pnpm build

# --- Stage 2: Runtime Runner ---
FROM node:22-alpine AS runner

# Enable corepack in runner to support runtime pnpm execution locked at v9.15.4
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy package configurations
COPY package.json pnpm-lock.yaml ./

# Install only essential production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy compiled resources and Drizzle schemas from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY drizzle.config.ts ./

# Expose NestJS server port
EXPOSE 3000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start command running NestJS server directly
CMD ["pnpm", "start"]
