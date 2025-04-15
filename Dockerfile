# https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
# don't add dev deps
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

FROM oven/bun:alpine AS final
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/data/running && chown -R bun:bun /app/data/running
USER bun
EXPOSE 4500/tcp
ENTRYPOINT ["bun", "run", "index.js"]