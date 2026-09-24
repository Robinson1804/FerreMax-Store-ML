# Informe de supervisión · FerreMax_App

**Fecha:** 24/09/2026 · **Supervisión técnica:** equipo de desarrollo · **Constructor:** Antigravity CLI (gemini-3.1-pro-high), 7 etapas vía `.agents/driver.sh`

## 1. Resumen

El driver terminó las 7 etapas a las 17:40 con exit 0 en todas. La verificación independiente encontró que **el backend cumplía a medias y el frontend no cumplía**:
- **Tailwind no estaba importado**, así que la tienda se veía sin estilos.
- **Los datos del API se pedían pero no se mostraban.**
- **La tienda solo emitía 1 de los 6 tipos de evento.**
- **La evaluación offline tenía fuga de información.**

Todo se corrigió y se verificó con pruebas automáticas y con dos sesiones completas recorridas en un navegador real (Chrome headless vía Playwright), una por condición.

**Estado final:**
- `backend/verificar.py`: 15/15 comprobaciones OK.
- `npm run build`: sin errores.
- `demo.ps1`: funciona de punta a punta.
- Base resembrada y limpia, sin sesiones de prueba.

## 2. Verificación por etapa (lo que entregó Antigravity)

| Etapa | Resultado del agente | Hallazgos de la verificación |
|---|---|---|
| 1 Backend | Cumple parcial | `.venv` y API OK. Sembró solo **60 boletas**, con fechas y clientes aleatorios sin semilla. La ruta de SQLite dependía del directorio de trabajo. |
| 2 Recomendador | Cumple parcial | Los modos difieren, pero: **5734 reglas** (umbrales no aplicados al recomendar); ML con PIN-001 devolvía **foco LED y tubo PVC**; la búsqueda ML **perdía el orden por coseno** y no devolvía puntaje ni términos. |
| 3 Eventos | Cumple parcial | Los 11 campos son exactos. "Aceptadas" no se restringía a una lista y P@5 podía pasar de 1. Faltaban filtros por cliente y tipo. No validaba tipos ni orígenes. |
| 4 Tienda | **No cumple** | Tailwind sin importar (ninguna clase de Stitch se aplicaba). Productos y precios estáticos del diseño. Solo se emitía `INICIO_BUSQUEDA` con sesión fija `SES-FRONT`. Ningún botón llamaba a confirmar. "Modo: Machine Learning" fijo en 6 páginas. "Datos simulados" en una barra de desarrollo. |
| 5 Panel | Cumple parcial | Todos los números venían de endpoints, pero sin diseño de Stitch, sin finalizar sesión, sin reentrenar ni evaluación offline, y con un CSV de eventos incompleto. |
| 6 Offline | Cumple parcial | Fórmulas correctas, pero **fuga**: popularidad calculada con las 420 boletas, incluido el 20 % de prueba. Lógica duplicada, CSV en ruta relativa y solo medias. |
| 7 README/demo | Cumple parcial | El `demo.ps1` bloqueaba con `Read-Host` y usaba el puerto 4173; quedó la carpeta sobrante `frontend-react/`. |

Antigravity no se colgó en esta corrida (el monitor de más de 15 min sin actividad no disparó).

## 3. Correcciones realizadas

### Backend
- **`recommender.py` reescrito como funciones puras** (`recomendar_skus`, `buscar_skus`, `entrenar_reglas`, `popularidad_desde_transacciones`). La API y la evaluación offline usan exactamente el mismo algoritmo.
- **Umbrales aplicados de verdad:** al entrenar (soporte, confianza y lift) y también al recomendar (`reglas_vigentes`). Valores por defecto: `soporte_min 0.01`, `confianza_min 0.15`, `lift_min 1.2`. Con las 420 boletas se generan **557 reglas**, antes 5734.
- **Relleno ML por popularidad de la misma categoría** del carrito; la popularidad general queda solo como último recurso. Cada recomendación indica su `fuente` (`REGLA`, `POPULAR_CATEGORIA` o `POPULAR_GENERAL`).
- **Búsqueda por necesidad:**
  - ML ordena por coseno TF-IDF;
  - normaliza tildes y quita palabras vacías;
  - devuelve `puntaje` y `terminos` coincidentes;
  - CONV cuenta palabras coincidentes.
