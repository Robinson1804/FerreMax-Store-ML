#!/usr/bin/env bash
# Demo de FerreMax para Git Bash / Linux / Mac.
#   ./demo.sh              levanta todo (siembra solo si la base está vacía)
#   ./demo.sh --resembrar  borra la base, siembra las 420 boletas y reentrena
set -e
RAIZ="$(cd "$(dirname "$0")" && pwd)"
cd "$RAIZ/backend"
if [ -x .venv/Scripts/python.exe ]; then PY=.venv/Scripts/python.exe; else PY=.venv/bin/python; fi
if [ ! -x "$PY" ]; then
  python3 -m venv .venv || python -m venv .venv
  if [ -x .venv/Scripts/python.exe ]; then PY=.venv/Scripts/python.exe; else PY=.venv/bin/python; fi
  "$PY" -m pip install -q -r requirements.txt
fi
if [ "$1" = "--resembrar" ] || [ ! -f ferremax.db ]; then "$PY" seed.py --reset --reentrenar; else "$PY" seed.py; fi
"$PY" -m uvicorn main:app --port 8000 &
BACK=$!
cd "$RAIZ/frontend"
[ -d node_modules ] || npm install --no-audit --no-fund
VITE_API_URL=http://localhost:8000 npm run dev -- --port 5173 --strictPort &
FRONT=$!
echo "Tienda: http://localhost:5173/   Panel: http://localhost:5173/admin/login (admin / admin123)"
echo "Ctrl+C para detener."
trap 'kill $BACK $FRONT 2>/dev/null' INT TERM
wait
