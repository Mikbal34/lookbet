#!/usr/bin/env bash
# Veritabanı yedeği: /root/lookbet-yedek/lookbet-<zaman>[-etiket].sql.gz
# Cron her gece çağırır (deploy/lookbet.cron); deploy.sh de migration'dan önce
# "deploy-oncesi" etiketiyle alır. Son 14 günün yedekleri tutulur.
# Geri yükleme (örnek):
#   gunzip -c /root/lookbet-yedek/<dosya>.sql.gz | docker compose -f docker-compose.prod.yml \
#     --env-file .env.production exec -T db psql -U lookbet -d lookbet
# Not: yedekler aynı sunucuda; sunucu kaybına karşı dışarıya da kopyalanmalı.
set -euo pipefail
cd "$(dirname "$0")/.."
HEDEF=/root/lookbet-yedek
mkdir -p "$HEDEF"
chmod 700 "$HEDEF"
deger() { grep -E "^$1=" .env.production | cut -d= -f2- | tr -d '"' || true; }
KULLANICI=$(deger POSTGRES_USER); KULLANICI=${KULLANICI:-lookbet}
VT=$(deger POSTGRES_DB); VT=${VT:-lookbet}
DOSYA="$HEDEF/lookbet-$(date -u +%Y%m%d-%H%M%S)${1:+-$1}.sql.gz"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  pg_dump -U "$KULLANICI" -d "$VT" --no-owner --no-privileges </dev/null | gzip > "$DOSYA.tmp"
mv "$DOSYA.tmp" "$DOSYA"
chmod 600 "$DOSYA"
find "$HEDEF" -name 'lookbet-*.sql.gz' -mtime +14 -delete
echo "[$(date -Is)] yedek alındı: $DOSYA ($(du -h "$DOSYA" | cut -f1))"
