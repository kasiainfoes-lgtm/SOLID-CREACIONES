#!/bin/sh
# Daily backup of the invoicing database (facturas, clientes, todo).
#
# Dumps the Postgres database running in the "db" container, compresses it,
# and keeps the last 30 days locally under BACKUP_DIR. Run it by hand once
# to test, then install it as a daily cron job — see README.md "Copias de
# seguridad" for the one-line crontab command.
#
# This alone only protects the data against mistakes inside the app or a
# bad migration — it lives on the SAME disk as everything else, so it does
# NOT protect against losing the whole VPS. Copy the files this produces
# off the server regularly (README explains how) for that.
set -eu

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/solid-creaciones}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUP_DIR/facturas-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

cd "$REPO_DIR"
# -T: no pseudo-tty, needed when this runs unattended from cron.
docker compose exec -T db pg_dump -U app automation | gzip > "$OUT_FILE"

# A failed/interrupted dump can leave a tiny, broken file — better to notice
# now (non-zero exit, visible in cron's mail) than the day it's needed.
if [ "$(wc -c < "$OUT_FILE")" -lt 1024 ]; then
  echo "backup-db.sh: el volcado salió sospechosamente pequeño ($OUT_FILE), revisa docker compose ps" >&2
  exit 1
fi

echo "Copia guardada en $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

# Prune anything older than KEEP_DAYS.
find "$BACKUP_DIR" -name 'facturas-*.sql.gz' -mtime "+$KEEP_DAYS" -delete
