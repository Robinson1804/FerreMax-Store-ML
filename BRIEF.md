# FerreMax · Brief de construcción del sistema web

Proyecto de tesis: **Sistema web basado en Machine Learning para mejorar la recomendación de productos en una empresa comercializadora de artículos de ferretería, 2026** (UPN, Ingeniería de Sistemas Computacionales).

Este documento es la instrucción de trabajo para el agente que construya el código. Léelo completo antes de escribir nada.

## 1. Qué hay en esta carpeta

- `diseno_stitch/` — HTML exportado desde Google Stitch de cada pantalla (Tailwind por CDN, imágenes alojadas en Google). Son la referencia visual obligatoria: la aplicación debe verse igual.
  - `01_inicio.html`, `02_busqueda_por_necesidad.html`, `03_detalle_producto.html`, `04_carrito.html`, `05_panel_recomendador.html`, `06_panel_evaluacion.html`, `index.html` (recorrido). Las pantallas restantes (resumen, productos e inventario, pedidos, clientes, registro de eventos, configuración, confirmar pedido, pedido registrado, mi cuenta, login) se agregan cuando se exporten.
- `datos/datos_simulados_prototipo.json` — 62 productos con palabras clave de uso, 420 boletas simuladas, 518 reglas de asociación (soporte, confianza, lift) y ranking de popularidad. Sirve para sembrar la base de datos y para la demostración.
- `datos/plantilla_datos.xlsx` — estructura de las tablas reales de la empresa (Productos, Ventas, Detalle_Ventas, Clientes, Entradas). Los datos de ejemplo que contiene NO son reales.
- `.agents/mcp_config.json` — conexión al servidor MCP de Stitch para consultar o regenerar pantallas.

## 2. Objetivo del sistema

Tienda web de ferretería con un **recomendador híbrido** que opera en dos modos conmutables desde el panel de administración. La conmutación es el corazón de la tesis: permite medir los mismos indicadores con el mecanismo convencional (O1) y con Machine Learning (O2).

- **Modo Convencional (O1):** recomienda los productos más vendidos y los de la misma categoría del producto o del carrito. Sin aprendizaje.
- **Modo Machine Learning (O2):**
  - Mecanismo A, *búsqueda por necesidad*: el cliente escribe "pintar un dormitorio"; se vectoriza con TF-IDF el texto de cada producto (nombre + marca + categoría + subcategoría + descripción de uso + palabras clave) y se devuelven los K = 5 más similares por coseno.
  - Mecanismo B, *productos complementarios*: reglas de asociación (FP-Growth) extraídas de los comprobantes; dado el producto visto o el contenido del carrito, se recomiendan los consecuentes ordenados por confianza × lift, completando hasta K = 5 con popularidad.
- Filtro de stock: nunca recomendar productos con stock 0 (regla de negocio, no variable de estudio).

## 3. Lo que se mide (no negociable)

Todo evento del cliente se registra en `registro_eventos` con marca de tiempo en milisegundos. Campos: `id_evento, id_sesion, codigo_cliente, escenario, condicion (CONV|ML), tipo_evento, texto_consulta, sku, posicion_recom, origen (BUSQUEDA|CATEGORIA|RECOMENDACION), timestamp`.

Tipos de evento: `INICIO_BUSQUEDA, CONSULTA, RECOM_MOSTRADA, PRODUCTO_AGREGADO, PRODUCTO_RETIRADO, CONFIRMACION_CARRITO`.

Indicadores que el panel de evaluación debe calcular desde el registro:
- **Tiempo de selección (s)** = timestamp(CONFIRMACION_CARRITO) − timestamp(INICIO_BUSQUEDA) por sesión.
- **Precision@5 de sesión** = productos agregados con origen RECOMENDACION de la última lista mostrada / 5.
- **Evaluación offline (Capa 1)**: script que, para cada comprobante del conjunto de prueba (20 % más reciente), oculta un producto, genera 5 recomendaciones con cada modo y calcula Precision@5 y Recall@5 (aciertos/5 y aciertos/1). Exporta CSV con una fila por comprobante y modo.

