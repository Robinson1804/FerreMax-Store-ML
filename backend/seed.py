"""
Siembra la base de datos desde una de dos fuentes:

- empresa  → datos/datos_empresa_2026.json: ventas reales anonimizadas (boletas con fecha, número,
             cliente o venta sin cliente, cantidades y precios reales). NO se versiona: el repositorio
             es público. Las reglas se entrenan después con --reentrenar.
- simulado → datos/datos_simulados_prototipo.json: datos del prototipo (420 boletas). Es determinista
             (semilla 42): las boletas no traen fecha y se les asignan fechas crecientes entre el
             02/01/2026 y el 30/06/2026, así que reproduce exactamente la corrida de validación.

La fuente se elige con --fuente empresa|simulado o con la variable FERREMAX_FUENTE; si no se indica,
se usa "empresa" cuando el archivo existe y "simulado" en caso contrario.

Uso:
    python seed.py --reset --reentrenar                     # fuente automática
    python seed.py --reset --reentrenar --fuente simulado   # reproduce la validación con datos simulados
    python seed.py                                          # siembra solo si la base está vacía
    python seed.py --solo-kw                                # solo reaplica datos/kw_enriquecidas.json (sin borrar datos)
"""
import json
import os
import random
import sys
from datetime import datetime, timedelta

from database import SessionLocal, engine, init_db
from models import Base, Producto, Cliente, Comprobante, DetalleComprobante, Regla, Configuracion
from recommender import popularidad_desde_transacciones

SEMILLA = 42
FECHA_INICIO = datetime(2026, 1, 2, 9, 0)
FECHA_FIN = datetime(2026, 6, 30, 19, 0)
N_CLIENTES = 150
DIR_DATOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "datos")
RUTAS = {
    "empresa": os.path.join(DIR_DATOS, "datos_empresa_2026.json"),
    "simulado": os.path.join(DIR_DATOS, "datos_simulados_prototipo.json"),
}
RUTA_JSON = RUTAS["simulado"]  # compatibilidad con código anterior
# Términos de uso que enriquecen palabras_clave del catálogo real (preparación de datos; versionado)
RUTA_KW = os.path.join(DIR_DATOS, "kw_enriquecidas.json")


def kw_enriquecidas() -> dict:
    """{sku: [términos]} desde datos/kw_enriquecidas.json (vacío si no existe)."""
    if not os.path.exists(RUTA_KW):
        return {}
    with open(RUTA_KW, encoding="utf-8") as f:
        return json.load(f).get("terminos", {})


def combinar_kw(kw: str, extra: list[str]) -> str:
    """palabras_clave originales + términos de uso, sin repetir."""
    palabras = (kw or "").split()
    return " ".join(dict.fromkeys(palabras + [e for e in extra if e not in palabras]))


def fuente_por_defecto() -> str:
    elegida = os.getenv("FERREMAX_FUENTE")
    if elegida:
        return elegida
    return "empresa" if os.path.exists(RUTAS["empresa"]) else "simulado"


def _config_inicial(fuente: str) -> Configuracion:
    return Configuracion(id=1, modo_activo="CONV", k=5, soporte_min=0.01, confianza_min=0.15,
                         lift_min=1.2, peso_contenido=1.0, variante_ml="COMPLETO", fuente_datos=fuente)


def _sembrar_simulado(db, data):
    rng = random.Random(SEMILLA)
    boletas = data.get("boletas", [])
    popularidad = popularidad_desde_transacciones(boletas)
    precios = {}
    for p in data.get("productos", []):
        precios[p["sku"]] = p["precio"]
        db.add(Producto(
            sku=p["sku"], nombre=p["nombre"], marca=p.get("marca", ""), categoria=p.get("cat", ""),
            subcategoria=p.get("sub", ""), unidad=p.get("unidad", ""), uso=p.get("uso", ""),
            palabras_clave=p.get("kw", ""), precio=p["precio"], stock=p["stock"], stock_minimo=5,
            activo=True, popularidad=popularidad.get(p["sku"], 999),
        ))
    # Reglas precalculadas del JSON (versión 1.0); --reentrenar las reemplaza
    for r in data.get("reglas", []):
        db.add(Regla(antecedentes=json.dumps(r["a"]), consecuentes=json.dumps(r["c"]), soporte=r["sup"],
                     confianza=r["conf"], lift=r["lift"], version_modelo="1.0"))
    codigos = [f"CLI-{i:03d}" for i in range(1, N_CLIENTES + 1)]
    primera = {}
    paso = (FECHA_FIN - FECHA_INICIO) / max(len(boletas), 1)
    for i, items in enumerate(boletas):
        fecha = FECHA_INICIO + paso * i + timedelta(minutes=rng.randint(0, 180))
        cliente = rng.choice(codigos)
        primera.setdefault(cliente, fecha)
        numero = f"B001-{i + 1:06d}"
        skus = [s for s in items if s in precios]
        db.add(Comprobante(numero=numero, fecha=fecha, codigo_cliente=cliente,
                           canal=rng.choice(["Tienda", "Tienda", "Web"]),
                           total=round(sum(precios[s] for s in skus), 2)))
        for s in skus:
            db.add(DetalleComprobante(numero=numero, sku=s, cantidad=1, precio_unitario=precios[s]))
    for codigo, fecha in primera.items():
        db.add(Cliente(codigo=codigo, tipo="Regular", primera_compra=fecha, participa_evaluacion=False))
    return {"productos": len(data.get("productos", [])), "reglas_json": len(data.get("reglas", [])),
            "comprobantes": len(boletas), "clientes": len(primera)}


