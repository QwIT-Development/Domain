#!/bin/sh
set -e

echo "Bootstrapping, ignore the messages below"

DB_FILE_PATH_IN_CONTAINER_FROM_ENV="$DATABASE_URL"
DB_FILE_PATH_NO_PREFIX=$(echo "$DB_FILE_PATH_IN_CONTAINER_FROM_ENV" | sed 's/^file://')

if [ "$(echo "$DB_FILE_PATH_NO_PREFIX" | cut -c1)" = "/" ]; then
    DB_ABSOLUTE_FILE_PATH="$DB_FILE_PATH_NO_PREFIX"
else
    DB_ABSOLUTE_FILE_PATH="/app/$DB_FILE_PATH_NO_PREFIX"
fi

DB_DIR=$(dirname "$DB_ABSOLUTE_FILE_PATH")

mkdir -p "$DB_DIR"
bunx prisma migrate deploy
echo "starting now."

exec "$@"