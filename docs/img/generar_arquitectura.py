"""Genera docs/img/arquitectura.png: arquitectura en capas del sistema FerreMax (matplotlib)."""
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

NAVY, NARANJA, GRIS, BORDE, TEXTO = "#0F2A4A", "#F26B1D", "#F3F4F6", "#CBD5E1", "#1E293B"
VERDE, AZUL = "#ECFDF5", "#EFF6FF"

fig, ax = plt.subplots(figsize=(13, 10), dpi=160)
ax.set_xlim(0, 130)
ax.set_ylim(-2.5, 100)
ax.axis("off")


def caja(x, y, w, h, titulo, lineas=(), color="white", borde=BORDE, tcolor=TEXTO, tsize=10.5):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=1.6",
                                fc=color, ec=borde, lw=1.4))
    ax.text(x + w / 2, y + h - 2.6, titulo, ha="center", va="top", fontsize=tsize, fontweight="bold", color=tcolor)
    for i, l in enumerate(lineas):
        ax.text(x + w / 2, y + h - 6.0 - i * 2.75, l, ha="center", va="top", fontsize=8.1, color=tcolor)


def capa(y, h, nombre):
    ax.add_patch(FancyBboxPatch((1, y), 128, h, boxstyle="round,pad=0.3,rounding_size=1.2", fc=GRIS, ec="none"))
    ax.text(3, y + h - 0.6, nombre, ha="left", va="top", fontsize=8.5, fontweight="bold", color="#64748B",
            bbox=dict(fc=GRIS, ec="none", pad=1.0), zorder=5)


def flecha(x1, y1, x2, y2, texto="", lado=0.0):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=14, lw=1.4, color=NAVY))
    if texto:
        ax.text((x1 + x2) / 2 + lado, (y1 + y2) / 2, texto, ha="left" if lado else "center", va="center",
                fontsize=7.8, color=NAVY, bbox=dict(fc="white", ec="none", pad=1.2), zorder=6)


ax.text(65, 99, "Arquitectura del sistema web FerreMax (recomendador híbrido CONV / ML)",
        ha="center", va="top", fontsize=13.5, fontweight="bold", color=NAVY)

# Usuarios
caja(14, 85, 30, 8.5, "Cliente (navegador / celular)", ["Tienda: búsqueda, detalle, carrito"], color=AZUL)
caja(86, 85, 30, 8.5, "Administrador / investigador", ["Panel /admin (token HMAC)"], color=AZUL)

# Capa de presentación
capa(61, 20.5, "PRESENTACIÓN · React 19 + Vite + Tailwind CSS 4")
caja(6, 62.5, 56, 14.5, "Tienda (8 pantallas)",
     ["Inicio · Búsqueda por necesidad · Detalle · Carrito",
      "Confirmar · Pedido registrado · Mi cuenta · Login",
      "lib/tienda.jsx: emisor único de eventos (11 campos)"])
caja(68, 62.5, 56, 14.5, "Panel de administración (9 pantallas)",
     ["Recomendador: conmutador CONV/ML, sesiones, reglas",
      "Evaluación: Capa 1 (offline) y Capa 2 (sesiones)",
      "Eventos (CSV) · Inventario · Pedidos · Configuración"])

# Servidor web
capa(50, 8.5, "SERVIDOR WEB")
caja(30, 51, 70, 5.6, "Nginx + HTTPS (Let's Encrypt) · https://sosdigital.lat", [], tsize=9.5)

# Aplicación
capa(18, 30, "APLICACIÓN · FastAPI + uvicorn (servicio systemd ferremax-api)")
caja(5, 30, 38, 13.5, "API REST (main.py)",
     ["Catálogo · búsqueda · recomendar", "Eventos · sesiones · indicadores", "autenticacion.py (/api/admin/*)"])
caja(47, 30, 38, 13.5, "recommender.py",
     ["CONV: más vendidos de la categoría", "ML-A: TF-IDF + coseno (necesidad)", "ML-B: FP-Growth (conf × lift)"],
     color="#FFF4ED", borde=NARANJA)
caja(89, 30, 36, 13.5, "evaluacion_offline.py",
     ["Partición temporal 80/20 · semilla 42", "Precision@5 · Recall@5", "McNemar exacto (3 modos)"])
caja(43, 19.5, 22, 8, "colaborativo.py", ["CF ítem-ítem · 20 vecinos"], color="#FFF4ED", borde=NARANJA, tsize=9.5)
caja(67, 19.5, 22, 8, "reordenador.py", ["16 variables · RL / LightGBM"], color="#FFF4ED", borde=NARANJA, tsize=9.5)

# Datos
capa(0, 17, "DATOS")
caja(5, 1.5, 54, 13, "SQLite · SQLAlchemy (o PostgreSQL)",
     ["productos · clientes · comprobantes · detalle_comprobante", "pedidos · detalle_pedido · reglas · configuracion",
      "sesiones_evaluacion · registro_eventos"], color=VERDE)
caja(63, 1.5, 27, 13, "backend/modelos/", ["reordenador.joblib", "(CF, popularidad, clasificador)"], color=VERDE)
caja(94, 1.5, 31, 13, "backend/salidas/", ["evaluacion_offline.csv", "evaluacion_offline_resumen.json"], color=VERDE)

# Flechas
flecha(29, 85, 29, 77.4, "HTTPS", lado=1.2)
flecha(101, 85, 101, 77.4, "HTTPS", lado=1.2)
flecha(34, 62.2, 50, 57.0)
flecha(96, 62.2, 80, 57.0)
flecha(60, 50.8, 26, 44.0, "/api", lado=4)
flecha(43.4, 36.5, 46.6, 36.5)
flecha(85.4, 36.5, 88.6, 36.5)
flecha(56, 29.6, 55, 27.9)
flecha(76, 29.6, 77, 27.9)
flecha(22, 29.6, 30, 14.9, "SQL", lado=1.2)
flecha(78, 19.1, 77, 14.9)
flecha(107, 29.6, 109, 14.9)

ax.text(65, -1.6, "Datos reales anonimizados de la empresa (ene–jul 2026) · Prototipo de tesis UPN 2026", ha="center", va="bottom", fontsize=7.5, color="#64748B")

salida = os.path.join(os.path.dirname(os.path.abspath(__file__)), "arquitectura.png")
plt.savefig(salida, bbox_inches="tight", facecolor="white")
print("generado:", salida)
