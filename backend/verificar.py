"""
Verificación automática del backend contra el checklist de supervisión.
Trabaja sobre una COPIA temporal de ferremax.db (no modifica la base real).

Uso:  python verificar.py
"""
import os
import shutil
import sqlite3
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
copia = os.path.join(tempfile.mkdtemp(), "verificacion.db")
shutil.copy(os.path.join(AQUI, "ferremax.db"), copia)
os.environ["DATABASE_URL"] = "sqlite:///" + copia.replace("\\", "/")
sys.path.insert(0, AQUI)

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

c = TestClient(app)
fallas = []
# Sin token, /api/admin/* debe rechazarse (salvo la lectura de configuración que usa la tienda)
sin_token = c.put("/api/admin/config", json={}).status_code
publica = c.get("/api/admin/config").status_code
eventos_sin_token = c.get("/api/admin/eventos").status_code
malo = c.post("/api/admin/login", json={"username": "admin", "password": "x"}).status_code
token = c.post("/api/admin/login", json={"username": os.getenv("ADMIN_USER", "admin"),
                                          "password": os.getenv("ADMIN_PASS", "admin123")}).json()["token"]
c.headers["Authorization"] = f"Bearer {token}"


def comprobar(nombre, condicion, detalle=""):
    print(("OK   " if condicion else "FALLA") + f"  {nombre}" + (f"  ({detalle})" if detalle else ""))
    if not condicion:
        fallas.append(nombre)


def cfg(modo):
    c.put("/api/admin/config", json={"modo_activo": modo, "k": 5, "soporte_min": 0.01, "confianza_min": 0.15,
                                     "lift_min": 1.2, "peso_contenido": 0.5})


comprobar("admin sin token rechazado (401) y config pública (200)",
          sin_token == 401 and eventos_sin_token == 401 and publica == 200, f"{sin_token}/{eventos_sin_token}/{publica}")
comprobar("login con clave incorrecta rechazado", malo == 401)
comprobar("con token, endpoints admin accesibles", c.get("/api/admin/eventos").status_code == 200)

# 1. Datos sembrados
db = sqlite3.connect(copia)
n_comp = db.execute("select count(*) from comprobantes").fetchone()[0]
comprobar("420 comprobantes sembrados", n_comp == 420, f"{n_comp}")
campos = [r[1] for r in db.execute("pragma table_info(registro_eventos)")]
esperados = ["id_evento", "id_sesion", "codigo_cliente", "escenario", "condicion", "tipo_evento",
             "texto_consulta", "sku", "posicion_recom", "origen", "timestamp"]
comprobar("registro_eventos con los 11 campos exactos", campos == esperados, ",".join(campos))
comprobar("GET /api/productos", len(c.get("/api/productos").json()) == 62)

# 2. Umbrales aplicados a las reglas
reglas = c.get("/api/admin/reglas?vigentes=true").json()
comprobar("reglas vigentes cumplen umbrales",
          all(r["soporte"] >= 0.01 and r["confianza"] >= 0.15 and r["lift"] >= 1.2 for r in reglas), f"{len(reglas)} reglas")

# 3. CONV y ML dan resultados distintos
res = {}
for modo in ("CONV", "ML"):
    cfg(modo)
    res[modo] = {
        "buscar": [p["sku"] for p in c.post("/api/buscar-necesidad", json={"texto": "pintar un dormitorio"}).json()],
        "carrito": [p["sku"] for p in c.post("/api/recomendar/carrito", json={"skus": ["PIN-001", "HER-012"]}).json()],
        "pintura": c.get("/api/recomendar?sku=PIN-001").json(),
        "tubo": [p["sku"] for p in c.get("/api/recomendar?sku=TUB-001").json()],
    }
comprobar("búsqueda difiere entre modos", res["CONV"]["buscar"] != res["ML"]["buscar"])
comprobar("carrito difiere entre modos", res["CONV"]["carrito"] != res["ML"]["carrito"])
cats = {p["categoria"] for p in res["ML"]["pintura"]}
comprobar("ML pintura sin productos absurdos (solo Pinturas y Herramientas)",
          cats <= {"Pinturas y Acabados", "Herramientas"}, str([p["sku"] for p in res["ML"]["pintura"]]))
comprobar("ML pintura incluye brocha", "HER-011" in [p["sku"] for p in res["ML"]["pintura"]])
comprobar("ML tubo PVC incluye codo y teflón", {"ACC-001", "VAL-002"} <= set(res["ML"]["tubo"]), str(res["ML"]["tubo"]))
cfg("ML")
orden = c.post("/api/buscar-necesidad", json={"texto": "pintar un dormitorio"}).json()
comprobar("ML búsqueda ordenada por coseno", [p["puntaje"] for p in orden] == sorted([p["puntaje"] for p in orden], reverse=True))

