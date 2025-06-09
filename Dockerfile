# https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:alpine AS deps
WORKDIR /app
COPY ./package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
bun install --frozen-lockfile

FROM oven/bun:alpine AS final
WORKDIR /app

ENV DATABASE_URL="file:/app/data/running/db.sqlite"

COPY --from=deps /app/node_modules ./node_modules
COPY ./prisma /app/prisma
RUN bunx prisma migrate dev --name buildtime \
&& rm /app/data/running/db.sqlite \
&& rm /app/data/running/db.sqlite-journal \
&& bunx prisma generate

COPY . .
RUN chmod -R a+rw /app/prisma \
&& chown -R bun:bun /app/prisma \
&& mkdir -p /app/data/running \
&& chown -R bun:bun /app/data/running \
&& chmod a+rw /app/data/running

COPY ./entry.sh /usr/local/bin/entry.sh
COPY ./wrapper.sh /usr/local/bin/wrapper.sh
RUN chmod +x /usr/local/bin/entry.sh \
&& chmod +x /usr/local/bin/wrapper.sh

EXPOSE 4500/tcp

USER root
ENTRYPOINT ["/usr/local/bin/wrapper.sh"]
CMD ["bun", "run", "index.js"]