- **`seed.py` determinista (semilla 42):**
  - 420 boletas con fechas crecientes entre el 02/01 y el 30/06/2026;
  - 139 clientes anónimos `CLI-###`;
  - popularidad calculada desde las boletas;
  - opciones `--reset` y `--reentrenar`.
- **Indicadores (`GET /api/admin/indicadores`)** con la definición acordada con la sesión principal:
  - Tiempo de selección = `CONFIRMACION_CARRITO` − primer `INICIO_BUSQUEDA`.
  - Precision@5 de sesión = promedio, sobre las listas **con oportunidad de aceptación** (mostradas antes del último `PRODUCTO_AGREGADO` de la sesión), de |lista ∩ carrito al confirmar| / 5. Una lista son los `RECOM_MOSTRADA` con la misma marca de tiempo. Las listas mostradas después de la última adición se excluyen del promedio (ajuste pedido por la sesión principal después de la primera entrega).
  - Datos auxiliares: listas mostradas, listas sin oportunidad, aceptadas totales y aceptadas de la última lista.
  - Agregados por condición: n, media, mediana y DE muestral (n−1); solo sesiones válidas y completas.
- **Sesiones:**
  - al iniciar una sesión, `modo_activo` se fija igual a su condición y se cierra cualquier sesión abierta;
  - nuevos `GET /api/sesiones/activa` (lo usa la tienda) y `GET /api/admin/sesiones`;
  - se puede finalizar marcando la sesión como válida o inválida.
- **Eventos:** se validan `tipo_evento`, `origen` y `condicion`; el filtro de `/api/admin/eventos` acepta sesión, cliente, condición y tipo.
- **Evaluación offline:**
  - popularidad y reglas se calculan **solo con el 80 %**; las reglas guardadas en la base no se usan;
  - usa `recomendar_skus`;
  - CSV y resumen JSON en `backend/salidas/` con ruta absoluta;
  - n, media, mediana y DE por modo;
  - la ficha registra fecha, semilla, tamaños y periodos;
  - `GET` devuelve el último resumen.
- **Otros:** ruta absoluta de SQLite, `requirements.txt` con versiones fijas, `lifespan` en lugar de `on_event`, y nuevo `verificar.py` (checklist automático sobre una copia de la base).

### Frontend
- **Estilos:** `index.css` con `@import "tailwindcss"` y un `@theme` generado desde el `tailwind.config` de las 16 pantallas de Stitch (`.agents/gen_theme.py`). Se agregaron las fuentes Inter y Material Symbols en `index.html` y se quitó el CSS de plantilla de Vite.
- **`src/lib/api.js`:** URL del backend en una sola variable, `VITE_API_URL` (`.env`).
- **`src/lib/tienda.jsx`:** emisor único de eventos, con sesión y condición tomadas de la sesión activa y del modo real.
  - `INICIO_BUSQUEDA`: una vez por sesión, en la primera interacción (clic o tecla), y no se repite al recargar.
  - `CONSULTA`: una por consulta enviada.
  - `RECOM_MOSTRADA`: solo cuando cambia el contenido de una lista.
  - `PRODUCTO_AGREGADO` y `PRODUCTO_RETIRADO`: con origen y posición.
  - `CONFIRMACION_CARRITO`: lo registra el backend al confirmar.
  - También guarda el carrito en el navegador.
- **Las 8 páginas de la tienda** están conectadas al API sin perder el diseño de Stitch: resultados reales con puntaje y términos, bloques de recomendación, carrito, confirmación con botón real y pedido registrado.
- **Números inventados eliminados:** estrellas y reseñas, descuentos, envío de S/ 12, "Confianza ML 89.4 %", y el nombre y DNI de ejemplo.
- **Etiqueta de modo:** `<EtiquetaModo />` en todas las páginas.
- **Pie "Datos simulados":** en todas las páginas.
- **Panel:**
  - Recomendador (05) y Evaluación (06) reproducen fielmente el diseño.
  - Recomendador incluye: conmutador de modo, iniciar y finalizar sesión (escenario, orden A/B), sesiones recientes, las 557 reglas vigentes con nombres y reentrenamiento.
  - Evaluación muestra dos bloques, sesiones (Capa 2) y offline (Capa 1), con la ficha de la corrida.
  - Las demás páginas del panel usan un layout común.
  - El CSV de eventos lleva los 11 campos.
- **`demo.ps1`:**
  - no bloquea;
  - usa los puertos 8000 y 5173;
  - acepta `-Resembrar`, `-Evaluar` y `-Detener` (`netstat` + `taskkill`, porque `pkill` no existe en este entorno);
  - espera a que ambos servidores respondan.
