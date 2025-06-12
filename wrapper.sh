#!/bin/sh
chown -R bun:bun /app/data/running
chown -R bun:bun /app/config.json
exec su bun /usr/local/bin/entry.sh "$@"