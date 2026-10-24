"""
Prueba de la búsqueda por necesidad con los 8 escenarios del Anexo 7 (enunciado tal como se entrega al
cliente) y consultas de control, en ambos modos (CONV y ML), con las palabras clave originales del
catálogo real y con las enriquecidas (datos/kw_enriquecidas.json).

Aciertos = productos esperados (que existen en el catálogo real) presentes en los 5 resultados.
Uso:  python escenarios_busqueda.py      (requiere datos/datos_empresa_2026.json)
"""
import json
import os
import sys
from types import SimpleNamespace

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from recommender import buscar_skus, popularidad_desde_transacciones  # noqa: E402
from seed import RUTAS, combinar_kw, kw_enriquecidas  # noqa: E402

# Enunciados del Anexo 7 y productos esperados disponibles en el catálogo real
# (rodillo, brocha, bandeja, lija, thinner, nivel y caja rectangular no existen en el catálogo real)
ESCENARIOS = [
    ("ESC-01", "Necesitas pintar las paredes de un dormitorio de 12 m² que ya está empastado.", {"PIN-001", "PIN-002", "FER-003"}),
    ("ESC-02", "Vas a pintar una reja de fierro que tiene óxido.", {"PIN-003", "PIN-004"}),
    ("ESC-03", "Debes instalar el punto de agua de un lavatorio nuevo en el baño.", {"TUB-001", "ACC-001", "ACC-002", "VAL-001", "ACC-004", "VAL-002"}),
    ("ESC-04", "Tienes que cambiar un tomacorriente y agregar uno nuevo en la misma pared.", {"ELE-005", "ELE-001", "ELE-007"}),
    ("ESC-05", "Vas a colgar tres repisas de madera en una pared de ladrillo.", {"FER-005", "FER-004", "FER-006"}),
    ("ESC-06", "Necesitas armar un encofrado pequeño para un sardinel.", {"CLO-001", "CLO-002", "HER-001", "ALA-001"}),
    ("ESC-07", "Vas a vaciar una losa pequeña de 2 m² para una base.", {"CON-001", "FIE-001", "ALA-001"}),
    ("ESC-08", "Debes impermeabilizar un sobrecimiento antes de asentar ladrillo.", {"CON-004", "CON-003"}),
    ("CTRL-1", "pintar un dormitorio", {"PIN-001", "PIN-002", "PIN-007", "FER-003"}),
    ("CTRL-2", "instalar un punto de agua", {"TUB-001", "ACC-001", "ACC-002", "VAL-001", "ACC-004", "VAL-002"}),
    ("CTRL-3", "colocar cerámica", {"CON-002", "CON-003", "HER-007"}),
]


def catalogo(enriquecido: bool):
    with open(RUTAS["empresa"], encoding="utf-8") as f:
        d = json.load(f)
    extra = kw_enriquecidas() if enriquecido else {}
    pop = popularidad_desde_transacciones([[i["sku"] for i in b["items"]] for b in d["boletas"]])
    prods = [SimpleNamespace(sku=p["sku"], nombre=p["nombre"], marca=p.get("marca", ""), categoria=p.get("cat", ""),
                             subcategoria=p.get("sub", ""), uso=p.get("uso", ""),
                             palabras_clave=combinar_kw(p.get("kw", ""), extra.get(p["sku"], [])),
                             activo=True, stock=p["stock"])
             for p in d["productos"] if p["stock"] > 0]  # la tienda no muestra productos sin stock
    return prods, pop


def evaluar():
    filas = []
    for enriquecido in (False, True):
        prods, pop = catalogo(enriquecido)
        for modo in ("CONV", "ML"):
            for cod, texto, esperados in ESCENARIOS:
                res = buscar_skus(modo, texto, 5, prods, pop)
                top = [r["sku"] for r in res]
                filas.append({"kw": "enriquecidas" if enriquecido else "originales", "modo": modo, "escenario": cod,
                              "n_resultados": len(top), "aciertos": len(set(top) & esperados),
                              "posibles": min(5, len(esperados)), "top5": top})
    return filas


if __name__ == "__main__":
    filas = evaluar()
    for kw in ("originales", "enriquecidas"):
        for modo in ("CONV", "ML"):
            sub = [f for f in filas if f["kw"] == kw and f["modo"] == modo]
            vacias = sum(1 for f in sub if f["n_resultados"] == 0)
            ac, pos = sum(f["aciertos"] for f in sub), sum(f["posibles"] for f in sub)
            print(f"{kw:12s} {modo:4s} aciertos {ac}/{pos}  consultas sin resultados {vacias}/{len(sub)}")
    print()
    for f in filas:
        if f["kw"] == "enriquecidas":
            print(f'{f["modo"]:4s} {f["escenario"]}: {f["aciertos"]}/{f["posibles"]}  {f["top5"]}')
    os.makedirs(os.path.join(AQUI, "salidas"), exist_ok=True)
    with open(os.path.join(AQUI, "salidas", "escenarios_busqueda.json"), "w", encoding="utf-8") as f:
        json.dump(filas, f, ensure_ascii=False, indent=1)
