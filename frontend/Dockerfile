# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# Copy installed production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arg for production API URL (passed at docker build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# BACKEND_URL is used by next.config.ts rewrites (server-side)
ARG BACKEND_URL
ENV BACKEND_URL=${BACKEND_URL}

# Enable standalone output mode specifically for Docker builds
ENV OUTPUT_STANDALONE=true

RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Leverage Next.js output file tracing for minimal image
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
