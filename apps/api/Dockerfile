FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json apps/api/
RUN npm ci
COPY apps/api apps/api
RUN npm run db:generate --workspace=apps/api && npm run build --workspace=apps/api

FROM node:24-alpine
ENV NODE_ENV=production
ENV BACKUP_STORAGE_PATH=/app/var/backups
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
RUN addgroup -S dolphin && adduser -S dolphin -G dolphin && mkdir -p /app/var/backups && chown -R dolphin:dolphin /app
USER dolphin
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
