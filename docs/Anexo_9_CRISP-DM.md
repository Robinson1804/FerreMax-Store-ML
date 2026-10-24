# Anexo 9. Componente de Machine Learning según CRISP-DM

Este anexo documenta el componente de Machine Learning del sistema FerreMax siguiendo las seis fases de CRISP-DM.

- **Datos:** ventas reales de la empresa entre enero y julio de 2026, anonimizadas.
- **Fuentes de las cifras:** el código del repositorio (`backend/`) y la corrida oficial de la evaluación offline (`backend/salidas/evaluacion_offline_resumen.json`, del 24/10/2026 a las 11:40:49), que se reproduce idéntica en el servidor de producción.

> **Validación del protocolo:** antes de recibir los datos reales, el mismo procedimiento se ejecutó sobre un conjunto simulado de 420 boletas (Recall@5: CONV 0.5125, ML_REGLAS 0.6625, ML_COMPLETO 0.7750; n = 80). Esa corrida se conserva en `backend/salidas/simulado/` y se reproduce fila a fila.

---

## Fase 1. Comprensión del negocio

**Problema.** La empresa recomienda productos con un criterio convencional: los más vendidos y los de la misma categoría. Ese criterio no aprovecha qué productos se compran juntos ni la necesidad que el cliente expresa con sus palabras ("pintar un dormitorio", "instalar un punto de agua").

**Objetivo de minería de datos.** Proponer **K = 5** productos con mayor probabilidad de ser comprados que el mecanismo convencional. Las propuestas se generan a partir del producto visto, del carrito o de una necesidad escrita. El sistema compara dos condiciones conmutables:

- **O1 · Convencional (CONV):** el criterio actual de la empresa.
- **O2 · Machine Learning (ML):** el recomendador propuesto.

**Criterios de éxito fijados a priori.**

| Criterio | Indicador | Umbral | Capa |
|---|---|---|---|
| Relevancia | Recall@5 del modo ML frente al convencional | Mejora relativa ≥ 20 % | Capa 1: evaluación offline |
| Eficiencia | Tiempo de selección (CONFIRMACION_CARRITO − INICIO_BUSQUEDA) | Reducción ≥ 30 % | Capa 2: sesiones con clientes |

**Restricciones.**

- No se recomiendan productos sin stock.
- Los clientes se identifican solo por código anónimo `CLI-###`.
- Los datos de la empresa no se publican: el archivo y el detalle por boleta quedan fuera del repositorio público.
- Todo número de la interfaz se calcula a partir de los datos.

---

## Fase 2. Comprensión de los datos

**Fuente.** `Datos_Ferreteria_Ene-Jul_2026.xlsx`, entregado por la empresa y convertido a `datos/datos_empresa_2026.json`.

- Los clientes se reemplazaron por códigos `CLI-###` en orden de primera compra.
- El mapa de códigos queda fuera del repositorio.
- El campo de vendedor no se incorpora a la base.

| Tabla | Registros | Uso en el componente |
|---|---|---|
| `productos` | 52 | Catálogo, texto para TF-IDF, categoría, precio, stock y popularidad |
| `comprobantes` | 5 151 boletas | Transacciones para reglas, filtrado colaborativo y reordenador |
| `detalle_comprobante` | 10 611 líneas | Canasta, cantidades y precio neto de descuento |
| `clientes` | 36 identificados | Matriz cliente × producto (filtrado colaborativo) |

**Periodo.** Del 02/01/2026 al 31/07/2026, entre 634 y 857 boletas por mes.

**Estadísticas descriptivas.**

| Variable | Media | Mediana | DE | Mín. | Máx. |
|---|---|---|---|---|---|
| Productos distintos por boleta | 2.060 | 2 | 1.113 | 1 | 6 |
| Boletas por cliente identificado | 63.44 | 59.5 | 30.71 | 23 | 135 |
| Importe por boleta (S/) | 110.86 | 53.00 | — | 1.50 | 1 220.00 |
| Precio de catálogo (S/) | 54.35 | 28.50 | — | 1.50 | 365.00 |

**Composición de las boletas.**

