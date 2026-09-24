"""
Servicio de recomendación de FerreMax.

La lógica de recomendación está escrita como funciones puras (reciben productos,
popularidad y reglas como argumentos) para que la API en línea y la evaluación
offline usen exactamente el mismo algoritmo. En la evaluación offline se les pasa
popularidad y reglas calculadas solo con el 80 % de entrenamiento, sin fuga de
información del conjunto de prueba.
"""
import json
import re
import unicodedata
from collections import Counter

import pandas as pd
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from mlxtend.frequent_patterns import fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder

from models import Producto, Configuracion, Regla, Comprobante, DetalleComprobante

# Palabras vacías del español que no aportan a la búsqueda por necesidad
STOPWORDS = {
    "a", "al", "algo", "con", "de", "del", "el", "en", "es", "la", "las", "lo", "los",
    "mi", "mis", "para", "por", "que", "quiero", "se", "su", "sus", "un", "una", "unas",
    "unos", "y", "o", "necesito", "como", "mas", "muy", "sin", "tu", "yo", "me",
}

VERSION_ENTRENADA = "2.0"


# ---------------------------------------------------------------------------
# Utilidades de texto
# ---------------------------------------------------------------------------
def normalizar(texto: str) -> str:
    """Minúsculas y sin tildes, para comparar palabras de forma robusta."""
    texto = unicodedata.normalize("NFKD", (texto or "").lower())
    return "".join(c for c in texto if not unicodedata.combining(c))


