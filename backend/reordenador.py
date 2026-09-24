"""
Reordenamiento supervisado de candidatos (capa B del modo ML COMPLETO).

Candidatos para un contexto B (canasta, producto visto o historial del cliente):
  unión de top 10 por reglas (confianza × lift), top 10 por filtrado colaborativo,
  top 10 por popularidad de la misma categoría de B y top 5 por similitud TF-IDF entre
  el texto de B y cada producto; sin duplicados, sin ítems de B y sin stock 0.

Variables por (B, candidato): ver VARIABLES. Etiqueta = 1 si el candidato es el ítem oculto.
Modelo: regresión logística (class_weight="balanced") y, si está instalado, LightGBM;
se elige por average precision en una validación temporal (10 % final de las boletas de
entrenamiento) y se reentrena el elegido con todos los ejemplos.

Todo lo que se aprende de transacciones (reglas, CF, popularidad, clasificador) se calcula
con las boletas que recibe la función: en la evaluación offline, solo el 80 % de entrenamiento.
"""
import math
import os
from collections import Counter
from datetime import datetime

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from colaborativo import entrenar_cf, puntajes_cf
from recommender import documento_producto, entrenar_reglas, tokens

try:
    from lightgbm import LGBMClassifier
except ImportError:  # LightGBM es opcional
    LGBMClassifier = None

VERSION = "3.0"
DIR_MODELOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modelos")
RUTA_MODELO = os.path.join(DIR_MODELOS, "reordenador.joblib")

TOP_REGLAS, TOP_CF, TOP_POPULAR, TOP_CONTENIDO = 10, 10, 10, 5
PROPORCION_VALIDACION = 0.10
SEMILLA = 42

VARIABLES = [
    "conf_max", "lift_max", "soporte_max", "n_reglas_activas",
    "cf_score", "cf_sim_max",
    "popularidad_norm",
    "fraccion_misma_categoria", "fraccion_misma_subcategoria",
    "log_ratio_precio",
    "similitud_contenido",
    "tam_B",
    "viene_de_reglas", "viene_de_cf", "viene_de_popularidad", "viene_de_contenido",
]
IDX_CONTENIDO = VARIABLES.index("similitud_contenido")


# ---------------------------------------------------------------------------
# Contexto de datos (lo que el reordenador necesita saber del catálogo y del historial)
# ---------------------------------------------------------------------------
class Contexto:
    def __init__(self, productos: list, reglas: list[dict], modelo_cf: dict, conteos_popularidad: dict):
        # productos: TODOS los productos (los de B pueden no tener stock); candidatos solo con stock > 0
        self.por_sku = {p.sku: p for p in productos}
        self.disponibles = [p for p in productos if p.activo and p.stock > 0]
        self.reglas = reglas
        self.modelo_cf = modelo_cf
        maximo = max(conteos_popularidad.values(), default=0) or 1
        self.pop_norm = {s: c / maximo for s, c in conteos_popularidad.items()}
        self.skus_texto = list(self.por_sku)
        docs = [" ".join(tokens(documento_producto(self.por_sku[s]))) for s in self.skus_texto]
        self.vectorizador = TfidfVectorizer(token_pattern=r"[a-z0-9]+")
        self.matriz_texto = self.vectorizador.fit_transform(docs)
        self.fila_texto = {s: i for i, s in enumerate(self.skus_texto)}


def conteos_desde_transacciones(transacciones: list[list[str]]) -> dict:
    """Nº de comprobantes en que aparece cada SKU (base de la popularidad normalizada)."""
    return dict(Counter(s for t in transacciones for s in set(t)))


def construir_contexto(productos, transacciones_con_cliente, soporte_min, confianza_min, lift_min) -> Contexto:
    """Entrena reglas, CF y popularidad con las transacciones dadas y arma el contexto."""
    transacciones = [skus for _, skus in transacciones_con_cliente]
    reglas = entrenar_reglas(transacciones, soporte_min, confianza_min, lift_min)
    return Contexto(productos, reglas, entrenar_cf(transacciones_con_cliente),
                    conteos_desde_transacciones(transacciones))


