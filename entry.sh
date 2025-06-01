#!/bin/sh
set -e
bunx prisma migrate deploy
exec "$@"