- **Limpieza:** `demo.sh` actualizado. Movidos a `.agents/respaldo/`: la carpeta sobrante `frontend-react/`, los archivos de plantilla, `test_stage3.py`, la base anterior (`ferremax_antes_resiembra.db`) y el CSV del agente.

## 4. Resultados reales de la evaluación offline (Capa 1) · versión 1 (dos modos)

> Sustituida por la sección 8 (tres modos). Las filas CONV y ML (= ML_REGLAS) se reproducen idénticas en la versión 2.

**Ficha de la corrida:**
- Corrida: 2026-09-24 18:05:13. Reproducible: la corrida de las 17:45 dio los mismos valores.
- Datos: 420 comprobantes en partición temporal 80/20.
  - Entrenamiento: 336 (02/01–25/05/2026).
  - Prueba: 84 (25/05–30/06/2026), de los cuales **80 son evaluables** (2 o más productos).
- Parámetros: semilla 42, K = 5.
- Umbrales: soporte ≥ 0.01, confianza ≥ 0.15, lift ≥ 1.2; **566 reglas** entrenadas con el 80 %.

| Modo | n | Precision@5 media / mediana / DE | Recall@5 media / mediana / DE | Aciertos |
|---|---|---|---|---|
| CONV | 80 | 0.1025 / 0.2000 / 0.1006 | 0.5125 / 1.0000 / 0.5030 | 41 |
| ML | 80 | **0.1325** / 0.2000 / 0.0952 | **0.6625** / 1.0000 / 0.4758 | 53 |

- **Tabla pareada por comprobante:** ambos aciertan 37 · solo ML 16 · solo CONV 4 · ninguno 23. **McNemar exacto p = 0.0118.**
- **Comparación con el JSON:** el campo `eval` del JSON (recall_conv 0.212, recall_ml 0.70) usaba otra definición de CONV (popularidad global). Aquí CONV es "más vendidos de la misma categoría", como indica el BRIEF §2, y por eso resulta más fuerte.
- **Archivos:** `backend/salidas/evaluacion_offline.csv` (160 filas: comprobante, fecha, modo, canasta visible, producto oculto, top 5, acierto, precision5, recall5) y `backend/salidas/evaluacion_offline_resumen.json`.

## 5. Verificaciones ejecutadas

- **`backend/verificar.py`:** 15/15 OK en la versión 1; 28/28 en la versión 2 (sección 8).
  - 420 comprobantes y los 11 campos exactos.
  - 557 reglas que cumplen los umbrales.
  - Búsqueda y carrito distintos entre CONV y ML.
  - ML pintura (PIN-001) → brocha, lija, pasta, imprimante, bandeja: sin foco LED ni tubo.
  - ML tubo PVC → teflón, válvula, tee, codo, pegamento.
  - Búsqueda ordenada por coseno.
  - Evento inválido → 422.
  - Sesión de resultado conocido → tiempo 42 s, P@5 0.4, aceptadas 2, 1 de 3 listas excluida por ser posterior a la última adición.
- **E2E en navegador (Chrome headless):** una sesión ML y una CONV.
  - Recorrido: inicio → búsqueda "pintar un dormitorio" → agregar → detalle → complementos → carrito → recomendación → confirmar → pedido registrado.
  - Se registraron los 6 tipos de evento con sesión, cliente, escenario, condición, origen y posición reales.
  - Se creó el pedido y se calcularon los indicadores (ML 18.4 s / P@5 0.20; CONV 17.0 s / P@5 0.24, calculados con la definición anterior, que promediaba todas las listas).
  - 0 errores de consola.
  - Las capturas confirman el diseño de Stitch en la tienda y en los paneles 05 y 06, con "Datos simulados" al pie.
- `npm run build`: sin errores (solo el aviso de tamaño del bundle).
- `demo.ps1 -Resembrar -Evaluar`: sin errores; backend y frontend responden.

## 6. Observaciones y pendientes

