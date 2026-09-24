# FerreMax · Sistema web con recomendador híbrido (prototipo de tesis)

Prototipo de la tesis *Sistema web basado en Machine Learning para mejorar la recomendación de productos en una empresa comercializadora de artículos de ferretería, 2026* (UPN). Es una tienda web de ferretería cuyo recomendador funciona en dos modos conmutables desde el panel de administración, para medir los mismos indicadores con cada uno:

- **Convencional (CONV, O1):** más vendidos de la misma categoría del producto o del carrito; luego más vendidos del resto. Búsqueda por coincidencia literal de palabras.
- **Machine Learning (ML, O2):**
  - *Búsqueda por necesidad:* TF-IDF (scikit-learn) sobre nombre, marca, categoría, subcategoría, uso y palabras clave; similitud coseno; K = 5.
  - *Complementarios:* reglas de asociación FP-Growth (mlxtend) sobre los comprobantes; consecuentes ordenados por confianza × lift; si no alcanzan K, relleno por popularidad **dentro de la misma categoría**.
- Nunca se recomiendan productos con stock 0.

> **Datos simulados.** Los 62 productos, 420 boletas y clientes vienen de `datos/datos_simulados_prototipo.json`; no son datos reales de la empresa.

## Demostración en dos comandos (Windows, PowerShell)

```powershell
cd "E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App"
powershell -ExecutionPolicy Bypass -File .\demo.ps1 -Resembrar -Evaluar
```

Deja corriendo el backend en http://localhost:8000 (documentación en `/docs`) y la tienda en http://localhost:5173. Panel: http://localhost:5173/admin/login con **admin / admin123** (se cambian con las variables de entorno `ADMIN_USER` y `ADMIN_PASS`).

- `-Resembrar`: borra la base, siembra las 420 boletas (determinista, semilla 42) y reentrena las reglas con los umbrales de `configuracion`.
- `-Evaluar`: corre además la evaluación offline y deja el CSV en `backend/salidas/`.
- `.\demo.ps1 -Detener`: detiene los servidores de los puertos 8000 y 5173 (usa `netstat` + `taskkill`; en Windows no existe `pkill`).

En Git Bash, Linux o Mac: `./demo.sh --resembrar`.

## Arquitectura

```
backend/   Python + FastAPI + SQLAlchemy (SQLite por defecto; PostgreSQL con DATABASE_URL)
  main.py               API REST (tienda, recomendador, eventos, indicadores, panel)
  recommender.py        algoritmos CONV y ML como funciones puras + servicio ligado a la BD
  evaluacion_offline.py Capa 1: partición temporal 80/20, Precision@5 y Recall@5
  seed.py               siembra determinista desde datos/datos_simulados_prototipo.json
  verificar.py          comprobación automática del checklist (sobre una copia de la BD)
  salidas/              CSV y resumen JSON de la evaluación offline
frontend/  React + Vite + Tailwind v4 con el tema exportado de Google Stitch
  src/lib/api.js        cliente HTTP (URL del backend en VITE_API_URL, archivo .env)
  src/lib/tienda.jsx    sesión de evaluación activa, carrito y emisor único de eventos
  src/pages/            tienda: Inicio, Búsqueda, Detalle, Carrito, Confirmar, Pedido registrado, Mi cuenta, Login
  src/pages/admin/      panel: Recomendador, Evaluación, Resumen, Inventario, Pedidos, Clientes, Eventos, Configuración
diseno_stitch/  HTML de referencia visual exportado desde Stitch
```

## Instalación manual

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe seed.py --reset --reentrenar
.venv\Scripts\python.exe -m uvicorn main:app --port 8000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
npm run build          # compilación de producción en frontend/dist
```

## Protocolo de una sesión de evaluación (Capa 2)

1. En **Panel → Recomendador**, inicie una sesión: código de cliente anónimo `CLI-###`, escenario `ESC-01`…`ESC-08`, condición CONV o ML y orden A/B. Al iniciarla, el modo activo del recomendador pasa a la condición de la sesión.
2. El participante usa la tienda. Cada acción queda en `registro_eventos` con marca de tiempo en milisegundos:
   `INICIO_BUSQUEDA` (primera interacción), `CONSULTA`, `RECOM_MOSTRADA` (una lista = sus 5 productos con la misma marca de tiempo), `PRODUCTO_AGREGADO` / `PRODUCTO_RETIRADO` (con origen `BUSQUEDA`, `CATEGORIA` o `RECOMENDACION` y la posición en la lista) y `CONFIRMACION_CARRITO` (al realizar el pedido).
