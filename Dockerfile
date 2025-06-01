# https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma/
# don't add dev deps
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

RUN bunx prisma generate

FROM oven/bun:alpine AS final
WORKDIR /app

ENV DATABASE_URL="file:/app/data/running/db.sqlite"

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

RUN mkdir -p /app/data/running && \
    chown -R bun:bun /app/data/running && \
    chmod a+rw /app/data/running

COPY ./entry.sh /usr/local/bin/entry.sh
COPY ./wrapper.sh /usr/local/bin/wrapper.sh
RUN chmod +x /usr/local/bin/entry.sh
RUN chmod +x /usr/local/bin/wrapper.sh

EXPOSE 4500/tcp

USER root
ENTRYPOINT ["/usr/local/bin/wrapper.sh"]
CMD ["bun", "run", "index.js"]