- **Tamaño de canasta:** 1 producto en 2 020 boletas, 2 en 1 623, 3 en 887, 4 en 422, 5 en 198 y 6 en 1. Hay **3 131 boletas con dos o más productos distintos**, que son las útiles para aprender coocurrencias.
- **Clientes:** 2 284 boletas tienen cliente identificado y **2 867 (55.7 %) son ventas sin cliente**.
- **Medio de pago:** efectivo 2 639, Yape 1 743, Plin 413, tarjeta 288 y transferencia 68.
- **Importe total:** S/ 571 062.60.

**Ventas por categoría.**

| Categoría | Productos | Líneas vendidas |
|---|---|---|
| Gasfitería | 12 | 2 884 |
| Construcción y Estructuras | 10 | 2 788 |
| Electricidad | 8 | 1 671 |
| Ferretería General | 6 | 1 593 |
| Pinturas y Acabados | 8 | 1 209 |
| Herramientas | 8 | 466 |

**Productos con más boletas:**

| Producto | Boletas |
|---|---|
| Cinta teflón 3/4" | 580 |
| Cemento Sol Tipo I 42.5 kg | 564 |
| Cinta aislante 3M 20 m | 545 |
| Fierro corrugado 3/8" | 524 |
| Codo PVC 1/2" | 515 |

**Calidad de los datos.**