3. Finalice la sesión como válida o inválida. **Panel → Evaluación** muestra los resultados por condición (n, media, mediana y desviación estándar muestral):
   - Tiempo de selección (s) = CONFIRMACION_CARRITO − primer INICIO_BUSQUEDA.
   - Precision@5 de sesión = promedio, sobre las listas con oportunidad de aceptación (mostradas antes del último PRODUCTO_AGREGADO), de |productos de la lista presentes en el carrito al confirmar| / 5. Las listas posteriores a la última adición se excluyen y se informan como `listas_sin_oportunidad`.

**Panel → Registro de eventos** filtra y exporta a CSV los once campos.

## Evaluación offline (Capa 1)

```bash
cd backend
.venv\Scripts\python.exe evaluacion_offline.py
# o: POST http://localhost:8000/api/admin/evaluacion-offline  (botón en Panel → Evaluación)
```

1. Ordena los comprobantes por fecha y reserva el 20 % más reciente como conjunto de prueba.
2. Calcula la popularidad y las reglas FP-Growth **solo con el 80 % de entrenamiento**, para que no haya fuga de información.
3. En cada comprobante de prueba con 2 o más productos oculta uno al azar (semilla 42) y genera 5 recomendaciones con cada modo, usando la misma función que la API.
4. Calcula Precision@5 = aciertos / 5 y Recall@5 = aciertos / 1.

Salidas:
- `backend/salidas/evaluacion_offline.csv`: una fila por comprobante y modo.
- `backend/salidas/evaluacion_offline_resumen.json`: la ficha de la corrida y n, media, mediana y DE por modo.

## Verificación

```bash
cd backend && .venv\Scripts\python.exe verificar.py
```

Comprueba, sobre una copia temporal de la base:
- las 420 boletas y los 11 campos del registro de eventos;
- los umbrales de las reglas;
- que CONV y ML den resultados distintos;
- que las recomendaciones sean coherentes (pintura → brocha; tubo PVC → codo, teflón);
- el orden por coseno;
- el cálculo de indicadores en una sesión de resultado conocido.

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/productos[?categoria=]`, `/api/productos/{sku}`, `/api/categorias` | catálogo |
| POST | `/api/buscar-necesidad {texto, k}` | búsqueda según el modo activo; devuelve puntaje y términos coincidentes |
| GET/POST | `/api/recomendar?sku=`, `/api/recomendar/carrito {skus}` | K recomendaciones según el modo activo |
| POST | `/api/carrito/confirmar` | crea el pedido y registra CONFIRMACION_CARRITO |
| POST | `/api/eventos` | registra un evento (valida tipo y origen) |
| GET | `/api/sesiones/activa` | sesión de evaluación en curso (la usa la tienda) |
| GET/PUT | `/api/admin/config` | modo activo y parámetros (PUT con los seis campos) |
| POST | `/api/admin/modelo/reentrenar` | FP-Growth con los umbrales configurados |
| GET | `/api/admin/reglas[?vigentes=true]` | reglas ordenadas por confianza × lift |
| POST/PUT/GET | `/api/admin/sesiones` | iniciar, finalizar o listar sesiones de evaluación |
| GET | `/api/admin/eventos?id_sesion=&codigo_cliente=&condicion=&tipo_evento=` | registro de eventos |
| GET | `/api/admin/indicadores` | indicadores por sesión y agregados por condición |
| POST/GET | `/api/admin/evaluacion-offline` | corre la Capa 1 o devuelve el último resumen |

## Pendientes conocidos

- Los endpoints `/api/admin/*` no validan el token en el backend; solo el frontend protege las rutas del panel.
- Las pantallas de panel Resumen, Inventario, Pedidos, Clientes, Eventos y Configuración son funcionales pero no reproducen fielmente su diseño de Stitch (sí lo hacen Recomendador y Evaluación, además de toda la tienda).
- El parámetro `peso_contenido` se guarda y se muestra, pero ningún algoritmo lo usa todavía.
