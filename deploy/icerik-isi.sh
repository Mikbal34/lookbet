#!/usr/bin/env bash
# Zamanlanmış içerik işi: /api/internal/sync?adim=$1
# Cron çağırır (deploy/lookbet.cron). Elle: ./deploy/icerik-isi.sh revizyon
set -euo pipefail
ADIM="${1:?adim gerekli: revizyon | icerik | listeler | oteller}"
cd "$(dirname "$0")/.."
SECRET=$(grep -E '^CRON_SECRET=' .env.production | cut -d= -f2- | tr -d '"')
echo "[$(date -Is)] $ADIM başladı"
curl -sS --max-time 3600 -X POST \
  -H "Authorization: Bearer ${SECRET}" \
  "http://127.0.0.1:3000/api/internal/sync?adim=${ADIM}"
echo
echo "[$(date -Is)] $ADIM bitti"