1. **La regla pintura → rodillo existe pero queda sexta.** La regla PIN-001 → HER-012 tiene confianza 0.19 y lift 3.39. Al ordenar por confianza × lift (criterio del BRIEF) queda sexta, así que no entra en el top 5 de PIN-001 sola. Sí entra por búsqueda por necesidad. Son los datos, no un error.
2. **Efecto de la definición de P@5 de sesión:** las listas que se muestran tras agregar productos (las del carrito excluyen lo que ya está en él) tienden a aportar 0. El ajuste final excluye las mostradas después de la última adición, pero las intermedias siguen entrando al promedio. La tienda tiene cuatro bloques que registran listas: Inicio "Recomendados", pie de Búsqueda ("también llevan"), Detalle "Complementa tu compra" y Carrito. Conviene que el diseño de los escenarios ESC-01…08 lo tenga en cuenta.
3. **Seguridad del panel:** los endpoints `/api/admin/*` no validan el token en el backend; solo el frontend protege las rutas. Queda pendiente por prioridad acordada.
4. **Diseño del panel:** Resumen, Inventario, Pedidos, Clientes, Eventos y Configuración funcionan, pero no reproducen fielmente su diseño de Stitch.
5. **`peso_contenido`:** resuelto en la versión 2 (ver sección 8).
6. **Versión de Python:** el entorno usa Python 3.13.3 (el BRIEF pide 3.12); todas las dependencias funcionan.

## 8. Versión 2 · filtrado colaborativo y reordenamiento supervisado (24/09/2026)

Especificación aprobada por el equipo de tesis y enviada por la sesión principal.

### Qué se agregó
- **`backend/colaborativo.py`:** filtrado colaborativo ítem-ítem.
  - Matriz binaria cliente × producto y similitud coseno entre productos (scikit-learn), sin autosimilitud.
  - Guarda 20 vecinos por producto con similitud > 0.
  - Puntaje CF(j | B) = Σ sim(i, j), para i ∈ B.
- **`backend/reordenador.py`:** reordenador supervisado.
  - **Candidatos:** top 10 por reglas ∪ top 10 por CF ∪ top 10 por popularidad de la categoría de B ∪ top 5 por TF-IDF, sin ítems de B ni stock 0.
  - **16 variables:** conf/lift/soporte máximos y nº de reglas activas; cf_score y cf_sim_max; popularidad normalizada; fracción de misma categoría y subcategoría; log del cociente de precios; similitud de contenido; tamaño de B; 4 banderas de origen.
  - **Etiquetado:** cada boleta de entrenamiento con 2 o más ítems, probando cada ítem como oculto.
  - **Modelo:** regresión logística y LightGBM 4.7 (instalado en `.venv`), ambos con `class_weight="balanced"`; se elige por average precision en la validación temporal (10 % final) y se reentrena con todos los ejemplos.
  - **Persistencia:** joblib en `backend/modelos/` (ignorado por git), con versión, fecha, n ejemplos y AP.
- **Configuración:** nueva columna `configuracion.variante_ml` = `REGLAS` | `COMPLETO` (por defecto `COMPLETO`), con migración automática en `init_db`.
  - `GET /api/admin/config` expone los metadatos del reordenador.
  - Panel → Recomendador muestra el selector de variante y la ficha del modelo.
- **`peso_contenido`:** ahora se usa. Multiplica la variable `similitud_contenido` al predecir; el valor por defecto pasó de 0.5 a **1.0** (neutro, el modelo tal como se entrenó).
- **`GET /api/recomendar/cliente/{codigo}[?skus=]`:** B = historial del cliente ∪ carrito; si el cliente no tiene historial, cae a reglas y popularidad. Lo usan "Recomendados para ti" de Inicio (con sesión) y un nuevo bloque en Mi cuenta. Las listas de Mi cuenta posteriores a la confirmación no afectan los indicadores.
- **`POST /api/admin/modelo/reentrenar`:** reentrena reglas, CF y reordenador juntos (unos 5 s).
- **Producción** (420 boletas): se eligió **regresión logística**, con AP de validación {'regresion_logistica': 0.4448, 'lightgbm': 0.4419}.

### Evaluación offline con tres modos (resultados reales)

**Ficha de la corrida:**
- Corrida 2026-09-24 18:17:14; semilla 42; partición temporal 80/20.
  - Entrenamiento: 336 boletas (2026-01-02–2026-05-25).
  - Prueba: 80 evaluadas de 84 (2026-05-25–2026-06-30).
- Todo se entrenó solo con el 80 %:
  - 566 reglas;
  - CF de 59 productos y 132 clientes;
  - reordenador **lightgbm** con AP de validación {'regresion_logistica': 0.258, 'lightgbm': 0.3147}, entrenado con 18794 ejemplos (1031 positivos, 1109 contextos).
