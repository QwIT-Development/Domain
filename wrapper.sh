#!/bin/sh
chown -R bun:bun /app/data/running
exec su bun /usr/local/bin/entry.sh "$@"