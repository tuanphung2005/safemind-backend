FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile
RUN bunx prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package.json bun.lock ./
COPY src ./src

EXPOSE 7860
CMD ["bun", "run", "start"]
