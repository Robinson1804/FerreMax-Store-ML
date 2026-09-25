"""API de FerreMax: tienda, recomendador (CONV/ML), registro de eventos, indicadores y panel."""
import os
import secrets
from contextlib import asynccontextmanager
import statistics
from datetime import datetime
from typing import List, Literal

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db, init_db
from models import (Producto, Configuracion, Regla, SesionEvaluacion, RegistroEvento, Pedido,
                    DetallePedido, Cliente)
from recommender import RecommenderService, obtener_config
import reordenador
from evaluacion_offline import run_offline_evaluation, ultimo_resumen
from autenticacion import ProteccionAdmin, credenciales_validas, emitir_token

@asynccontextmanager
async def lifespan(_app):
    init_db()
    yield


app = FastAPI(title="FerreMax API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Exige token en /api/admin/* (salvo login, verificación y lectura de configuración)
app.add_middleware(ProteccionAdmin)

TIPOS_EVENTO = ("INICIO_BUSQUEDA", "CONSULTA", "RECOM_MOSTRADA", "PRODUCTO_AGREGADO",
                "PRODUCTO_RETIRADO", "CONFIRMACION_CARRITO")
ORIGENES = ("BUSQUEDA", "CATEGORIA", "RECOMENDACION")


# ---------------------------------------------------------------------------
# Productos
# ---------------------------------------------------------------------------
class ProductoResponse(BaseModel):
    sku: str
    nombre: str
    marca: str | None = None
    categoria: str | None = None
    subcategoria: str | None = None
    unidad: str | None = None
    uso: str | None = None
    precio: float
    stock: int

    model_config = ConfigDict(from_attributes=True)


class ProductoPuntuado(ProductoResponse):
    puntaje: float | None = None
    terminos: List[str] = []
    fuente: str | None = None
    posicion: int


def _producto_dict(p: Producto) -> dict:
    return ProductoResponse.model_validate(p).model_dump()


@app.get("/api/productos", response_model=List[ProductoResponse])
def get_productos(categoria: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Producto).filter(Producto.activo == True)
    if categoria:
        q = q.filter(Producto.categoria == categoria)
    return q.order_by(Producto.popularidad, Producto.sku).all()


@app.get("/api/productos/{sku}", response_model=ProductoResponse)
def get_producto(sku: str, db: Session = Depends(get_db)):
    producto = db.query(Producto).filter(Producto.sku == sku, Producto.activo == True).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@app.get("/api/categorias")
def get_categorias(db: Session = Depends(get_db)):
    cat_dict: dict[str, set] = {}
    for cat, sub in db.query(Producto.categoria, Producto.subcategoria).filter(Producto.activo == True).distinct():
        if cat:
            cat_dict.setdefault(cat, set())
            if sub:
                cat_dict[cat].add(sub)
    return [{"categoria": c, "subcategorias": sorted(s)} for c, s in sorted(cat_dict.items())]


# ---------------------------------------------------------------------------
# Recomendador (el modo activo lo decide la tabla configuracion)
# ---------------------------------------------------------------------------
class BuscarNecesidadRequest(BaseModel):
    texto: str
    k: int | None = None


class RecomendarCarritoRequest(BaseModel):
    skus: List[str]
    k: int | None = None


class ConfiguracionRequest(BaseModel):
    modo_activo: Literal["CONV", "ML"]
    k: int
    soporte_min: float
    confianza_min: float
    lift_min: float
    peso_contenido: float
    variante_ml: Literal["REGLAS", "COMPLETO"] | None = None  # opcional: si no viene, se conserva


def _config_dict(config: Configuracion) -> dict:
    """Configuración + metadatos del reordenador entrenado (versión, fecha, n ejemplos, AP)."""
    campos = ("id", "modo_activo", "k", "soporte_min", "confianza_min", "lift_min", "peso_contenido", "variante_ml")
    return {**{c: getattr(config, c) for c in campos}, "reordenador": reordenador.metadatos()}


def _puntuados(filas: list[dict]) -> list[dict]:
    return [{**_producto_dict(f["producto"]), "puntaje": f.get("puntaje"), "terminos": f.get("terminos", []),
             "fuente": f.get("fuente"), "posicion": i + 1} for i, f in enumerate(filas)]


@app.post("/api/buscar-necesidad", response_model=List[ProductoPuntuado])
def buscar_necesidad(req: BuscarNecesidadRequest, db: Session = Depends(get_db)):
    return _puntuados(RecommenderService(db).buscar_necesidad(req.texto, req.k))


@app.get("/api/recomendar", response_model=List[ProductoPuntuado])
def recomendar_producto(sku: str, k: int | None = None, db: Session = Depends(get_db)):
    return _puntuados(RecommenderService(db).recomendar([sku], k))


@app.post("/api/recomendar/carrito", response_model=List[ProductoPuntuado])
def recomendar_carrito(req: RecomendarCarritoRequest, db: Session = Depends(get_db)):
    return _puntuados(RecommenderService(db).recomendar(req.skus, req.k))


@app.get("/api/recomendar/cliente/{codigo}")
def recomendar_cliente(codigo: str, skus: List[str] = Query(default=[]), k: int | None = None,
                       db: Session = Depends(get_db)):
    """Recomendaciones con B = historial del cliente ∪ carrito (skus). Sin historial: reglas y popularidad."""
    r = RecommenderService(db).recomendar_cliente(codigo, skus, k)
    return {"base": r["base"], "historial": r["historial"], "resultados": _puntuados(r["resultados"])}


@app.get("/api/admin/config")
def get_config(db: Session = Depends(get_db)):
    return _config_dict(obtener_config(db))


@app.put("/api/admin/config")
def update_config(req: ConfiguracionRequest, db: Session = Depends(get_db)):
    if req.k < 1 or not (0 < req.soporte_min <= 1) or not (0 <= req.confianza_min <= 1) or req.lift_min < 0:
        raise HTTPException(status_code=422, detail="Parámetros fuera de rango")
    config = obtener_config(db)
    for campo, valor in req.model_dump().items():
        if campo == "variante_ml" and valor is None:
            continue
        setattr(config, campo, valor)
    db.commit()
    db.refresh(config)
    return _config_dict(config)


@app.get("/api/admin/reglas")
def get_reglas(vigentes: bool = False, db: Session = Depends(get_db)):
    """Reglas ordenadas por confianza × lift. vigentes=true filtra por los umbrales configurados."""
    q = db.query(Regla)
    if vigentes:
        c = obtener_config(db)
        q = q.filter(Regla.soporte >= c.soporte_min, Regla.confianza >= c.confianza_min, Regla.lift >= c.lift_min)
    reglas = q.all()
    reglas.sort(key=lambda r: -(r.confianza * r.lift))
    return reglas


@app.post("/api/admin/modelo/reentrenar")
def reentrenar_modelo(db: Session = Depends(get_db)):
    return RecommenderService(db).reentrenar_modelo()


# ---------------------------------------------------------------------------
# Sesiones de evaluación y registro de eventos
# ---------------------------------------------------------------------------
class IniciarSesionRequest(BaseModel):
    id_sesion: str | None = None
    codigo_cliente: str
    escenario: str
    condicion: Literal["CONV", "ML"]
    orden: int | str


class FinalizarSesionRequest(BaseModel):
    id_sesion: str
    valida: bool = True


class EventoRequest(BaseModel):
    id_sesion: str
    codigo_cliente: str
    escenario: str | None = None
    condicion: Literal["CONV", "ML"]
    tipo_evento: str
    texto_consulta: str | None = None
    sku: str | None = None
    posicion_recom: int | None = None
    origen: str | None = None
    timestamp: int


class ConfirmarCarritoItem(BaseModel):
    sku: str
    cantidad: int
    precio: float
    origen: str


class ConfirmarCarritoRequest(BaseModel):
    id_sesion: str
    codigo_cliente: str
    escenario: str | None = None
    condicion: Literal["CONV", "ML"]
    timestamp: int
    items: List[ConfirmarCarritoItem]
    total: float
    entrega: str | None = None
    pago: str | None = None


def _sesion_dict(s: SesionEvaluacion) -> dict:
    return {"id_sesion": s.id_sesion, "codigo_cliente": s.codigo_cliente, "escenario": s.escenario,
            "condicion": s.condicion, "orden": "A" if s.orden == 1 else "B", "inicio": s.inicio, "fin": s.fin,
            "valida": s.valida}


@app.post("/api/admin/sesiones")
def iniciar_sesion(req: IniciarSesionRequest, db: Session = Depends(get_db)):
    """Inicia una sesión de evaluación y fija el modo activo del recomendador en su condición."""
    orden = str(req.orden).upper()
    orden_val = 1 if orden in ("A", "1") else 2
    # Cierra cualquier sesión abierta: solo hay una sesión activa a la vez
    for abierta in db.query(SesionEvaluacion).filter(SesionEvaluacion.fin == None).all():
        abierta.fin = datetime.utcnow()
    id_sesion = req.id_sesion or f"SES-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(2).upper()}"
    if db.get(SesionEvaluacion, id_sesion):
        raise HTTPException(status_code=409, detail="Ya existe una sesión con ese identificador")
    if not db.get(Cliente, req.codigo_cliente):
        db.add(Cliente(codigo=req.codigo_cliente, tipo="Evaluación", participa_evaluacion=True))
    else:
        db.get(Cliente, req.codigo_cliente).participa_evaluacion = True
    sesion = SesionEvaluacion(id_sesion=id_sesion, codigo_cliente=req.codigo_cliente, escenario=req.escenario,
                              condicion=req.condicion, orden=orden_val, inicio=datetime.utcnow(), valida=True)
    db.add(sesion)
    obtener_config(db).modo_activo = req.condicion
    db.commit()
    return {"message": "Sesión iniciada", "sesion": _sesion_dict(sesion)}


@app.put("/api/admin/sesiones")
def finalizar_sesion(req: FinalizarSesionRequest, db: Session = Depends(get_db)):
    sesion = db.get(SesionEvaluacion, req.id_sesion)
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    sesion.fin = sesion.fin or datetime.utcnow()
    sesion.valida = req.valida
    db.commit()
    return {"message": "Sesión finalizada", "sesion": _sesion_dict(sesion)}


@app.get("/api/admin/sesiones")
def listar_sesiones(db: Session = Depends(get_db)):
    return [_sesion_dict(s) for s in db.query(SesionEvaluacion).order_by(SesionEvaluacion.inicio.desc()).all()]


@app.get("/api/sesiones/activa")
def sesion_activa(db: Session = Depends(get_db)):
    """La tienda consulta aquí la sesión de evaluación en curso (o null si no hay)."""
    s = db.query(SesionEvaluacion).filter(SesionEvaluacion.fin == None).order_by(SesionEvaluacion.inicio.desc()).first()
    return _sesion_dict(s) if s else None


def _validar_evento(tipo: str, origen: str | None):
    if tipo not in TIPOS_EVENTO:
        raise HTTPException(status_code=422, detail=f"tipo_evento inválido: {tipo}")
    if origen is not None and origen not in ORIGENES:
        raise HTTPException(status_code=422, detail=f"origen inválido: {origen}")


@app.post("/api/eventos")
def registrar_evento(req: EventoRequest, db: Session = Depends(get_db)):
    _validar_evento(req.tipo_evento, req.origen)
    evento = RegistroEvento(**req.model_dump())
    db.add(evento)
    db.commit()
    return {"message": "Evento registrado", "id_evento": evento.id_evento}


@app.post("/api/carrito/confirmar")
def confirmar_carrito(req: ConfirmarCarritoRequest, db: Session = Depends(get_db)):
    if not req.items:
        raise HTTPException(status_code=422, detail="El carrito está vacío")
    for it in req.items:
        if it.origen not in ORIGENES:
            raise HTTPException(status_code=422, detail=f"origen inválido: {it.origen}")
    pedido = Pedido(codigo_cliente=req.codigo_cliente, entrega=req.entrega, pago=req.pago, estado="REGISTRADO",
                    total=round(sum(i.precio * i.cantidad for i in req.items), 2))
    db.add(pedido)
    db.flush()
    for item in req.items:
        db.add(DetallePedido(id_pedido=pedido.id, sku=item.sku, cantidad=item.cantidad, precio=item.precio,
                             origen=item.origen))
    db.add(RegistroEvento(id_sesion=req.id_sesion, codigo_cliente=req.codigo_cliente, escenario=req.escenario,
                          condicion=req.condicion, tipo_evento="CONFIRMACION_CARRITO", timestamp=req.timestamp))
    db.commit()
    return {"message": "Pedido confirmado", "id_pedido": pedido.id, "total": pedido.total}


@app.get("/api/admin/eventos")
def get_eventos(id_sesion: str | None = None, codigo_cliente: str | None = None, condicion: str | None = None,
                tipo_evento: str | None = None, limite: int = 5000, db: Session = Depends(get_db)):
    q = db.query(RegistroEvento)
    if id_sesion:
        q = q.filter(RegistroEvento.id_sesion == id_sesion)
    if codigo_cliente:
        q = q.filter(RegistroEvento.codigo_cliente == codigo_cliente)
    if condicion:
        q = q.filter(RegistroEvento.condicion == condicion)
    if tipo_evento:
        q = q.filter(RegistroEvento.tipo_evento == tipo_evento)
    return q.order_by(RegistroEvento.timestamp.desc(), RegistroEvento.id_evento.desc()).limit(limite).all()


# ---------------------------------------------------------------------------
# Indicadores (Capa 2: sesiones con clientes)
# ---------------------------------------------------------------------------
def resumen_estadistico(valores: list[float]) -> dict:
    """n, media, mediana y desviación estándar muestral (n − 1)."""
    v = [x for x in valores if x is not None]
    if not v:
        return {"n": 0, "media": None, "mediana": None, "de": None, "min": None, "max": None}
    return {"n": len(v), "media": round(statistics.mean(v), 4), "mediana": round(statistics.median(v), 4),
            "de": round(statistics.stdev(v), 4) if len(v) > 1 else None, "min": min(v), "max": max(v)}


def indicadores_sesion(evs: list[RegistroEvento], k: int = 5) -> dict:
    """
    Calcula los indicadores de una sesión a partir de sus eventos (ordenados por tiempo).
    - Tiempo de selección = t(CONFIRMACION_CARRITO) − t(primer INICIO_BUSQUEDA), en segundos.
    - Una "lista mostrada" es el conjunto de eventos RECOM_MOSTRADA con la misma marca de tiempo.
    - Carrito final = productos agregados (cualquier origen) menos retirados, al momento de confirmar.
    - Precision@5 de sesión = promedio, sobre las listas "con oportunidad de aceptación" (mostradas
      antes del último PRODUCTO_AGREGADO de la sesión), de
      |productos de la lista presentes en el carrito final| / 5   (Rel = productos agregados, Tabla 2).
      Las listas mostradas después de la última adición se excluyen y se reportan como auxiliar.
    - Auxiliares: listas mostradas, listas sin oportunidad, aceptadas totales (origen RECOMENDACION y
      presentes al confirmar) y aceptadas de la última lista mostrada.
    """
    t_inicio = next((e.timestamp for e in evs if e.tipo_evento == "INICIO_BUSQUEDA"), None)
    t_conf = next((e.timestamp for e in evs if e.tipo_evento == "CONFIRMACION_CARRITO"
                   and (t_inicio is None or e.timestamp >= t_inicio)), None)
    hasta = t_conf if t_conf is not None else float("inf")

    listas: dict[int, set] = {}
    netos: dict[str, int] = {}          # unidades netas en el carrito por SKU (cualquier origen)
    desde_recom: set[str] = set()       # SKUs agregados alguna vez con origen RECOMENDACION
    t_ultima_adicion = None
    for e in evs:
        if e.timestamp > hasta:
            break
        if e.tipo_evento == "RECOM_MOSTRADA" and e.sku:
            listas.setdefault(e.timestamp, set()).add(e.sku)
        elif e.tipo_evento == "PRODUCTO_AGREGADO" and e.sku:
            netos[e.sku] = netos.get(e.sku, 0) + 1
            t_ultima_adicion = e.timestamp
            if e.origen == "RECOMENDACION":
                desde_recom.add(e.sku)
        elif e.tipo_evento == "PRODUCTO_RETIRADO" and e.sku in netos:
            netos[e.sku] = max(0, netos[e.sku] - 1)

    carrito_final = {s for s, n in netos.items() if n > 0}
    ultima = listas[max(listas)] if listas else set()
    completa = t_inicio is not None and t_conf is not None
    con_oportunidad = {ts: s for ts, s in listas.items() if t_ultima_adicion is not None and ts < t_ultima_adicion}
    p5_listas = [len(skus & carrito_final) / k for skus in con_oportunidad.values()]
    return {
        "tiempo_s": round((t_conf - t_inicio) / 1000.0, 3) if completa else None,
        "listas_mostradas": len(listas),
        "listas_con_oportunidad": len(con_oportunidad),
        "listas_sin_oportunidad": len(listas) - len(con_oportunidad),
        "recs_mostradas": sum(len(s) for s in listas.values()),
        "recs_aceptadas": len(desde_recom & carrito_final),
        "recs_aceptadas_ultima_lista": len(ultima & carrito_final & desde_recom),
        # Sin listas con oportunidad la precisión no está definida (None, queda fuera de los agregados)
        "precision_5": round(statistics.mean(p5_listas), 4) if completa and p5_listas else None,
        "completa": completa,
    }


@app.get("/api/admin/indicadores")
def get_indicadores(db: Session = Depends(get_db)):
    sesiones = db.query(SesionEvaluacion).order_by(SesionEvaluacion.inicio).all()
    eventos = db.query(RegistroEvento).order_by(RegistroEvento.timestamp, RegistroEvento.id_evento).all()
    por_sesion: dict[str, list] = {}
    for ev in eventos:
        por_sesion.setdefault(ev.id_sesion, []).append(ev)

    resultados: dict[str, list] = {"CONV": [], "ML": []}
    for s in sesiones:
        if s.condicion not in resultados:
            continue
        ind = indicadores_sesion(por_sesion.get(s.id_sesion, []))
        resultados[s.condicion].append({**_sesion_dict(s), **ind})

    agregados = {}
    for cond, filas in resultados.items():
        validas = [f for f in filas if f["valida"] and f["completa"]]
        agregados[cond] = {
            "sesiones_registradas": len(filas),
            "sesiones_validas_completas": len(validas),
            "tiempo_seleccion_s": resumen_estadistico([f["tiempo_s"] for f in validas]),
            "precision_5": resumen_estadistico([f["precision_5"] for f in validas]),
            "recs_aceptadas": resumen_estadistico([f["recs_aceptadas"] for f in validas]),
        }
    return {"por_sesion": resultados, "agregados": agregados}


# ---------------------------------------------------------------------------
# Autenticación simple del panel
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/admin/login")
def admin_login(req: LoginRequest):
    if credenciales_validas(req.username, req.password):
        return {"token": emitir_token(req.username), "role": "admin"}
    raise HTTPException(status_code=401, detail="Credenciales inválidas")


@app.get("/api/admin/verificar")
def verificar_token():
    """El token viaja en la cabecera Authorization; si llega aquí, el middleware ya lo validó."""
    return {"valid": True}


@app.get("/api/admin/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    return {
        "productos_bajo_stock": db.query(Producto).filter(Producto.stock <= Producto.stock_minimo).all(),
        "pedidos": db.query(Pedido).order_by(Pedido.fecha.desc()).all(),
        "clientes": db.query(Cliente).order_by(Cliente.codigo).all(),
    }


# ---------------------------------------------------------------------------
# Evaluación offline (Capa 1)
# ---------------------------------------------------------------------------
@app.post("/api/admin/evaluacion-offline")
def run_evaluacion_offline(db: Session = Depends(get_db)):
    return run_offline_evaluation(db)


@app.get("/api/admin/evaluacion-offline")
def get_evaluacion_offline():
    """Último resumen guardado en backend/salidas/ (o null si aún no se ha corrido)."""
    return ultimo_resumen()


@app.get("/")
def read_root():
    return {"message": "API FerreMax corriendo correctamente."}
