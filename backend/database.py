import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Ruta absoluta a la base SQLite, para que no dependa del directorio desde donde se lance el servidor
_RUTA_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ferremax.db").replace("\\", "/")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_RUTA_DB}")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Migración mínima: columnas agregadas después de la primera versión de la base
    from sqlalchemy import inspect, text
    columnas = {c["name"] for c in inspect(engine).get_columns("configuracion")}
    if "variante_ml" not in columnas:
        with engine.begin() as con:
            con.execute(text("ALTER TABLE configuracion ADD COLUMN variante_ml VARCHAR DEFAULT 'COMPLETO'"))
            con.execute(text("UPDATE configuracion SET variante_ml = 'COMPLETO' WHERE variante_ml IS NULL"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