# 4. Indicadores con una sesión de resultado conocido
s = c.post("/api/admin/sesiones", json={"codigo_cliente": "CLI-990", "escenario": "ESC-01", "condicion": "ML",
                                        "orden": "A"}).json()["sesion"]
base = {"id_sesion": s["id_sesion"], "codigo_cliente": "CLI-990", "escenario": "ESC-01", "condicion": "ML"}
T = 1_900_000_000_000
ev = lambda **k: c.post("/api/eventos", json={**base, **k})
ev(tipo_evento="INICIO_BUSQUEDA", timestamp=T)
ev(tipo_evento="CONSULTA", texto_consulta="pintar", timestamp=T + 1000)
for i, sku in enumerate(["PIN-001", "PIN-002", "HER-012", "PIN-010", "LIJ-001"]):
    ev(tipo_evento="RECOM_MOSTRADA", sku=sku, posicion_recom=i + 1, origen="RECOMENDACION", timestamp=T + 2000)
ev(tipo_evento="PRODUCTO_AGREGADO", sku="PIN-002", posicion_recom=2, origen="RECOMENDACION", timestamp=T + 3000)
ev(tipo_evento="PRODUCTO_AGREGADO", sku="HER-012", posicion_recom=3, origen="RECOMENDACION", timestamp=T + 4000)
ev(tipo_evento="PRODUCTO_RETIRADO", sku="HER-012", posicion_recom=3, origen="RECOMENDACION", timestamp=T + 5000)
for i, sku in enumerate(["HER-011", "LIJ-001", "PIN-008", "PIN-007", "PIN-010"]):
    ev(tipo_evento="RECOM_MOSTRADA", sku=sku, posicion_recom=i + 1, origen="RECOMENDACION", timestamp=T + 6000)
ev(tipo_evento="PRODUCTO_AGREGADO", sku="HER-011", posicion_recom=1, origen="RECOMENDACION", timestamp=T + 7000)
ev(tipo_evento="PRODUCTO_AGREGADO", sku="LIJ-001", origen="BUSQUEDA", timestamp=T + 8000)
# Lista mostrada después de la última adición: sin oportunidad, no entra al promedio
for i, sku in enumerate(["PIN-003", "PIN-004", "PIN-005", "PIN-006", "PIN-009"]):
    ev(tipo_evento="RECOM_MOSTRADA", sku=sku, posicion_recom=i + 1, origen="RECOMENDACION", timestamp=T + 9000)
comprobar("evento con tipo inválido rechazado", ev(tipo_evento="OTRO", timestamp=T).status_code == 422)
c.post("/api/carrito/confirmar", json={**base, "timestamp": T + 42000, "total": 0, "items": [
    {"sku": "PIN-002", "cantidad": 1, "precio": 48, "origen": "RECOMENDACION"},
    {"sku": "HER-011", "cantidad": 1, "precio": 6.5, "origen": "RECOMENDACION"},
    {"sku": "LIJ-001", "cantidad": 1, "precio": 5, "origen": "BUSQUEDA"}]})
c.put("/api/admin/sesiones", json={"id_sesion": s["id_sesion"]})
fila = [f for f in c.get("/api/admin/indicadores").json()["por_sesion"]["ML"] if f["id_sesion"] == s["id_sesion"]][0]
# Carrito final {PIN-002, HER-011, LIJ-001}; lista 1 contiene PIN-002 y LIJ-001 (2/5); lista 2 contiene HER-011 y LIJ-001 (2/5);
# la lista 3 se mostró después de la última adición: se excluye (si contara, P@5 bajaría a 0.2667)
comprobar("tiempo de selección = 42 s", fila["tiempo_s"] == 42.0, str(fila["tiempo_s"]))
comprobar("Precision@5 de sesión = 0.4", fila["precision_5"] == 0.4, str(fila["precision_5"]))
comprobar("aceptadas desde recomendación = 2", fila["recs_aceptadas"] == 2, str(fila["recs_aceptadas"]))
comprobar("listas sin oportunidad = 1 (de 3)", fila["listas_sin_oportunidad"] == 1 and fila["listas_mostradas"] == 3,
          f'{fila["listas_sin_oportunidad"]} de {fila["listas_mostradas"]}')

# 5. Filtrado colaborativo: vecinos simétricos y sin autosimilitud
from collections import Counter  # noqa: E402

import colaborativo  # noqa: E402
import evaluacion_offline  # noqa: E402
import reordenador  # noqa: E402
from database import SessionLocal  # noqa: E402
from models import Comprobante, Producto  # noqa: E402