def _sembrar_empresa(db, data):
    """Ventas reales: se respetan número, fecha, cliente (o venta sin cliente), cantidades y precios."""
    boletas = data.get("boletas", [])
    popularidad = popularidad_desde_transacciones([[i["sku"] for i in b["items"]] for b in boletas])
    extra = kw_enriquecidas()
    for p in data.get("productos", []):
        db.add(Producto(
            sku=p["sku"], nombre=p["nombre"], marca=p.get("marca", ""), categoria=p.get("cat", ""),
            subcategoria=p.get("sub", ""), unidad=p.get("unidad", ""), uso=p.get("uso", ""),
            palabras_clave=combinar_kw(p.get("kw", ""), extra.get(p["sku"], [])), precio=p["precio"], stock=p["stock"],
            stock_minimo=p.get("stock_min", 5), activo=True, popularidad=popularidad.get(p["sku"], 999),
        ))
    # Clientes identificados (códigos anónimos); primera_compra = fecha de su primera boleta
    primera = {}
    for b in boletas:
        if b.get("cliente"):
            f = datetime.strptime(b["fecha"], "%Y-%m-%d")
            primera[b["cliente"]] = min(primera.get(b["cliente"], f), f)
    for c in data.get("clientes", []):
        db.add(Cliente(codigo=c["codigo"], tipo=c.get("tipo") or "Regular",
                       primera_compra=primera.get(c["codigo"]), participa_evaluacion=False))
    # Boletas: las ventas sin cliente quedan con codigo_cliente NULL (no cuentan como cliente)
    for b in boletas:
        db.add(Comprobante(numero=b["numero"], fecha=datetime.strptime(b["fecha"], "%Y-%m-%d"),
                           codigo_cliente=b.get("cliente") or None, canal="Tienda", total=b["total"]))
        for i in b["items"]:
            cant = float(i["cantidad"])
            # El descuento es por línea: total de la línea = precio·cantidad − descuento
            unitario = (i["precio"] * cant - (i.get("descuento") or 0)) / cant if cant else i["precio"]
            db.add(DetalleComprobante(numero=b["numero"], sku=i["sku"], cantidad=cant,
                                      precio_unitario=round(unitario, 4)))
    return {"productos": len(data.get("productos", [])), "reglas_json": 0, "comprobantes": len(boletas),
            "clientes": len(data.get("clientes", [])),
            "sin_cliente": sum(1 for b in boletas if not b.get("cliente"))}


def seed_data(reset: bool = False, fuente: str | None = None):
    fuente = fuente or fuente_por_defecto()
    if fuente not in RUTAS:
        raise ValueError(f"Fuente desconocida: {fuente} (use empresa o simulado)")
    if not os.path.exists(RUTAS[fuente]):
        raise FileNotFoundError(f"No existe {RUTAS[fuente]}")
    if reset:
        Base.metadata.drop_all(bind=engine)
    init_db()
    db = SessionLocal()
    if db.query(Producto).first():
        print("La base de datos ya contiene datos. Use --reset para volver a sembrar.")
        db.close()
        return
    with open(RUTAS[fuente], "r", encoding="utf-8") as f:
        data = json.load(f)
    db.add(_config_inicial(fuente))
    resumen = _sembrar_empresa(db, data) if fuente == "empresa" else _sembrar_simulado(db, data)
    db.commit()
    db.close()
    print(f"Fuente: {fuente}. Sembrados {resumen['productos']} productos, {resumen['comprobantes']} comprobantes, "
          f"{resumen['clientes']} clientes" + (f", {resumen['sin_cliente']} ventas sin cliente" if "sin_cliente" in resumen else "")
          + f", {resumen['reglas_json']} reglas precalculadas.")
    return resumen


def aplicar_kw_enriquecidas(fuente: str = "empresa") -> int:
    """Actualiza solo palabras_clave en una base ya sembrada (sin borrar ventas, sesiones ni eventos)."""
    with open(RUTAS[fuente], encoding="utf-8") as f:
        originales = {p["sku"]: p.get("kw", "") for p in json.load(f)["productos"]}
    extra = kw_enriquecidas()
    db = SessionLocal()
    n = 0
    for prod in db.query(Producto).all():
        if prod.sku in originales:
            prod.palabras_clave = combinar_kw(originales[prod.sku], extra.get(prod.sku, []))
            n += 1
    db.commit()
    db.close()
    print(f"palabras_clave actualizadas en {n} productos ({sum(1 for s in originales if s in extra)} con términos de uso)")
    return n


def reentrenar():
    from recommender import RecommenderService
    db = SessionLocal()
    print(RecommenderService(db).reentrenar_modelo()["message"])
    db.close()


if __name__ == "__main__":
    fuente = None
    if "--fuente" in sys.argv:
        fuente = sys.argv[sys.argv.index("--fuente") + 1]
    if "--solo-kw" in sys.argv:  # aplica el enriquecimiento sin volver a sembrar
        aplicar_kw_enriquecidas(fuente or "empresa")
        sys.exit(0)
    seed_data(reset="--reset" in sys.argv, fuente=fuente)
    if "--reentrenar" in sys.argv:
        reentrenar()