def tokens(texto: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", normalizar(texto)) if t not in STOPWORDS and len(t) > 1]


def documento_producto(p) -> str:
    """Texto de cada producto: nombre + marca + categoría + subcategoría + uso + palabras clave (BRIEF §2)."""
    return " ".join(str(x or "") for x in (p.nombre, p.marca, p.categoria, p.subcategoria, p.uso, p.palabras_clave))


# ---------------------------------------------------------------------------
# Popularidad y reglas (se pueden calcular sobre cualquier subconjunto de comprobantes)
# ---------------------------------------------------------------------------
def popularidad_desde_transacciones(transacciones: list[list[str]]) -> dict[str, int]:
    """Ranking de popularidad (1 = más vendido) contando en cuántos comprobantes aparece cada SKU."""
    conteo = Counter(sku for t in transacciones for sku in set(t))
    ordenados = sorted(conteo.items(), key=lambda x: (-x[1], x[0]))
    return {sku: i + 1 for i, (sku, _) in enumerate(ordenados)}


def entrenar_reglas(transacciones: list[list[str]], soporte_min: float, confianza_min: float, lift_min: float) -> list[dict]:
    """FP-Growth (mlxtend) + reglas de asociación filtradas por los tres umbrales de la configuración."""
    transacciones = [sorted(set(t)) for t in transacciones if t]
    if not transacciones:
        return []
    te = TransactionEncoder()
    df = pd.DataFrame(te.fit(transacciones).transform(transacciones), columns=te.columns_)
    itemsets = fpgrowth(df, min_support=soporte_min, use_colnames=True)
    if itemsets.empty:
        return []
    reglas = association_rules(itemsets, metric="confidence", min_threshold=confianza_min)
    reglas = reglas[(reglas["lift"] >= lift_min) & (reglas["support"] >= soporte_min)]
    return [
        {
            "antecedentes": sorted(r["antecedents"]),
            "consecuentes": sorted(r["consequents"]),
            "soporte": float(r["support"]),
            "confianza": float(r["confidence"]),
            "lift": float(r["lift"]),
        }
        for _, r in reglas.iterrows()
    ]


# ---------------------------------------------------------------------------
# Algoritmos de recomendación (funciones puras)
# ---------------------------------------------------------------------------
def _por_popularidad(candidatos, popularidad):
    return sorted(candidatos, key=lambda p: (popularidad.get(p.sku, 10_000), p.sku))


def recomendar_skus(modo: str, carrito: list[str], k: int, productos: list, popularidad: dict, reglas: list[dict]) -> list[dict]:
    """
    Devuelve hasta k recomendaciones [{sku, fuente, puntaje}] para el carrito (o producto visto).
    - productos: solo activos con stock > 0 (filtro de stock, regla de negocio).
    - CONV: más vendidos de la misma categoría del carrito; luego más vendidos del resto.
    - ML: consecuentes de reglas cuyos antecedentes están en el carrito, ordenados por
      confianza × lift; si no alcanzan k, relleno por popularidad dentro de la misma
      categoría del carrito, y solo como último recurso popularidad general.
    """
    por_sku = {p.sku: p for p in productos}
    en_carrito = set(carrito)
    disponibles = [p for p in productos if p.sku not in en_carrito]
    categorias = {por_sku[s].categoria for s in carrito if s in por_sku}

    misma_cat = _por_popularidad([p for p in disponibles if p.categoria in categorias], popularidad)
    otras_cat = _por_popularidad([p for p in disponibles if p.categoria not in categorias], popularidad)

    resultado: list[dict] = []

    def agregar(lista, fuente):
        for p in lista:
            if len(resultado) >= k:
                return
            if all(r["sku"] != p.sku for r in resultado):
                resultado.append({"sku": p.sku, "fuente": fuente, "puntaje": None})

    if modo == "ML":
        puntajes: dict[str, float] = {}
        for r in reglas:
            if set(r["antecedentes"]).issubset(en_carrito):
                s = r["confianza"] * r["lift"]
                for c in r["consecuentes"]:
                    if c in por_sku and c not in en_carrito:
                        puntajes[c] = max(puntajes.get(c, 0.0), s)
        for sku, s in sorted(puntajes.items(), key=lambda x: (-x[1], x[0]))[:k]:
            resultado.append({"sku": sku, "fuente": "REGLA", "puntaje": round(s, 4)})
        agregar(misma_cat, "POPULAR_CATEGORIA")
        agregar(otras_cat, "POPULAR_GENERAL")
    else:
        agregar(misma_cat, "POPULAR_CATEGORIA")
        agregar(otras_cat, "POPULAR_GENERAL")
    return resultado[:k]


def buscar_skus(modo: str, texto: str, k: int, productos: list, popularidad: dict) -> list[dict]:
    """
    Búsqueda por necesidad [{sku, puntaje, terminos}].
    - ML: TF-IDF sobre el texto de cada producto y similitud coseno con la consulta; K más similares (> 0).
    - CONV: coincidencia literal de palabras de la consulta; empates por popularidad.
    """
    if not productos:
        return []
    consulta = tokens(texto)
    if not consulta:
        return []
    docs = [" ".join(tokens(documento_producto(p))) for p in productos]
    salida = []
    if modo == "ML":
        vec = TfidfVectorizer(token_pattern=r"[a-z0-9]+")
        matriz = vec.fit_transform(docs)
        q = vec.transform([" ".join(consulta)])
        sims = cosine_similarity(q, matriz).flatten()
        vocab = set(vec.vocabulary_)
        orden = sorted(range(len(productos)), key=lambda i: (-sims[i], popularidad.get(productos[i].sku, 10_000)))
        for i in orden:
            if sims[i] <= 0 or len(salida) >= k:
                break
            doc = set(docs[i].split())
            salida.append({
                "sku": productos[i].sku,
                "puntaje": round(float(sims[i]), 4),
                "terminos": [t for t in dict.fromkeys(consulta) if t in doc and t in vocab],
            })
    else:
        puntuados = []
        for p, doc in zip(productos, docs):
            palabras = set(doc.split())
            coinciden = [t for t in dict.fromkeys(consulta) if t in palabras]
            if coinciden:
                puntuados.append((len(coinciden), popularidad.get(p.sku, 10_000), p.sku, coinciden))
        puntuados.sort(key=lambda x: (-x[0], x[1], x[2]))
        for n, _, sku, coinciden in puntuados[:k]:
            salida.append({"sku": sku, "puntaje": float(n), "terminos": coinciden})
    return salida


# ---------------------------------------------------------------------------
# Servicio ligado a la base de datos (uso en línea desde la API)
# ---------------------------------------------------------------------------
def obtener_config(db: Session) -> Configuracion:
    config = db.query(Configuracion).first()
    if not config:
        config = Configuracion(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def reglas_vigentes(db: Session, config: Configuracion) -> list[dict]:
    """Reglas de la base que cumplen los umbrales configurados (se aplican también al recomendar)."""
    filas = db.query(Regla).filter(
        Regla.soporte >= config.soporte_min,
        Regla.confianza >= config.confianza_min,
        Regla.lift >= config.lift_min,
    ).all()
    return [
        {"antecedentes": json.loads(r.antecedentes), "consecuentes": json.loads(r.consecuentes),
         "soporte": r.soporte, "confianza": r.confianza, "lift": r.lift}
        for r in filas
    ]


class RecommenderService:
    def __init__(self, db: Session):
        self.db = db
        self.config = obtener_config(db)

    def productos_disponibles(self):
        return self.db.query(Producto).filter(Producto.activo == True, Producto.stock > 0).all()

    def popularidad(self, productos) -> dict:
        return {p.sku: p.popularidad for p in productos if p.popularidad}

    def _variante_completa(self) -> bool:
        return self.config.modo_activo == "ML" and (self.config.variante_ml or "COMPLETO") == "COMPLETO"

    def _recomendar_skus(self, canasta: list[str], k: int, productos_todos: list, disponibles: list) -> list[dict]:
        """Despacha según modo y variante: CONV, ML REGLAS o ML COMPLETO (candidatos + CF + reordenador)."""
        if self._variante_completa():
            import reordenador  # importación diferida: reordenador depende de este módulo
            art = reordenador.cargar()
            if art is not None:
                ctx = reordenador.Contexto(productos_todos, reglas_vigentes(self.db, self.config),
                                           art["modelo_cf"], art["conteos_popularidad"])
                return reordenador.recomendar_completo(ctx, art, canasta, k, self.config.peso_contenido or 1.0)
            # Sin modelo entrenado todavía: se usa la variante REGLAS
        reglas = reglas_vigentes(self.db, self.config) if self.config.modo_activo == "ML" else []
        por_sku = {p.sku: p for p in disponibles}
        vistos = [p for p in productos_todos if p.sku in set(canasta) and p.sku not in por_sku]
        return recomendar_skus(self.config.modo_activo, canasta, k, disponibles + vistos,
                               self.popularidad(disponibles), reglas)

    def buscar_necesidad(self, texto: str, k: int | None = None) -> list[dict]:
        productos = self.productos_disponibles()
        por_sku = {p.sku: p for p in productos}
        res = buscar_skus(self.config.modo_activo, texto, k or self.config.k, productos, self.popularidad(productos))
        return [{**r, "producto": por_sku[r["sku"]]} for r in res]

    def recomendar(self, skus_carrito: list[str], k: int | None = None) -> list[dict]:
        todos = self.db.query(Producto).filter(Producto.activo == True).all()
        disponibles = [p for p in todos if p.stock > 0]
        por_sku = {p.sku: p for p in disponibles}
        res = self._recomendar_skus(skus_carrito, k or self.config.k, todos, disponibles)
        # Nunca se recomienda algo sin stock (los productos de B sin stock solo aportan contexto)
        return [{**r, "producto": por_sku[r["sku"]]} for r in res if r["sku"] in por_sku]

    def historial_cliente(self, codigo: str) -> list[str]:
        filas = (self.db.query(DetalleComprobante.sku).join(Comprobante)
                 .filter(Comprobante.codigo_cliente == codigo).order_by(Comprobante.fecha).all())
        return list(dict.fromkeys(f[0] for f in filas))

    def recomendar_cliente(self, codigo: str, skus_carrito: list[str] | None = None, k: int | None = None) -> dict:
        """
        Recomendaciones para un cliente: B = historial de compras ∪ carrito actual.
        Si el cliente no tiene historial, se usa la variante REGLAS con el carrito (y popularidad).
        """
        historial = self.historial_cliente(codigo)
        carrito = list(skus_carrito or [])
        todos = self.db.query(Producto).filter(Producto.activo == True).all()
        disponibles = [p for p in todos if p.stock > 0]
        por_sku = {p.sku: p for p in disponibles}
        k = k or self.config.k
        if historial:
            B = list(dict.fromkeys(historial + carrito))
            res = self._recomendar_skus(B, k, todos, disponibles)
            base = "HISTORIAL"
        else:
            reglas = reglas_vigentes(self.db, self.config) if self.config.modo_activo == "ML" else []
            vistos = [p for p in todos if p.sku in set(carrito) and p.sku not in por_sku]
            res = recomendar_skus(self.config.modo_activo, carrito, k, disponibles + vistos,
                                  self.popularidad(disponibles), reglas)
            base = "SIN_HISTORIAL"
        excluir = set(carrito)
        filas = [{**r, "producto": por_sku[r["sku"]]} for r in res if r["sku"] in por_sku and r["sku"] not in excluir]
        return {"base": base, "historial": historial, "resultados": filas}

    def reentrenar_modelo(self) -> dict:
        comprobantes = self.db.query(Comprobante).all()
        transacciones = [[d.sku for d in c.detalles] for c in comprobantes]
        transacciones = [t for t in transacciones if t]
        if not transacciones:
            return {"status": "error", "message": "No hay comprobantes para entrenar.", "reglas_generadas": 0}
        c = self.config
        reglas = entrenar_reglas(transacciones, c.soporte_min, c.confianza_min, c.lift_min)
        self.db.query(Regla).delete()
        for r in reglas:
            self.db.add(Regla(
                antecedentes=json.dumps(r["antecedentes"]), consecuentes=json.dumps(r["consecuentes"]),
                soporte=r["soporte"], confianza=r["confianza"], lift=r["lift"], version_modelo=VERSION_ENTRENADA,
            ))
        # La popularidad también se recalcula con los comprobantes cargados
        pop = popularidad_desde_transacciones(transacciones)
        productos = self.db.query(Producto).all()
        for p in productos:
            p.popularidad = pop.get(p.sku, 999)
        self.db.commit()

        # Filtrado colaborativo + reordenador supervisado, con todos los comprobantes en orden cronológico
        import reordenador
        ordenados = sorted(comprobantes, key=lambda x: (x.fecha, x.numero))
        con_cliente = [(x.codigo_cliente, [d.sku for d in x.detalles]) for x in ordenados if x.detalles]
        ctx = reordenador.construir_contexto(productos, con_cliente, c.soporte_min, c.confianza_min, c.lift_min)
        entrenado = reordenador.entrenar_reordenador(ctx, [skus for _, skus in con_cliente])
        reordenador.guardar(entrenado, ctx.modelo_cf, reordenador.conteos_desde_transacciones(transacciones))
        return {
            "status": "success",
            "message": (f"Modelo reentrenado con {len(transacciones)} comprobantes: {len(reglas)} reglas, "
                        f"CF de {ctx.modelo_cf['n_productos']} productos y reordenador {entrenado['tipo']} "
                        f"(AP validación {entrenado['ap_validacion']})."),
            "comprobantes": len(transacciones),
            "reglas_generadas": len(reglas),
            "umbrales": {"soporte_min": c.soporte_min, "confianza_min": c.confianza_min, "lift_min": c.lift_min},
            "reordenador": reordenador.metadatos(),
        }
