# ============ Stage 1: Dependencies ============
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# postinstall "prisma generate" çalıştırıyor; şema burada olmazsa npm ci düşüyor.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ============ Stage 2: Build ============
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone çıktı yalnızca Docker'da)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1
# NEXT_PUBLIC_* değişkenleri derlemede istemci koduna gömülüyor; compose'un
# env_file'ı yalnız çalışma anında geliyor, o yüzden build-arg ile verilir.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
RUN npm run build

# ============ Stage 3: Production ============
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
