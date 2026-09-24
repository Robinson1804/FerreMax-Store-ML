"""
Filtrado colaborativo ítem-ítem (capa A del modo ML COMPLETO).

- Matriz binaria cliente × producto construida desde los comprobantes recibidos
  (en producción, todos; en la evaluación offline, SOLO los de entrenamiento).
- Similitud coseno entre columnas de producto (scikit-learn), sin autosimilitud.
- Por producto se guardan sus 20 vecinos con similitud > 0.
- Puntaje CF de un candidato j dada una canasta o historial B:
      cf_score(j) = Σ_{i ∈ B} sim(i, j)      (j ∉ B; sim = 0 si j no está entre los vecinos de i)
"""
from collections import defaultdict

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

N_VECINOS = 20


def entrenar_cf(compras: list[tuple[str, list[str]]], n_vecinos: int = N_VECINOS) -> dict:
    """
    compras: [(codigo_cliente, [sku, ...]), ...] — una entrada por comprobante.
    Devuelve {"vecinos": {sku: [(sku_vecino, sim), ...]}, "n_clientes", "n_productos"}.
    """
    por_cliente: dict[str, set] = defaultdict(set)
    for cliente, skus in compras:
        por_cliente[cliente].update(skus)
    clientes = sorted(por_cliente)
    productos = sorted({s for skus in por_cliente.values() for s in skus})
    if not clientes or not productos:
        return {"vecinos": {}, "n_clientes": 0, "n_productos": 0}

    col = {s: j for j, s in enumerate(productos)}
    matriz = np.zeros((len(clientes), len(productos)), dtype=np.float32)
    for i, c in enumerate(clientes):
        for s in por_cliente[c]:
            matriz[i, col[s]] = 1.0

    sim = cosine_similarity(matriz.T)  # producto × producto
    np.fill_diagonal(sim, 0.0)         # sin autosimilitud
    vecinos = {}
    for j, s in enumerate(productos):
        orden = np.argsort(-sim[j], kind="stable")[:n_vecinos]
        vecinos[s] = [(productos[k], round(float(sim[j, k]), 6)) for k in orden if sim[j, k] > 0]
    return {"vecinos": vecinos, "n_clientes": len(clientes), "n_productos": len(productos)}


def puntajes_cf(modelo_cf: dict, canasta: list[str]) -> dict[str, tuple[float, float]]:
    """{sku_candidato: (cf_score, cf_sim_max)} para los candidatos fuera de la canasta."""
    en_canasta = set(canasta)
    suma: dict[str, float] = defaultdict(float)
    maximo: dict[str, float] = defaultdict(float)
    for i in en_canasta:
        for j, s in modelo_cf.get("vecinos", {}).get(i, []):
            if j in en_canasta:
                continue
            suma[j] += s
            maximo[j] = max(maximo[j], s)
    return {j: (suma[j], maximo[j]) for j in suma}
