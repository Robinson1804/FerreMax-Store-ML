#!/usr/bin/env bash
# Actualiza FerreMax en el servidor con lo último de GitHub (ejecutar como root).
#   bash /opt/ferremax/app/deploy/actualizar.sh
# No toca la base de datos (backend/ferremax.db) ni /etc/ferremax.env.
set -euo pipefail
DIR="/opt/ferremax/app"
sudo -u ferremax git -C "$DIR" pull --ff-only
sudo -u ferremax "$DIR/backend/.venv/bin/pip" install -q -r "$DIR/backend/requirements.txt"
sudo -u ferremax bash -c "cd '$DIR/frontend' && npm ci --no-audit --no-fund && npm run build"
cp "$DIR/deploy/ferremax-api.service" /etc/systemd/system/ferremax-api.service
systemctl daemon-reload
systemctl restart ferremax-api
sleep 2
curl -fsS http://127.0.0.1:8000/api/admin/config > /dev/null && echo "Backend OK" || { echo "El backend no responde"; journalctl -u ferremax-api -n 30 --no-pager; exit 1; }
systemctl reload nginx
echo "Actualizado: $(git -C "$DIR" log -1 --format='%h %s')"