sdb = SessionLocal()
comps = sdb.query(Comprobante).order_by(Comprobante.fecha, Comprobante.numero).all()
con_cliente = [(x.codigo_cliente, [d.sku for d in x.detalles]) for x in comps]
cf_total = colaborativo.entrenar_cf(con_cliente, n_vecinos=10_000)
sims = {(i, j): s for i, vs in cf_total["vecinos"].items() for j, s in vs}
comprobar("CF sin autosimilitud", all(i != j for i, j in sims))
comprobar("CF simétrico", all(abs(s - sims.get((j, i), -1)) < 1e-6 for (i, j), s in sims.items()), f"{len(sims)} pares")
cf20 = colaborativo.entrenar_cf(con_cliente)
comprobar("CF guarda ≤ 20 vecinos con similitud > 0",
          all(len(v) <= 20 and all(s > 0 for _, s in v) for v in cf20["vecinos"].values()))

# 6. Reordenador: entrena y predice sin fuga (solo con el 80 % de entrenamiento)
n_train = int(len(comps) * 0.8)
train = con_cliente[:n_train]
todos = sdb.query(Producto).filter(Producto.activo == True).all()
ctx = reordenador.construir_contexto(todos, train, 0.01, 0.15, 1.2)
conteo_train = Counter(s for _, t in train for s in set(t))
maximo = max(conteo_train.values())
comprobar("popularidad del reordenador calculada solo con entrenamiento",
          all(abs(ctx.pop_norm[s] - c / maximo) < 1e-9 for s, c in conteo_train.items()) and len(ctx.pop_norm) == len(conteo_train))
clientes_train = {c for c, _ in train}
comprobar("CF del reordenador construido solo con clientes de entrenamiento", ctx.modelo_cf["n_clientes"] == len(clientes_train))
ent = reordenador.entrenar_reordenador(ctx, [t for _, t in train])
comprobar("reordenador entrenado solo con boletas de entrenamiento", ent["n_boletas"] == n_train, f"{ent['n_boletas']} de {len(comps)}")
recs = reordenador.recomendar_completo(ctx, ent, ["PIN-001"], 5)
stock = {p.sku: p.stock for p in todos}
comprobar("reordenador predice 5 sin la canasta ni stock 0",
          len(recs) == 5 and "PIN-001" not in [r["sku"] for r in recs] and all(stock[r["sku"]] > 0 for r in recs),
          str([r["sku"] for r in recs]))

# 7. Variantes ML por API y recomendación por cliente
for variante, fuente in (("REGLAS", "REGLA"), ("COMPLETO", "REORDENADOR")):
    c.put("/api/admin/config", json={"modo_activo": "ML", "k": 5, "soporte_min": 0.01, "confianza_min": 0.15,
                                     "lift_min": 1.2, "peso_contenido": 1.0, "variante_ml": variante})
    r = c.get("/api/recomendar?sku=TUB-001").json()
    comprobar(f"variante {variante} usa fuente {fuente}", r and r[0]["fuente"] == fuente, str([x["sku"] for x in r]))
con_hist = comps[0].codigo_cliente
rc = c.get(f"/api/recomendar/cliente/{con_hist}").json()
comprobar("recomendación por cliente con historial", rc["base"] == "HISTORIAL" and len(rc["resultados"]) == 5
          and not set(x["sku"] for x in rc["resultados"]) & set(rc["historial"]), f"{len(rc['historial'])} en historial")
rs = c.get("/api/recomendar/cliente/CLI-999", params={"skus": ["PIN-001"]}).json()
comprobar("cliente sin historial cae a reglas y popularidad", rs["base"] == "SIN_HISTORIAL" and len(rs["resultados"]) == 5
          and "PIN-001" not in [x["sku"] for x in rs["resultados"]])

# 8. Evaluación offline: tres modos, 80 filas cada uno (salidas redirigidas a una carpeta temporal)
tmp = tempfile.mkdtemp()
evaluacion_offline.DIR_SALIDAS = tmp
evaluacion_offline.RUTA_CSV = os.path.join(tmp, "eval.csv")
evaluacion_offline.RUTA_RESUMEN = os.path.join(tmp, "resumen.json")
res = evaluacion_offline.run_offline_evaluation(sdb)
import csv as _csv  # noqa: E402
filas = list(_csv.DictReader(open(evaluacion_offline.RUTA_CSV, encoding="utf-8-sig")))
por_modo = Counter(f["modo"] for f in filas)
comprobar("offline: tres modos con 80 filas cada uno",
          dict(por_modo) == {"CONV": 80, "ML_REGLAS": 80, "ML_COMPLETO": 80}, str(dict(por_modo)))
comprobar("offline: McNemar para CONV vs ML_COMPLETO y ML_REGLAS vs ML_COMPLETO",
          {"CONV_vs_ML_COMPLETO", "ML_REGLAS_vs_ML_COMPLETO"} <= set(res["mcnemar_exacto"]))
sdb.close()

print("\nResultado:", "TODO OK" if not fallas else f"{len(fallas)} fallas: {fallas}")
sys.exit(1 if fallas else 0)
