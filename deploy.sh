#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Lookbet Deployment Script
# Kullanım: ./deploy.sh [setup|deploy|migrate|logs|status]
# ============================================================

# ---- Konfigürasyon ----
# Hetzner sunucusu. Etscore'un beyaz listesindeki IP bu — tedarikçi API'si
# yalnızca buradan çağrılabiliyor, uygulamanın burada koşmasının sebebi de bu.
# (Değişken adları EC2_ kaldı: script önce AWS için yazılmıştı, dışarıdan
# EC2_HOST=... ile çağıranlar kırılmasın.)
EC2_HOST="${EC2_HOST:-2.29.53.188}"
EC2_USER="${EC2_USER:-root}"
EC2_KEY="${EC2_KEY:-$HOME/.ssh/lookbet}"
BRANCH="${BRANCH:-main}"
if [[ "$EC2_USER" == "root" ]]; then APP_DIR="/root/lookbet"; else APP_DIR="/home/${EC2_USER}/lookbet"; fi
REPO_URL="${REPO_URL:-https://github.com/Mikbal34/lookbet.git}"
# --env-file: compose'daki ${POSTGRES_PASSWORD} gibi değişkenler env_file'dan
# değil, kabuktan ya da bu dosyadan okunuyor. Olmadan db servisi
# "POSTGRES_PASSWORD gerekli" deyip başlamıyordu.
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

ssh_cmd() {
    ssh -i "$EC2_KEY" -o StrictHostKeyChecking=accept-new "${EC2_USER}@${EC2_HOST}" "$@"
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
    log "Sunucu kurulumu başlıyor (${EC2_HOST})..."

    ssh_cmd << 'SETUP_EOF'
set -euo pipefail

echo "==> Sistem güncelleniyor..."
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Docker kuruluyor..."
sudo apt-get install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

echo "==> Nginx kuruluyor..."
sudo apt-get install -y nginx
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
git fetch origin ${BRANCH} && git checkout ${BRANCH} && git pull origin ${BRANCH}

echo "==> Docker build..."
${COMPOSE} build app migrate

# Şema, yeni kod ayağa kalkmadan önce: kod yeni sütunları sorguluyor.
echo "==> Şema (prisma db push)..."
${COMPOSE} up -d db
# -T ve </dev/null: "run" varsayılan olarak stdin'i okuyor; burada stdin bu
# betiğin kendisi (ssh heredoc). Olmadan migrate betiğin geri kalanını
# yutuyor ve sonraki adımlar hiç çalışmıyordu.
${COMPOSE} --profile migrate run --rm -T migrate </dev/null

echo "==> Uygulamayı yeni imajla başlat..."
${COMPOSE} up -d app

echo "==> Nginx ve cron..."
sudo cp nginx/nginx.conf /etc/nginx/conf.d/lookbet.conf
sudo cp deploy/lookbet.cron /etc/cron.d/lookbet
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
    ssh_cmd "cd ${APP_DIR} && ${COMPOSE} --profile migrate run --rm -T migrate </dev/null"
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
    ssh_cmd "cd ${APP_DIR} && ${COMPOSE} logs -f --tail=100"
}

# ---- Status ----
cmd_status() {
    check_config
    ssh_cmd "cd ${APP_DIR} && ${COMPOSE} ps"
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