# ---------------------------------------------------------------------------
# Candidatos y variables
# ---------------------------------------------------------------------------
def generar_candidatos(ctx: Contexto, canasta: list[str]) -> tuple[list[str], np.ndarray]:
    """Devuelve (skus_candidatos, matriz de variables) para el contexto B = canasta."""
    B = [s for s in dict.fromkeys(canasta) if s in ctx.por_sku]
    en_B = set(B)
    disp = [p for p in ctx.disponibles if p.sku not in en_B]
    disp_skus = {p.sku for p in disp}

    # Reglas activas (antecedentes ⊆ B) agregadas por consecuente
    agr: dict[str, list] = {}
    for r in ctx.reglas:
        if set(r["antecedentes"]) <= en_B:
            for c in r["consecuentes"]:
                if c in disp_skus:
                    a = agr.setdefault(c, [0.0, 0.0, 0.0, 0, 0.0])
                    a[0] = max(a[0], r["confianza"]); a[1] = max(a[1], r["lift"])
                    a[2] = max(a[2], r["soporte"]); a[3] += 1
                    a[4] = max(a[4], r["confianza"] * r["lift"])
    de_reglas = [s for s, _ in sorted(agr.items(), key=lambda x: (-x[1][4], x[0]))[:TOP_REGLAS]]

    # Filtrado colaborativo
    cf = {s: v for s, v in puntajes_cf(ctx.modelo_cf, B).items() if s in disp_skus}
    de_cf = [s for s, _ in sorted(cf.items(), key=lambda x: (-x[1][0], x[0]))[:TOP_CF]]

    # Popularidad dentro de las categorías de B
    cats = {ctx.por_sku[s].categoria for s in B}
    de_pop = [p.sku for p in sorted((p for p in disp if p.categoria in cats),
                                    key=lambda p: (-ctx.pop_norm.get(p.sku, 0), p.sku))[:TOP_POPULAR]]

    # Similitud de contenido TF-IDF entre el texto de B y cada producto
    sim_cont = {}
    if B:
        texto_B = " ".join(" ".join(tokens(documento_producto(ctx.por_sku[s]))) for s in B)
        sims = cosine_similarity(ctx.vectorizador.transform([texto_B]), ctx.matriz_texto).flatten()
        sim_cont = {s: float(sims[ctx.fila_texto[s]]) for s in disp_skus}
    de_cont = [s for s, v in sorted(sim_cont.items(), key=lambda x: (-x[1], x[0]))[:TOP_CONTENIDO] if v > 0]

    candidatos = list(dict.fromkeys(de_reglas + de_cf + de_pop + de_cont))
    if not candidatos:
        return [], np.zeros((0, len(VARIABLES)))

    fuentes = (set(de_reglas), set(de_cf), set(de_pop), set(de_cont))
    precio_medio = np.mean([ctx.por_sku[s].precio for s in B]) if B else None
    subcats = [ctx.por_sku[s].subcategoria for s in B]
    cats_B = [ctx.por_sku[s].categoria for s in B]
    filas = []
    for s in candidatos:
        p = ctx.por_sku[s]
        a = agr.get(s, [0.0, 0.0, 0.0, 0, 0.0])
        cf_score, cf_max = cf.get(s, (0.0, 0.0))
        n = len(B) or 1
        filas.append([
            a[0], a[1], a[2], a[3],
            cf_score, cf_max,
            ctx.pop_norm.get(s, 0.0),
            sum(c == p.categoria for c in cats_B) / n,
            sum(c == p.subcategoria for c in subcats) / n,
            math.log(p.precio / precio_medio) if precio_medio and p.precio > 0 else 0.0,
            sim_cont.get(s, 0.0),
            len(B),
            *[1.0 if s in f else 0.0 for f in fuentes],
        ])
    return candidatos, np.array(filas, dtype=float)


# ---------------------------------------------------------------------------
# Entrenamiento
# ---------------------------------------------------------------------------
def construir_ejemplos(ctx: Contexto, boletas: list[list[str]]):
    """Cada boleta con ≥ 2 ítems × cada ítem oculto → contexto B = resto; etiqueta 1 si candidato = oculto."""
    X, y, grupo, cubiertos, contextos = [], [], [], 0, 0
    for g, items in enumerate(boletas):
        items = [s for s in dict.fromkeys(items) if s in ctx.por_sku]
        if len(items) < 2:
            continue
        for oculto in items:
            resto = [s for s in items if s != oculto]
            cands, M = generar_candidatos(ctx, resto)
            contextos += 1
            if not cands:
                continue
            cubiertos += oculto in cands
            X.append(M)
            y.extend(1 if s == oculto else 0 for s in cands)
            grupo.extend([g] * len(cands))
    X = np.vstack(X) if X else np.zeros((0, len(VARIABLES)))
    return X, np.array(y), np.array(grupo), {"contextos": contextos, "cobertura_candidatos": cubiertos / contextos if contextos else 0.0}


