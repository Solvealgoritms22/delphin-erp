# ==============================================================================
# Multi-stage Production Dockerfile for Dolphin ERP API (Cloud-Ready)
# Standards: Non-root user, minimal attack surface, alpine base, dumb-init
# ==============================================================================

# 1. Dependency Resolution Stage
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root workspace and api package definitions
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install all dependencies including devDependencies for build
RUN npm ci --workspace=apps/api

# 2. Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package*.json ./
COPY apps/api ./apps/api

# Generate Prisma Client and compile NestJS bundle
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# Prune devDependencies to keep image lean
RUN npm prune --production

# 3. Production Runtime Stage
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root system user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy pruned production dependencies and compiled artifacts
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json

# Assign ownership to unprivileged user
RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000

# Use dumb-init to properly handle PID 1 Unix termination signals (SIGTERM, SIGINT)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Automatically deploy pending migrations on startup and run compiled server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
