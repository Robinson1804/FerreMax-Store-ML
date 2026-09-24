from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Producto(Base):
    __tablename__ = 'productos'
    sku = Column(String, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    marca = Column(String)
    categoria = Column(String)
    subcategoria = Column(String)
    unidad = Column(String)
    uso = Column(String)
    palabras_clave = Column(String)
    precio = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    stock_minimo = Column(Integer, default=5)
    activo = Column(Boolean, default=True)
    popularidad = Column(Integer, default=0) # 1 = más popular

class Cliente(Base):
    __tablename__ = 'clientes'
    codigo = Column(String, primary_key=True, index=True)
    tipo = Column(String)
    primera_compra = Column(DateTime)
    participa_evaluacion = Column(Boolean, default=False)

class Comprobante(Base):
    __tablename__ = 'comprobantes'
    numero = Column(String, primary_key=True, index=True)
    fecha = Column(DateTime)
    codigo_cliente = Column(String, ForeignKey('clientes.codigo'))
    canal = Column(String)
    total = Column(Float)
    
    detalles = relationship("DetalleComprobante", back_populates="comprobante")

class DetalleComprobante(Base):
    __tablename__ = 'detalle_comprobante'
    id = Column(Integer, primary_key=True, autoincrement=True)
    numero = Column(String, ForeignKey('comprobantes.numero'))
    sku = Column(String, ForeignKey('productos.sku'))
    cantidad = Column(Integer)
    precio_unitario = Column(Float)
    
    comprobante = relationship("Comprobante", back_populates="detalles")

class Pedido(Base):
    __tablename__ = 'pedidos'
    id = Column(Integer, primary_key=True, autoincrement=True)
    fecha = Column(DateTime, default=datetime.utcnow)
    codigo_cliente = Column(String, ForeignKey('clientes.codigo'))
    entrega = Column(String)
    pago = Column(String)
    estado = Column(String)
    total = Column(Float)

class DetallePedido(Base):
    __tablename__ = 'detalle_pedido'
    id = Column(Integer, primary_key=True, autoincrement=True)
    id_pedido = Column(Integer, ForeignKey('pedidos.id'))
    sku = Column(String, ForeignKey('productos.sku'))
    cantidad = Column(Integer)
    precio = Column(Float)
    origen = Column(String)

class Regla(Base):
    __tablename__ = 'reglas'
    id = Column(Integer, primary_key=True, autoincrement=True)
    antecedentes = Column(String) # JSON list as string or comma separated
    consecuentes = Column(String) # JSON list as string or comma separated
    soporte = Column(Float)
    confianza = Column(Float)
    lift = Column(Float)
    version_modelo = Column(String)

class SesionEvaluacion(Base):
    __tablename__ = 'sesiones_evaluacion'
    id_sesion = Column(String, primary_key=True, index=True)
    codigo_cliente = Column(String, ForeignKey('clientes.codigo'))
    escenario = Column(String)
    condicion = Column(String) # CONV o ML
    orden = Column(Integer)
    inicio = Column(DateTime)
    fin = Column(DateTime, nullable=True)
    valida = Column(Boolean, default=True)

class RegistroEvento(Base):
    __tablename__ = 'registro_eventos'
    id_evento = Column(Integer, primary_key=True, autoincrement=True)
    id_sesion = Column(String, index=True)
    codigo_cliente = Column(String, index=True)
    escenario = Column(String)
    condicion = Column(String) # CONV o ML
    tipo_evento = Column(String)
    texto_consulta = Column(String, nullable=True)
    sku = Column(String, nullable=True)
    posicion_recom = Column(Integer, nullable=True)
    origen = Column(String, nullable=True) # BUSQUEDA, CATEGORIA, RECOMENDACION
    timestamp = Column(Integer) # milisegundos

class Configuracion(Base):
    __tablename__ = 'configuracion'
    id = Column(Integer, primary_key=True, default=1)
    modo_activo = Column(String, default="CONV") # CONV o ML
    k = Column(Integer, default=5)
    soporte_min = Column(Float, default=0.01)
    confianza_min = Column(Float, default=0.15)
    lift_min = Column(Float, default=1.2)
    peso_contenido = Column(Float, default=1.0)  # multiplicador de similitud_contenido en el reordenador
    variante_ml = Column(String, default="COMPLETO")  # REGLAS | COMPLETO (candidatos + CF + reordenador)