- Cobertura de candidatos: 0.9297 en entrenamiento y **0.8625 en prueba**. Ese es el techo de Recall@5 de ML_COMPLETO.
- Resultados deterministas: dos corridas dieron un CSV idéntico byte a byte.

| Modo | n | Precision@5 media / mediana / DE | Recall@5 media / mediana / DE | Aciertos |
|---|---|---|---|---|
| CONV | 80 | 0.1025 / 0.2000 / 0.1006 | 0.5125 / 1.0000 / 0.5030 | 41 |
| ML_REGLAS | 80 | 0.1325 / 0.2000 / 0.0952 | 0.6625 / 1.0000 / 0.4758 | 53 |
| ML_COMPLETO | 80 | 0.1550 / 0.2000 / 0.0840 | 0.7750 / 1.0000 / 0.4202 | 62 |

| McNemar exacto | Ambos | Solo el primero | Solo el segundo | Ninguno | p |
|---|---|---|---|---|---|
| CONV vs ML_COMPLETO | 40 | 1 | 22 | 17 | < 0.0001 |
| ML_REGLAS vs ML_COMPLETO | 52 | 1 | 10 | 17 | 0.0117 |
| CONV vs ML_REGLAS | 37 | 4 | 16 | 23 | 0.0118 |

- CONV y ML_REGLAS reproducen exactamente los valores de la versión 1, porque se ocultan los mismos productos.
- Con corrección de Bonferroni para las 3 comparaciones (α = 0.05/3 ≈ 0.0167), las tres diferencias siguen siendo significativas.

### Verificación de la versión 2
- **`backend/verificar.py`:** 28/28 OK. Se agregaron:
  - CF simétrico y sin autosimilitud (3008 pares), con 20 vecinos o menos y similitud > 0;
  - popularidad y CF del reordenador calculados solo con el 80 %, y reordenador entrenado con 336 de 420 boletas;
  - predicción de 5 productos, sin la canasta ni stock 0;
  - variante REGLAS con fuente `REGLA` y COMPLETO con fuente `REORDENADOR`;
  - recomendación por cliente con y sin historial;
  - evaluación offline con 3 modos × 80 filas y McNemar de los dos pares pedidos.
- **E2E en Chrome** con una sesión ML (variante COMPLETO): 7 listas, 1 sin oportunidad, P@5 0.2333, tiempo 17.2 s, 0 errores de consola.
- Capturas de las pantallas 05 y 06 con tres modos, McNemar y ficha del reordenador.
- `npm run build` sin errores; `demo.ps1 -Resembrar -Evaluar` sin errores.

### Observaciones metodológicas de la versión 2
1. **Variables optimistas dentro del entrenamiento.** Las variables de los ejemplos de entrenamiento se calculan con reglas y CF que incluyen la misma boleta de la que sale el ejemplo. Por eso el modelo ve variables más optimistas que las que encontrará en prueba. No hay fuga hacia el conjunto de prueba (la evaluación es honesta), pero el reordenador podría rendir algo más con variables calculadas fuera de la boleta (validación cruzada por bloques temporales). Es una mejora posible, no un error.
2. **CF por cliente con asignación simulada.** Los clientes de la siembra son simulados: cada boleta se asigna al azar a uno de 150 códigos. Por eso el historial por cliente mezcla canastas sin relación y el CF cliente × producto funciona, sobre todo, porque los ítems de una misma boleta caen en el mismo cliente. Con datos reales de clientes, el CF debería aportar señal propia.
3. **Modelo elegido distinto en producción y en la corrida offline.** Con las 420 boletas gana la regresión logística; con el 80 % gana LightGBM. Ambas elecciones siguen la regla de la especificación y las dos quedan registradas en la ficha.
4. **Techo de cobertura.** En 11 de las 80 boletas de prueba (13.75 %) el producto oculto no está entre los candidatos, así que ningún ordenamiento podría acertarlo.

## 7. Cómo levantar la demostración (dos comandos)

```powershell
cd "E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App"
powershell -ExecutionPolicy Bypass -File .\demo.ps1 -Resembrar -Evaluar
```

- Tienda: http://localhost:5173
- Panel: http://localhost:5173/admin/login (admin / admin123)
- API: http://localhost:8000/docs
- Para detener: `.\demo.ps1 -Detener`

Al cierre de este informe la demostración queda **corriendo** en esos puertos, con la base recién sembrada y sin sesiones de prueba.
