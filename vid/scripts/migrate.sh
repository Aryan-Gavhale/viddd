#!/bin/bash
set -euo pipefail

MIGRATIONS_DIR="$(dirname "$0")/../prisma/migrations"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "Running migrations from: $MIGRATIONS_DIR"

# Create tracking table if not exists
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
"

# Apply each migration in order
for dir in $(ls -d "$MIGRATIONS_DIR"/*/  2>/dev/null | sort); do
  migration_name=$(basename "$dir")
  migration_file="$dir/migration.sql"
  
  if [ ! -f "$migration_file" ]; then
    continue
  fi

  already_applied=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM _migrations WHERE name = '$migration_name'" 2>/dev/null || echo "")
  
  if [ "$already_applied" = "1" ]; then
    echo "SKIP: $migration_name (already applied)"
    continue
  fi

  echo "APPLYING: $migration_name"
  psql "$DATABASE_URL" -f "$migration_file"
  psql "$DATABASE_URL" -c "INSERT INTO _migrations (name) VALUES ('$migration_name')"
  echo "DONE: $migration_name"
done

# Apply standalone SQL files
for sql_file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  file_name=$(basename "$sql_file")
  
  already_applied=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM _migrations WHERE name = '$file_name'" 2>/dev/null || echo "")
  
  if [ "$already_applied" = "1" ]; then
    echo "SKIP: $file_name (already applied)"
    continue
  fi

  echo "APPLYING: $file_name"
  psql "$DATABASE_URL" -f "$sql_file"
  psql "$DATABASE_URL" -c "INSERT INTO _migrations (name) VALUES ('$file_name')"
  echo "DONE: $file_name"
done

echo "All migrations applied."
