"""
Siembra la base de datos desde datos/datos_simulados_prototipo.json.

Es determinista (semilla 42): cada ejecución produce los mismos clientes, fechas y
comprobantes, de modo que la partición temporal 80/20 de la evaluación offline es
reproducible. Las boletas del JSON no traen fecha; se asume que vienen en orden
cronológico y se les asignan fechas crecientes entre el 02/01/2026 y el 30/06/2026.

Uso:
    python seed.py            # siembra solo si la base está vacía
    python seed.py --reset    # borra todas las tablas y vuelve a sembrar
    python seed.py --reset --reentrenar   # además entrena FP-Growth con los umbrales de configuracion
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
RUTA_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "datos", "datos_simulados_prototipo.json")


def seed_data(reset: bool = False):
    if reset:
        Base.metadata.drop_all(bind=engine)
    init_db()
    db = SessionLocal()
    if db.query(Producto).first():
        print("La base de datos ya contiene datos. Use --reset para volver a sembrar.")
        db.close()
        return

    rng = random.Random(SEMILLA)
    with open(RUTA_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    boletas = data.get("boletas", [])

    # 1. Configuración inicial del recomendador
    db.add(Configuracion(id=1, modo_activo="CONV", k=5, soporte_min=0.01, confianza_min=0.15,
                         lift_min=1.2, peso_contenido=1.0, variante_ml="COMPLETO"))

    # 2. Productos; la popularidad se calcula de las boletas (1 = aparece en más comprobantes)
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

    # 3. Reglas precalculadas del JSON (versión 1.0); POST /api/admin/modelo/reentrenar las reemplaza
    for r in data.get("reglas", []):
        db.add(Regla(antecedentes=json.dumps(r["a"]), consecuentes=json.dumps(r["c"]), soporte=r["sup"],
                     confianza=r["conf"], lift=r["lift"], version_modelo="1.0"))

    # 4. Clientes anónimos CLI-### (sin nombres ni DNI)
    codigos = [f"CLI-{i:03d}" for i in range(1, N_CLIENTES + 1)]
    primera = {}

    # 5. Comprobantes con fechas crecientes y reproducibles
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

    db.commit()
    print(f"Sembrados {len(data.get('productos', []))} productos, {len(data.get('reglas', []))} reglas del JSON, "
          f"{len(boletas)} comprobantes y {len(primera)} clientes.")
    db.close()


def reentrenar():
    from recommender import RecommenderService
    db = SessionLocal()
    print(RecommenderService(db).reentrenar_modelo()["message"])
    db.close()


if __name__ == "__main__":
    seed_data(reset="--reset" in sys.argv)
    if "--reentrenar" in sys.argv:
        reentrenar()
