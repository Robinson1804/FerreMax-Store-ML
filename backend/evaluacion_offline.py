"""
Evaluación offline (Capa 1, BRIEF §3) con tres modos: CONV, ML_REGLAS y ML_COMPLETO.

1. Ordena los comprobantes por fecha (y número, para desempatar) y reserva el 20 % más
   reciente como conjunto de prueba.
2. Con el 80 % de entrenamiento calcula TODO lo que usan los recomendadores: popularidad,
   reglas FP-Growth (umbrales de la configuración), filtrado colaborativo cliente × producto
   y el reordenador supervisado (con su validación temporal interna). Nada de lo guardado en
   la base (reglas, popularidad, modelo) se usa, porque fue calculado con todos los comprobantes.
3. Para cada comprobante de prueba con 2 o más productos oculta uno al azar (semilla 42),
   genera 5 recomendaciones por modo a partir del resto de la canasta con las mismas
   funciones que la API, y calcula:
       Precision@5 = aciertos / 5      Recall@5 = aciertos / 1
4. Compara pares de modos con la prueba exacta de McNemar (binomial sobre pares discordantes).
5. Exporta un CSV con una fila por comprobante y modo, y un JSON con el resumen.

Uso:  python evaluacion_offline.py      (o POST /api/admin/evaluacion-offline)
"""
import csv
import json
import os
import random
import statistics
from datetime import datetime

from scipy.stats import binomtest
from sqlalchemy.orm import Session

import reordenador
from models import Producto, Comprobante
from recommender import recomendar_skus, popularidad_desde_transacciones, obtener_config

SEMILLA = 42
K = 5
PROPORCION_ENTRENAMIENTO = 0.8
MODOS = ("CONV", "ML_REGLAS", "ML_COMPLETO")
PARES_MCNEMAR = (("CONV", "ML_COMPLETO"), ("ML_REGLAS", "ML_COMPLETO"), ("CONV", "ML_REGLAS"))
DIR_SALIDAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salidas")
RUTA_CSV = os.path.join(DIR_SALIDAS, "evaluacion_offline.csv")
RUTA_RESUMEN = os.path.join(DIR_SALIDAS, "evaluacion_offline_resumen.json")


def _estadisticos(valores: list[float]) -> dict:
    return {
        "n": len(valores),
        "media": round(statistics.mean(valores), 4) if valores else None,
        "mediana": round(statistics.median(valores), 4) if valores else None,
        "de": round(statistics.stdev(valores), 4) if len(valores) > 1 else None,
    }


def mcnemar_exacto(aciertos_a: dict, aciertos_b: dict) -> dict:
    """Prueba exacta de McNemar: b = solo A acierta, c = solo B acierta; p bilateral binomial(b, b+c, 0.5)."""
    claves = aciertos_a.keys() & aciertos_b.keys()
    b = sum(1 for x in claves if aciertos_a[x] == 1 and aciertos_b[x] == 0)
    c = sum(1 for x in claves if aciertos_a[x] == 0 and aciertos_b[x] == 1)
    ambos = sum(1 for x in claves if aciertos_a[x] == 1 and aciertos_b[x] == 1)
    ninguno = len(claves) - b - c - ambos
    p = binomtest(b, b + c, 0.5).pvalue if b + c > 0 else 1.0
    return {"ambos": ambos, "solo_primero": b, "solo_segundo": c, "ninguno": ninguno, "p_valor": round(float(p), 6)}


