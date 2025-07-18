#!/bin/sh
chown -R bun:bun /app/data/running
exec su bun /app/entry.sh "$@"
