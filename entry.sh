#!/bin/sh
set -e

envpath="$DATABASE_URL"
if [ -z "$envpath" ]; then
    echo "Error: DATABASE_URL environment variable is not set."
    exit 1
fi

normalized=$(echo "$envpath" | sed 's/^file://')

if [ "$(echo "$normalized" | cut -c1)" = "/" ]; then
    dbpath="$normalized"
else
    dbpath="/app/$normalized"
fi

DB_DIR=$(dirname "$dbpath")
mkdir -p "$DB_DIR"
bunx prisma migrate deploy

cd /app
export CWD=/app
exec "$@"