def _candidatos_modelo():
    modelos = {"regresion_logistica": lambda: make_pipeline(
        StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=2000, random_state=SEMILLA))}
    if LGBMClassifier is not None:
        modelos["lightgbm"] = lambda: LGBMClassifier(
            n_estimators=300, learning_rate=0.05, num_leaves=15, min_child_samples=20,
            class_weight="balanced", random_state=SEMILLA, verbose=-1)
    return modelos


def entrenar_reordenador(ctx: Contexto, boletas_ordenadas: list[list[str]]) -> dict:
    """boletas_ordenadas: boletas de entrenamiento en orden cronológico."""
    X, y, grupo, info = construir_ejemplos(ctx, boletas_ordenadas)
    if len(y) == 0 or y.sum() == 0:
        raise ValueError("No hay ejemplos positivos para entrenar el reordenador")
    corte = int(len(boletas_ordenadas) * (1 - PROPORCION_VALIDACION))
    ent, val = grupo < corte, grupo >= corte
    ap = {}
    for nombre, fabrica in _candidatos_modelo().items():
        m = fabrica().fit(X[ent], y[ent])
        ap[nombre] = round(float(average_precision_score(y[val], m.predict_proba(X[val])[:, 1])), 4)
    elegido = max(ap, key=lambda k: (ap[k], k == "regresion_logistica"))
    modelo = _candidatos_modelo()[elegido]().fit(X, y)
    return {
        "modelo": modelo,
        "tipo": elegido,
        "version": VERSION,
        "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "variables": VARIABLES,
        "n_boletas": len(boletas_ordenadas),
        "n_ejemplos": int(len(y)),
        "n_positivos": int(y.sum()),
        "n_contextos": info["contextos"],
        "cobertura_candidatos": round(info["cobertura_candidatos"], 4),
        "ap_validacion": ap,
        "validacion": f"temporal: último {int(PROPORCION_VALIDACION * 100)} % de las boletas de entrenamiento",
    }


# ---------------------------------------------------------------------------
# Inferencia
# ---------------------------------------------------------------------------
def recomendar_completo(ctx: Contexto, entrenado: dict, canasta: list[str], k: int = 5,
                        peso_contenido: float = 1.0) -> list[dict]:
    """
    Ordena los candidatos por probabilidad (desempate por confianza de regla) y toma K.
    peso_contenido multiplica la variable similitud_contenido antes de predecir
    (1.0 = el modelo tal como se entrenó; < 1 atenúa el contenido, > 1 lo refuerza).
    """
    cands, M = generar_candidatos(ctx, canasta)
    res = []
    if cands:
        M = M.copy()
        M[:, IDX_CONTENIDO] *= peso_contenido
        prob = entrenado["modelo"].predict_proba(M)[:, 1]
        orden = sorted(range(len(cands)), key=lambda i: (-prob[i], -M[i, 0], cands[i]))
        res = [{"sku": cands[i], "fuente": "REORDENADOR", "puntaje": round(float(prob[i]), 4)} for i in orden[:k]]
    if len(res) < k:  # relleno por popularidad general (p. ej., B vacío)
        ya = set(canasta) | {r["sku"] for r in res}
        for p in sorted(ctx.disponibles, key=lambda p: (-ctx.pop_norm.get(p.sku, 0), p.sku)):
            if len(res) >= k:
                break
            if p.sku not in ya:
                res.append({"sku": p.sku, "fuente": "POPULAR_GENERAL", "puntaje": None})
    return res


# ---------------------------------------------------------------------------
# Persistencia
# ---------------------------------------------------------------------------
def guardar(entrenado: dict, modelo_cf: dict, conteos_popularidad: dict):
    os.makedirs(DIR_MODELOS, exist_ok=True)
    joblib.dump({**entrenado, "modelo_cf": modelo_cf, "conteos_popularidad": conteos_popularidad}, RUTA_MODELO)


_cache = {"mtime": None, "datos": None}


def cargar() -> dict | None:
    """
    Carga el artefacto guardado (con caché por fecha de modificación).
    joblib usa pickle: solo se carga el archivo que genera este mismo backend en backend/modelos/
    al reentrenar; nunca se aceptan modelos subidos por usuarios ni rutas externas.
    """
    if not os.path.exists(RUTA_MODELO):
        return None
    mtime = os.path.getmtime(RUTA_MODELO)
    if _cache["mtime"] != mtime:
        _cache["datos"], _cache["mtime"] = joblib.load(RUTA_MODELO), mtime
    return _cache["datos"]


def metadatos() -> dict | None:
    d = cargar()
    if not d:
        return None
    claves = ("tipo", "version", "fecha", "n_boletas", "n_ejemplos", "n_positivos", "n_contextos",
              "cobertura_candidatos", "ap_validacion", "validacion", "variables")
    return {c: d.get(c) for c in claves}
