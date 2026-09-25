#!/usr/bin/env bash
# Instalación de FerreMax en un droplet Ubuntu 24.04 limpio (ejecutar como root).
#   bash instalar_servidor.sh ferremax.elfukintorbe.space
# Deja: backend FastAPI como servicio systemd (127.0.0.1:8000), frontend compilado servido por Nginx,
# /api pasado al backend, HTTPS con Let's Encrypt y firewall con solo SSH/HTTP/HTTPS.
set -euo pipefail
DOMINIO="${1:?Uso: instalar_servidor.sh <dominio>}"
REPO="https://github.com/Robinson1804/FerreMax-Store-ML.git"
USUARIO="ferremax"
DIR="/opt/ferremax/app"

echo "== Paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q python3-venv python3-pip git nginx certbot python3-certbot-nginx libgomp1 ufw curl
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi

echo "== Memoria de intercambio (1 GB) para compilar con holgura"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

echo "== Usuario y código"
id "$USUARIO" >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/ferremax --shell /bin/bash "$USUARIO"
if [ ! -d "$DIR/.git" ]; then
  sudo -u "$USUARIO" git clone "$REPO" "$DIR"
else
  sudo -u "$USUARIO" git -C "$DIR" pull --ff-only
fi

echo "== Variables de entorno del backend (/etc/ferremax.env)"
if [ ! -f /etc/ferremax.env ]; then
  cat > /etc/ferremax.env <<EOF
ADMIN_USER=admin
ADMIN_PASS=admin123
ADMIN_SECRET=$(openssl rand -hex 32)
EOF
  chmod 640 /etc/ferremax.env && chown root:"$USUARIO" /etc/ferremax.env
fi

echo "== Backend: entorno virtual, dependencias, datos y modelo"
sudo -u "$USUARIO" python3 -m venv "$DIR/backend/.venv"
sudo -u "$USUARIO" "$DIR/backend/.venv/bin/pip" install -q --upgrade pip
sudo -u "$USUARIO" "$DIR/backend/.venv/bin/pip" install -q -r "$DIR/backend/requirements.txt"
if [ ! -f "$DIR/backend/ferremax.db" ]; then
  sudo -u "$USUARIO" bash -c "cd '$DIR/backend' && .venv/bin/python seed.py --reset --reentrenar && .venv/bin/python evaluacion_offline.py > /dev/null"
fi

echo "== Frontend: compilación de producción"
sudo -u "$USUARIO" bash -c "cd '$DIR/frontend' && npm ci --no-audit --no-fund && npm run build"

echo "== Servicio systemd"
cp "$DIR/deploy/ferremax-api.service" /etc/systemd/system/ferremax-api.service
systemctl daemon-reload
systemctl enable --now ferremax-api
systemctl restart ferremax-api

echo "== Nginx"
sed "s/__DOMINIO__/$DOMINIO/g" "$DIR/deploy/nginx-ferremax.conf" > /etc/nginx/sites-available/ferremax
ln -sf /etc/nginx/sites-available/ferremax /etc/nginx/sites-enabled/ferremax
rm -f /etc/nginx/sites-enabled/default
chmod o+x /opt/ferremax /opt/ferremax/app /opt/ferremax/app/frontend
nginx -t && systemctl reload nginx

echo "== Firewall"
ufw allow OpenSSH >/dev/null && ufw allow "Nginx Full" >/dev/null && ufw --force enable >/dev/null

echo "== HTTPS (Let's Encrypt)"
certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
  echo "AVISO: certbot falló (¿el DNS aún no apunta a este servidor?). Reintentar: certbot --nginx -d $DOMINIO --redirect"

echo "== Listo: https://$DOMINIO"
