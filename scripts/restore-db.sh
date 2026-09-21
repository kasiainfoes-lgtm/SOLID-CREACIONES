#!/bin/sh
# Restores the invoicing database from a backup made by backup-db.sh.
#
# Uso:  ./scripts/restore-db.sh /opt/backups/solid-creaciones/facturas-20260921-030001.sql.gz
#
# ADVIERTE: esto SOBRESCRIBE la base de datos actual con la del volcado.
# Úsalo solo para recuperar de un desastre real, no como prueba casual.
set -eu

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FILE="${1:-}"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Uso: $0 /ruta/al/volcado.sql.gz" >&2
  exit 1
fi

echo "Vas a machacar la base de datos actual con: $FILE"
printf 'Escribe SI para continuar: '
read -r CONFIRM
if [ "$CONFIRM" != "SI" ]; then
  echo "Cancelado."
  exit 1
fi

cd "$REPO_DIR"
gunzip -c "$FILE" | docker compose exec -T db psql -U app -d automation

echo "Restaurado. Comprueba /facturas y, si algo se ve raro, reinicia la app:"
echo "  docker compose restart api"