## 4. Stack

- **Backend:** Python 3.12 + FastAPI. Modelo con scikit-learn (TF-IDF) y mlxtend (FP-Growth). Base de datos PostgreSQL (SQLite aceptable para desarrollo) con SQLAlchemy.
- **Frontend:** React + Vite + Tailwind, reproduciendo fielmente el HTML de `diseno_stitch/`. Reutilizar las clases y estructura exportadas.
- **Panel de administración:** misma aplicación React, rutas `/admin/*`, con autenticación simple por rol.
- Todo en español. Precios en soles `S/ 48.00`. Códigos de cliente anónimos `CLI-###`.

## 5. Modelo de datos mínimo

`productos(sku, nombre, marca, categoria, subcategoria, unidad, uso, palabras_clave, precio, stock, stock_minimo, activo)` ·
`clientes(codigo, tipo, primera_compra, participa_evaluacion)` ·
`comprobantes(numero, fecha, codigo_cliente, canal, total)` · `detalle_comprobante(numero, sku, cantidad, precio_unitario)` ·
`pedidos(id, fecha, codigo_cliente, entrega, pago, estado, total)` · `detalle_pedido(id_pedido, sku, cantidad, precio, origen)` ·
`reglas(antecedentes, consecuentes, soporte, confianza, lift, version_modelo)` ·
`sesiones_evaluacion(id_sesion, codigo_cliente, escenario, condicion, orden, inicio, fin, valida)` · `registro_eventos(...)` ·
`configuracion(modo_activo, k, soporte_min, confianza_min, lift_min, peso_contenido)`.

## 6. API mínima

- `GET /api/productos`, `GET /api/productos/{sku}`, `GET /api/categorias`
- `POST /api/buscar-necesidad {texto, k}` → productos con puntaje y términos coincidentes (según modo activo: ML usa TF-IDF; CONV usa búsqueda por palabra y popularidad)
- `GET /api/recomendar?sku=` y `POST /api/recomendar/carrito {skus}` → lista de K según modo activo
- `POST /api/carrito/confirmar` → crea pedido y registra CONFIRMACION_CARRITO
- `POST /api/eventos` → inserta evento (el frontend envía todos los tipos)
- `GET/PUT /api/admin/config` (modo activo y parámetros), `POST /api/admin/modelo/reentrenar`, `GET /api/admin/reglas`
- `POST /api/admin/sesiones` (iniciar/finalizar sesión de evaluación), `GET /api/admin/eventos`, `GET /api/admin/indicadores`
- `POST /api/admin/evaluacion-offline` → corre la Capa 1 y devuelve/exporta CSV

## 7. Orden de trabajo sugerido

1. Backend: modelos, siembra desde `datos_simulados_prototipo.json`, endpoints de productos y búsqueda.
2. Servicio de recomendación con los dos modos y el conmutador global.
3. Registro de eventos y cálculo de indicadores.
4. Frontend tienda: Inicio, búsqueda por necesidad, detalle, carrito, confirmar pedido (fiel a `diseno_stitch/`).
5. Panel: Recomendador (conmutador y sesión), Evaluación (indicadores, gráfico, registro), Productos, Pedidos, Clientes, Configuración.
6. Script de evaluación offline y exportación CSV.
7. README con instrucciones de ejecución y un script `demo.sh` que siembra datos y levanta todo.

## 8. Reglas

- No inventar métricas ni porcentajes de "precisión" en la interfaz: todo número mostrado debe salir de un cálculo real sobre los datos cargados.
- Etiquetar visiblemente "Datos simulados" mientras la base sea la simulada.
- Nunca almacenar nombres ni DNI de clientes en el módulo de evaluación.
- Código comentado en español, commits pequeños.
