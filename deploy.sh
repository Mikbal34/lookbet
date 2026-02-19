#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Lookbet Deployment Script
# Kullanım: ./deploy.sh [setup|deploy|migrate|logs|status]
# ============================================================

# ---- Konfigürasyon ----
EC2_HOST="${EC2_HOST:-}"
EC2_USER="${EC2_USER:-ec2-user}"
EC2_KEY="${EC2_KEY:-~/.ssh/lookbet.pem}"
APP_DIR="/home/${EC2_USER}/lookbet"
REPO_URL="${REPO_URL:-https://github.com/Mikbal34/lookbet.git}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

ssh_cmd() {
    ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "${EC2_USER}@${EC2_HOST}" "$@"
}

check_config() {
    if [[ -z "$EC2_HOST" ]]; then
        err "EC2_HOST ayarlanmamış. Örnek: EC2_HOST=1.2.3.4 ./deploy.sh deploy"
        exit 1
    fi
}

# ---- İlk kurulum (EC2 üzerinde çalışır) ----
cmd_setup() {
    check_config
    log "EC2 sunucu kurulumu başlıyor..."

    ssh_cmd << 'SETUP_EOF'
set -euo pipefail

echo "==> Sistem güncelleniyor..."
sudo dnf update -y

echo "==> Docker kuruluyor..."
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

echo "==> Docker Compose kuruluyor..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "==> Nginx kuruluyor..."
sudo dnf install -y nginx
sudo systemctl enable nginx

echo "==> Kurulum tamamlandı. Lütfen tekrar bağlanın (docker group için)."
SETUP_EOF

    log "Temel kurulum tamamlandı."
    log "Sonraki adımlar:"
    echo "  1. EC2'ye tekrar bağlan (docker group aktif olsun)"
    echo "  2. Git repo'yu clone et: git clone $REPO_URL $APP_DIR"
    echo "  3. .env.production dosyası oluştur: cp $APP_DIR/.env.production.example $APP_DIR/.env.production"
    echo "  4. .env.production içindeki değerleri doldur"
    echo "  5. Nginx config kopyala: sudo cp $APP_DIR/nginx/nginx.conf /etc/nginx/conf.d/lookbet.conf"
    echo "  6. Deploy çalıştır: ./deploy.sh deploy"
}

# ---- Deploy ----
cmd_deploy() {
    check_config
    log "Deployment başlıyor..."

    ssh_cmd << DEPLOY_EOF
set -euo pipefail
cd ${APP_DIR}

echo "==> Git pull..."
git pull origin main

echo "==> Docker build..."
docker compose -f docker-compose.prod.yml build

echo "==> Container durdur & başlat..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

echo "==> Prisma migrate deploy..."
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

echo "==> Nginx reload..."
sudo nginx -t && sudo systemctl reload nginx

echo "==> Eski Docker image'ları temizle..."
docker image prune -f
DEPLOY_EOF

    log "Deploy tamamlandı. Health check yapılıyor..."
    sleep 5
    cmd_health
}

# ---- Migrate ----
cmd_migrate() {
    check_config
    log "Prisma migrate deploy çalıştırılıyor..."
    ssh_cmd "cd ${APP_DIR} && docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy"
    log "Migration tamamlandı."
}

# ---- Health Check ----
cmd_health() {
    check_config
    log "Health check: http://${EC2_HOST}"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${EC2_HOST}" || true)
    if [[ "$STATUS" == "200" ]]; then
        log "Sunucu çalışıyor (HTTP $STATUS)"
    else
        err "Sunucu yanıt vermiyor (HTTP $STATUS)"
        exit 1
    fi
}

# ---- Logs ----
cmd_logs() {
    check_config
    ssh_cmd "cd ${APP_DIR} && docker compose -f docker-compose.prod.yml logs -f --tail=100"
}

# ---- Status ----
cmd_status() {
    check_config
    ssh_cmd "cd ${APP_DIR} && docker compose -f docker-compose.prod.yml ps"
}

# ---- Main ----
case "${1:-deploy}" in
    setup)  cmd_setup  ;;
    deploy) cmd_deploy ;;
    migrate) cmd_migrate ;;
    health) cmd_health ;;
    logs)   cmd_logs   ;;
    status) cmd_status ;;
    *)
        echo "Kullanım: $0 {setup|deploy|migrate|health|logs|status}"
        echo ""
        echo "  setup   - EC2 ilk kurulum (Docker, Nginx, Git)"
        echo "  deploy  - Build & deploy (varsayılan)"
        echo "  migrate - Sadece Prisma migrate çalıştır"
        echo "  health  - Health check"
        echo "  logs    - Container loglarını izle"
        echo "  status  - Container durumunu göster"
        exit 1
        ;;
esac