def run_offline_evaluation(db: Session) -> dict:
    config = obtener_config(db)
    comprobantes = db.query(Comprobante).order_by(Comprobante.fecha.asc(), Comprobante.numero.asc()).all()
    if not comprobantes:
        return {"error": "No hay comprobantes para evaluar"}

    n_train = int(len(comprobantes) * PROPORCION_ENTRENAMIENTO)
    entrenamiento, prueba = comprobantes[:n_train], comprobantes[n_train:]
    canasta = lambda c: [d.sku for d in sorted(c.detalles, key=lambda d: d.id)]

    # ---- Todo se entrena solo con el 80 % -------------------------------------------------
    con_cliente = [(c.codigo_cliente, canasta(c)) for c in entrenamiento if c.detalles]
    trans_train = [skus for _, skus in con_cliente]
    popularidad = popularidad_desde_transacciones(trans_train)
    todos = db.query(Producto).filter(Producto.activo == True).all()
    ctx = reordenador.construir_contexto(todos, con_cliente, config.soporte_min, config.confianza_min, config.lift_min)
    reglas = ctx.reglas  # FP-Growth sobre el 80 %, mismos umbrales
    entrenado = reordenador.entrenar_reordenador(ctx, trans_train)

    productos = [p for p in todos if p.stock > 0]  # filtro de stock de la tienda (igual para todos los modos)
    en_catalogo = {p.sku for p in productos}

    rng = random.Random(SEMILLA)
    filas, cubiertos = [], 0
    for c in prueba:
        items = list(dict.fromkeys(s for s in canasta(c) if s in en_catalogo))
        if len(items) < 2:
            continue
        oculto = items[rng.randrange(len(items))]
        resto = [s for s in items if s != oculto]
        cands, _ = reordenador.generar_candidatos(ctx, resto)
        cubiertos += oculto in cands
        for modo in MODOS:
            if modo == "ML_COMPLETO":
                recs = reordenador.recomendar_completo(ctx, entrenado, resto, K, config.peso_contenido or 1.0)
            else:
                recs = recomendar_skus("CONV" if modo == "CONV" else "ML", resto, K, productos, popularidad,
                                       reglas if modo == "ML_REGLAS" else [])
            top5 = [r["sku"] for r in recs]
            aciertos = 1 if oculto in top5 else 0
            filas.append({
                "comprobante": c.numero,
                "fecha": c.fecha.strftime("%Y-%m-%d"),
                "modo": modo,
                "canasta_visible": "|".join(resto),
                "producto_oculto": oculto,
                "top5": "|".join(top5),
                "acierto": aciertos,
                "precision5": aciertos / K,
                "recall5": aciertos / 1,
            })

    os.makedirs(DIR_SALIDAS, exist_ok=True)
    with open(RUTA_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(filas[0].keys()) if filas else ["comprobante"])
        writer.writeheader()
        writer.writerows(filas)

    por_modo, aciertos_por_modo = {}, {}
    for modo in MODOS:
        sub = [f for f in filas if f["modo"] == modo]
        aciertos_por_modo[modo] = {f["comprobante"]: f["acierto"] for f in sub}
        por_modo[modo] = {
            "precision5": _estadisticos([f["precision5"] for f in sub]),
            "recall5": _estadisticos([f["recall5"] for f in sub]),
            "aciertos": sum(f["acierto"] for f in sub),
        }
    mcnemar = {f"{a}_vs_{b}": mcnemar_exacto(aciertos_por_modo[a], aciertos_por_modo[b]) for a, b in PARES_MCNEMAR}
    n_eval = len(filas) // len(MODOS)

    resumen = {
        "fecha_corrida": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "semilla": SEMILLA,
        "k": K,
        "particion": "temporal 80/20 por fecha de comprobante",
        "n_comprobantes": len(comprobantes),
        "n_entrenamiento": n_train,
        "n_prueba_total": len(prueba),
        "n_prueba_evaluados": n_eval,
        "periodo_entrenamiento": [entrenamiento[0].fecha.strftime("%Y-%m-%d"), entrenamiento[-1].fecha.strftime("%Y-%m-%d")] if entrenamiento else None,
        "periodo_prueba": [prueba[0].fecha.strftime("%Y-%m-%d"), prueba[-1].fecha.strftime("%Y-%m-%d")] if prueba else None,
        "umbrales": {"soporte_min": config.soporte_min, "confianza_min": config.confianza_min, "lift_min": config.lift_min},
        "peso_contenido": config.peso_contenido,
        "reglas_entrenadas": len(reglas),
        "cf_productos": ctx.modelo_cf["n_productos"],
        "cf_clientes": ctx.modelo_cf["n_clientes"],
        "reordenador": {c: entrenado[c] for c in ("tipo", "n_ejemplos", "n_positivos", "n_contextos",
                                                   "cobertura_candidatos", "ap_validacion", "validacion")},
        "cobertura_candidatos_prueba": round(cubiertos / n_eval, 4) if n_eval else None,
        "modos": list(MODOS),
        "por_modo": por_modo,
        "mcnemar_exacto": mcnemar,
        "csv": os.path.relpath(RUTA_CSV, os.path.dirname(DIR_SALIDAS)).replace("\\", "/"),
    }
    with open(RUTA_RESUMEN, "w", encoding="utf-8") as f:
        json.dump(resumen, f, ensure_ascii=False, indent=2)
    return resumen


def ultimo_resumen() -> dict | None:
    if not os.path.exists(RUTA_RESUMEN):
        return None
    with open(RUTA_RESUMEN, encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    from database import SessionLocal
    db = SessionLocal()
    print(json.dumps(run_offline_evaluation(db), ensure_ascii=False, indent=2))
    db.close()
