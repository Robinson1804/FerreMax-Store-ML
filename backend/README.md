# Backend de FerreMax

API FastAPI del prototipo. Las instrucciones completas (instalación, demostración, protocolo de evaluación y endpoints) están en el [README de la raíz](../README.md).

Resumen rápido:

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe seed.py --reset --reentrenar   # 420 boletas, semilla 42, reglas FP-Growth
.venv\Scripts\python.exe -m uvicorn main:app --port 8000
.venv\Scripts\python.exe evaluacion_offline.py          # Capa 1 → salidas/
.venv\Scripts\python.exe verificar.py                   # checklist automático
```

La base SQLite es `backend/ferremax.db` (ruta absoluta, no depende del directorio de trabajo). Para PostgreSQL, defina `DATABASE_URL`.