- Todos los SKU vendidos existen en el catálogo.
- Hay 130 líneas con cantidades fraccionarias (por ejemplo, 0.5 kg).
- Hay 609 líneas con descuento, en 534 boletas. El total de cada línea es precio × cantidad − descuento.
- Dos productos tienen stock 0 a la fecha del corte (cemento Sol y tee PVC 1/2").
- Las palabras clave del catálogo no incluían verbos ni contextos de uso. En la prueba de búsqueda, 4 de 11 consultas de control quedaron sin resultados (ver Fase 3).

---

## Fase 3. Preparación de los datos

| Insumo | Construcción | Módulo |
|---|---|---|
| Boletas | Número, fecha, cliente (NULL si es venta sin cliente) y canal reales | `seed.py` (fuente empresa) |
| Detalle | Cantidad decimal y precio unitario neto = (precio × cantidad − descuento) / cantidad | `seed.py` |
| Canastas | SKU distintos por boleta | `recommender.py`, `evaluacion_offline.py` |
| Matriz transaccional | Codificación binaria boleta × producto (`TransactionEncoder`) | `recommender.entrenar_reglas` |
| Matriz cliente × producto | Binaria; excluye las ventas sin cliente | `colaborativo.entrenar_cf` |
| Texto de producto | Nombre, marca, categoría, subcategoría, uso y palabras clave, normalizados (minúsculas, sin tildes ni palabras vacías) | `recommender.documento_producto` |
| Popularidad | Número de boletas por SKU | `popularidad_desde_transacciones` |

**Enriquecimiento de las palabras clave.** A partir del nombre y del uso de cada producto se agregaron verbos de tarea y contextos de aplicación: pintar, instalar, colgar, perforar, impermeabilizar, dormitorio, baño, cocina, pared, techo, entre otros.

- Son 487 términos en total, para los 52 productos.
- El diccionario es reproducible (`datos/kw_enriquecidas.json`, v1.1) y no modifica nombres ni precios.
- Se probó con los 8 enunciados del Anexo 7, tal como se entregan al cliente, y con 3 consultas de control (`backend/escenarios_busqueda.py`). Un acierto es un producto esperado, existente en el catálogo, presente en los 5 resultados.

| Palabras clave | Modo | Aciertos en el top 5 | Consultas sin resultados |
|---|---|---|---|
| Originales | CONV | 8 / 37 | 4 / 11 |
| Originales | ML | 7 / 37 | 4 / 11 |
| Enriquecidas | CONV | 35 / 37 | 0 / 11 |
| Enriquecidas | ML | 31 / 37 | 0 / 11 |

**Partición para la evaluación offline (sin fuga de información).**

- Las boletas se ordenan por fecha y número.
- El **80 % más antiguo (4 120 boletas, del 02/01 al 20/06/2026)** es el conjunto de entrenamiento.
- El **20 % más reciente (1 031 boletas, del 21/06 al 31/07/2026)** es el conjunto de prueba. De ellas, **639** tienen dos o más productos distintos y son evaluables.
- En cada boleta de prueba se oculta un producto al azar, con semilla **42**.
- Popularidad, reglas, filtrado colaborativo y reordenador se entrenan dentro de la corrida **solo con el 80 %**.
- Como las boletas son históricas, la evaluación no filtra por el stock de la fecha del corte.

---

## Fase 4. Modelado

La variante **ML_REGLAS** combina A y B. La variante **ML_COMPLETO**, que es la de producción, agrega C y D.

**A. Búsqueda por necesidad: TF-IDF + coseno.** Se vectoriza el texto de cada producto y se devuelven los K = 5 productos con mayor similitud coseno (> 0) respecto de la consulta. El modo convencional cuenta palabras coincidentes y desempata por popularidad.

**B. Reglas de asociación: FP-Growth (mlxtend).** Dada una canasta B, se proponen los consecuentes de las reglas cuyos antecedentes están en B, ordenados por confianza × lift. Si no alcanzan 5, se completan con los más populares de la misma categoría.

| Parámetro | Valor |
|---|---|
| Soporte / confianza / lift mínimos (preregistrados) | 0.01 / 0.15 / 1.2 |
| Reglas con el 80 % (corrida offline) | **47** |
| Reglas con el 100 % (producción) | 43 |

**Análisis de sensibilidad del soporte** (confianza 0.15 y lift 1.2 fijos; `backend/salidas/sensibilidad_soporte.json`).

| Soporte | Reglas | Recall@5 CONV | Recall@5 ML_REGLAS | Recall@5 ML_COMPLETO | p (CONV vs ML_COMPLETO) |
|---|---|---|---|---|---|
| 0.005 | 109 | 0.3756 | 0.4272 | 0.4820 | 2.4 × 10⁻⁹ |
| 0.0075 | 67 | 0.3756 | 0.4147 | 0.4914 | 5.3 × 10⁻¹² |
| **0.01** | **47** | 0.3756 | 0.4069 | **0.4789** | 5.3 × 10⁻¹⁰ |
| 0.015 | 23 | 0.3756 | 0.3709 | 0.4679 | 1.2 × 10⁻⁹ |
| 0.02 | 10 | 0.3756 | 0.3709 | 0.4710 | 2.7 × 10⁻¹⁰ |

**Decisión.** Antes de ver resultados se fijó una regla: mantener los umbrales preregistrados salvo que dejaran menos de 20 reglas. Con 47 reglas se mantiene el soporte 0.01. Elegir el umbral por su desempeño en el conjunto de prueba sería sobreajuste.

La conclusión es robusta. ML_COMPLETO supera a CONV con cualquier umbral (Recall@5 entre 0.468 y 0.491). ML_REGLAS, en cambio, depende del número de reglas y deja de superar a CONV con menos de 25.

**C. Filtrado colaborativo ítem a ítem.**

- Matriz cliente × producto de **52 productos × 36 clientes**.
- Similitud coseno entre productos, sin autosimilitud, con 20 vecinos por producto.
- Puntaje de un candidato j: CF(j | B) = Σ sim(i, j), para i ∈ B.

**D. Reordenamiento supervisado.**

- **Candidatos:** top 10 por reglas ∪ top 10 por CF ∪ top 10 por popularidad de la categoría ∪ top 5 por TF-IDF, sin los productos de B.
- **Variables (16):** confianza, lift y soporte máximos, y número de reglas activas; cf_score y cf_sim_max; popularidad normalizada; fracción de misma categoría y subcategoría; log del cociente de precios; similitud de contenido; tamaño de B; 4 banderas de origen.
- **Etiqueta:** 1 si el candidato es el producto oculto.
- **Modelos y selección:** regresión logística frente a LightGBM, ambos con `class_weight="balanced"`, elegidos por average precision (AP) en una validación temporal (10 % final del entrenamiento).
- **Reproducibilidad:** LightGBM corre en modo determinista y las similitudes se suman en orden fijo.

| Entrenamiento del reordenador | Corrida offline (80 %) | Producción (100 %) |
|---|---|---|
| Ejemplos (positivos) | 114 711 (4 929) | 141 174 (5 545) |
| Contextos | 6 851 | 8 591 |
| Cobertura de candidatos (entrenamiento) | 0.7195 | 0.6454 |
| AP de validación · regresión logística | 0.1696 | 0.1522 |
| AP de validación · LightGBM | **0.2460** | 0.2676 |
| Modelo elegido | LightGBM | LightGBM |

---

## Fase 5. Evaluación

**Métricas por boleta de prueba:** Precision@5 = aciertos / 5 y Recall@5 = aciertos / 1. Hay acierto cuando el producto oculto aparece en el top 5. Las medianas valen 0 porque el acierto es binario por boleta y menos de la mitad de las boletas aciertan.

| Modo | n | Precision@5 media / DE | Recall@5 media / DE | Aciertos |
|---|---|---|---|---|
| CONV | 639 | 0.0751 / 0.0969 | 0.3756 / 0.4847 | 240 |
| ML_REGLAS | 639 | 0.0814 / 0.0983 | 0.4069 / 0.4916 | 260 |
| ML_COMPLETO | 639 | **0.0958** / 0.1000 | **0.4789** / 0.4999 | **306** |

**Prueba exacta de McNemar** (aciertos pareados por boleta):

| Par | Ambos aciertan | Solo el primero | Solo el segundo | Ninguno | p |
|---|---|---|---|---|---|
| CONV vs ML_COMPLETO | 215 | 25 | 91 | 308 | 5.31 × 10⁻¹⁰ |
| ML_REGLAS vs ML_COMPLETO | 239 | 21 | 67 | 312 | 9.20 × 10⁻⁷ |
| CONV vs ML_REGLAS | 231 | 9 | 29 | 370 | 0.00166 |

Las tres diferencias son significativas, también con corrección de Bonferroni (α = 0.05 / 3 ≈ 0.0167).

**Contraste con el criterio de éxito (Capa 1).**

| Comparación | Recall@5 ML | Recall@5 CONV | Mejora relativa | ¿Cumple ≥ 20 %? |
|---|---|---|---|---|
| ML_COMPLETO vs CONV | 0.4789 | 0.3756 | +27.5 % | Sí |
| ML_REGLAS vs CONV | 0.4069 | 0.3756 | +8.3 % | No |

**Notas.**

- **Efecto del enriquecimiento en la evaluación offline:** CONV y ML_REGLAS no cambian. ML_COMPLETO pasa de 311 a 306 aciertos (Recall@5 0.4867 → 0.4789), porque el reordenador usa la similitud de contenido. Se reporta la cifra con las palabras clave enriquecidas porque es la configuración desplegada. La corrida con las palabras originales está en `backend/salidas/kw_originales/`.
- **Techo de la cobertura:** en el 30.2 % de las boletas de prueba el producto oculto no estaba entre los candidatos (cobertura 0.698), lo que limita el Recall@5 de ML_COMPLETO a 0.698.
- **Criterio de tiempo de selección (≥ 30 %):** pertenece a la Capa 2. Se calcula desde `registro_eventos` cuando se realizan las sesiones con clientes.
- **Reproducibilidad:** la corrida es determinista (CSV idéntico en ejecuciones repetidas con distinta semilla de hash) y da los mismos valores en Windows y en el servidor Linux.

---

## Fase 6. Despliegue

| Aspecto | Implementación |
|---|---|
| Servicio | API REST FastAPI; el modo activo se lee de `configuracion` en cada solicitud |
| Conmutador de modo | `PUT /api/admin/config` (CONV / ML; variante REGLAS / COMPLETO) desde Panel → Recomendador; al iniciar una sesión de evaluación el modo se fija en su condición |
| Carga de datos | `seed.py --fuente empresa --reset --reentrenar`; `--solo-kw` reaplica las palabras clave sin borrar datos |
| Reentrenamiento | `POST /api/admin/modelo/reentrenar`: reglas, popularidad, filtrado colaborativo y reordenador con todas las boletas |
| Persistencia | Reglas en la tabla `reglas`; vecinos, conteos y clasificador en `backend/modelos/reordenador.joblib` |
| Evaluación desde el panel | Panel → Evaluación (Capa 1 con ficha de la corrida y fuente de datos; Capa 2 por condición) |
| Infraestructura | Droplet DigitalOcean (Ubuntu 24.04, 2 GB), servicio systemd `ferremax-api`, Nginx, HTTPS con Let's Encrypt (https://sosdigital.lat) |
| Protección de datos | Panel con token HMAC (12 h); sesiones de evaluación vinculadas al navegador que las inicia; el historial de compras de un cliente solo se usa con el token de su propia sesión y nunca se devuelve |
| Actualización | `deploy/actualizar.sh` (respalda las salidas generadas, actualiza el código, compila y reinicia sin tocar la base) |
