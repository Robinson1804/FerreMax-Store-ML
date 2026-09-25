"""
Autenticación simple del panel (rol único: admin).

- Credenciales en variables de entorno ADMIN_USER / ADMIN_PASS (por defecto admin / admin123).
- El token es firmado con HMAC-SHA256 y caduca en 12 h: no se guarda en memoria, así que sobrevive a
  reinicios del servidor. La clave de firma sale de ADMIN_SECRET; si no está definida, se genera una
  por proceso (los tokens se invalidan al reiniciar, pero nada se rompe).
- Todo /api/admin/* exige "Authorization: Bearer <token>", salvo el login, la verificación y la
  lectura de la configuración (la tienda necesita GET /api/admin/config para mostrar el modo activo).
"""
import hashlib
import hmac
import os
import secrets
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

DURACION_S = 12 * 3600
_CLAVE = (os.getenv("ADMIN_SECRET") or secrets.token_hex(32)).encode()

# (método, ruta) públicas dentro de /api/admin
RUTAS_PUBLICAS = {("POST", "/api/admin/login"), ("GET", "/api/admin/verificar"), ("GET", "/api/admin/config")}


def credenciales_validas(usuario: str, clave: str) -> bool:
    ok_usuario = hmac.compare_digest(usuario, os.getenv("ADMIN_USER", "admin"))
    ok_clave = hmac.compare_digest(clave, os.getenv("ADMIN_PASS", "admin123"))
    return ok_usuario and ok_clave


def _firma(carga: str) -> str:
    return hmac.new(_CLAVE, carga.encode(), hashlib.sha256).hexdigest()


def emitir_token(usuario: str) -> str:
    carga = f"{usuario}:{int(time.time()) + DURACION_S}"
    return f"{carga}:{_firma(carga)}"


def token_valido(token: str | None) -> bool:
    if not token or token.count(":") != 2:
        return False
    usuario, vence, firma = token.split(":")
    if not vence.isdigit() or int(vence) < time.time():
        return False
    return hmac.compare_digest(firma, _firma(f"{usuario}:{vence}"))


class ProteccionAdmin(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        ruta = request.url.path.rstrip("/")
        if (ruta.startswith("/api/admin") and request.method != "OPTIONS"
                and (request.method, ruta) not in RUTAS_PUBLICAS):
            cabecera = request.headers.get("authorization", "")
            token = cabecera[7:] if cabecera.lower().startswith("bearer ") else None
            if not token_valido(token):
                return JSONResponse({"detail": "Se requiere iniciar sesión en el panel"}, status_code=401)
        return await call_next(request)
