// Estado compartido de la tienda: modo activo, sesión de evaluación, carrito y emisor único de eventos.
// Todo evento del cliente pasa por emitir() y se registra en POST /api/eventos (BRIEF §3).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";

const TiendaContext = createContext(null);

const CLAVE_CARRITO = "ferremax_carrito";
const SIN_SESION = { id_sesion: "SIN-SESION", codigo_cliente: "CLI-000", escenario: null };

function leerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
  } catch {
    return [];
  }
}

export function TiendaProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [sesion, setSesion] = useState(null);
  const [carrito, setCarrito] = useState(leerCarrito);
  const [ultimoPedido, setUltimoPedido] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("ferremax_ultimo_pedido"));
    } catch {
      return null;
    }
  });
  // Sesiones que ya tienen INICIO_BUSQUEDA (persistido para que una recarga no lo repita)
  const inicioEmitido = useRef(new Set(JSON.parse(sessionStorage.getItem("ferremax_inicios") || "[]")));
  const listasPrevias = useRef({}); // último contenido mostrado por cada bloque de recomendaciones

  // Modo activo y sesión de evaluación: se leen del backend y se refrescan periódicamente
  const refrescar = useCallback(() => {
    api.get("/api/admin/config").then((r) => setConfig(r.data)).catch(() => {});
    api.get("/api/sesiones/activa").then((r) => setSesion(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    refrescar();
    const id = setInterval(refrescar, 5000);
    window.addEventListener("focus", refrescar);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refrescar);
    };
  }, [refrescar]);

  useEffect(() => {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  }, [carrito]);

  // Al cambiar de sesión se olvidan las listas mostradas (cada sesión cuenta las suyas)
  const idSesion = sesion?.id_sesion || SIN_SESION.id_sesion;
  useEffect(() => {
    listasPrevias.current = {};
  }, [idSesion]);

  const modo = config?.modo_activo || null;
  const contexto = useCallback(() => {
    const s = sesion || SIN_SESION;
    return {
      id_sesion: s.id_sesion,
      codigo_cliente: s.codigo_cliente,
      escenario: s.escenario,
      // La condición es la de la sesión de evaluación; sin sesión, el modo activo
      condicion: sesion?.condicion || modo || "CONV",
    };
  }, [sesion, modo]);

  const enviar = useCallback((tipo_evento, datos = {}, timestamp = Date.now()) => {
    const ev = {
      ...contexto(),
      tipo_evento,
      texto_consulta: datos.texto_consulta ?? null,
      sku: datos.sku ?? null,
      posicion_recom: datos.posicion_recom ?? null,
      origen: datos.origen ?? null,
      timestamp,
    };
    return api.post("/api/eventos", ev).catch((e) => console.error("No se registró el evento", tipo_evento, e));
  }, [contexto]);

  // INICIO_BUSQUEDA: una vez por sesión, en la primera interacción del cliente
  const marcarInicio = useCallback(() => {
    const id = contexto().id_sesion;
    if (inicioEmitido.current.has(id)) return;
    inicioEmitido.current.add(id);
    try {
      sessionStorage.setItem("ferremax_inicios", JSON.stringify([...inicioEmitido.current]));
    } catch {
      /* sin almacenamiento: solo se evita la repetición en memoria */
    }
    enviar("INICIO_BUSQUEDA");
  }, [contexto, enviar]);

  // INICIO_BUSQUEDA = primera interacción del cliente con la tienda (clic, toque o tecla),
  // no la simple carga de la página. El panel /admin no cuenta.
  useEffect(() => {
    const alInteractuar = () => {
      if (!window.location.pathname.startsWith("/admin")) marcarInicio();
    };
    document.addEventListener("pointerdown", alInteractuar, true);
    document.addEventListener("keydown", alInteractuar, true);
    return () => {
      document.removeEventListener("pointerdown", alInteractuar, true);
      document.removeEventListener("keydown", alInteractuar, true);
    };
  }, [marcarInicio]);

  const emitir = useCallback((tipo, datos) => {
    if (tipo !== "INICIO_BUSQUEDA") marcarInicio();
    return enviar(tipo, datos);
  }, [marcarInicio, enviar]);

  // RECOM_MOSTRADA: una lista = todos sus productos con la misma marca de tiempo.
  // Solo se emite cuando cambia el contenido del bloque, no en cada renderizado.
  const mostrarRecomendaciones = useCallback((bloque, productos) => {
    if (!productos?.length) return;
    const clave = productos.map((p) => p.sku).join("|");
    if (listasPrevias.current[bloque] === clave) return;
    listasPrevias.current[bloque] = clave;
    const ts = Date.now();
    productos.forEach((p, i) =>
      enviar("RECOM_MOSTRADA", { sku: p.sku, posicion_recom: i + 1, origen: "RECOMENDACION" }, ts)
    );
  }, [enviar]);

  // Carrito. origen: BUSQUEDA | CATEGORIA | RECOMENDACION; posicion: posición en la lista recomendada
  const agregar = useCallback((producto, origen, posicion = null, cantidad = 1) => {
    setCarrito((c) => {
      const existe = c.find((i) => i.sku === producto.sku);
      if (existe) return c.map((i) => (i.sku === producto.sku ? { ...i, cantidad: i.cantidad + cantidad } : i));
      return [...c, {
        sku: producto.sku, nombre: producto.nombre, marca: producto.marca, categoria: producto.categoria,
        unidad: producto.unidad, precio: producto.precio, stock: producto.stock, cantidad, origen,
        posicion_recom: posicion,
      }];
    });
    emitir("PRODUCTO_AGREGADO", { sku: producto.sku, origen, posicion_recom: posicion });
  }, [emitir]);

  const retirar = useCallback((sku, todo = true) => {
    const item = carrito.find((i) => i.sku === sku);
    if (!item) return;
    setCarrito((c) =>
      c.flatMap((i) => (i.sku !== sku ? [i] : todo || i.cantidad <= 1 ? [] : [{ ...i, cantidad: i.cantidad - 1 }]))
    );
    emitir("PRODUCTO_RETIRADO", { sku, origen: item.origen, posicion_recom: item.posicion_recom });
  }, [carrito, emitir]);

  const sumarUno = useCallback((sku) => {
    const item = carrito.find((i) => i.sku === sku);
    if (item) agregar(item, item.origen, item.posicion_recom);
  }, [carrito, agregar]);

  const confirmar = useCallback(async ({ entrega = null, pago = null } = {}) => {
    if (!carrito.length) throw new Error("El carrito está vacío");
    marcarInicio();
    const r = await api.post("/api/carrito/confirmar", {
      ...contexto(),
      timestamp: Date.now(),
      items: carrito.map((i) => ({ sku: i.sku, cantidad: i.cantidad, precio: i.precio, origen: i.origen })),
      total: carrito.reduce((s, i) => s + i.precio * i.cantidad, 0),
      entrega,
      pago,
    });
    const pedido = { ...r.data, items: carrito, entrega, pago, fecha: new Date().toISOString() };
    setUltimoPedido(pedido);
    try {
      sessionStorage.setItem("ferremax_ultimo_pedido", JSON.stringify(pedido));
    } catch {
      /* almacenamiento no disponible: el pedido queda solo en memoria */
    }
    setCarrito([]);
    return pedido;
  }, [carrito, contexto, marcarInicio]);

  const valor = useMemo(() => {
    const unidades = carrito.reduce((s, i) => s + i.cantidad, 0);
    const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    return {
      config, modo, sesion, idSesion, refrescar,
      modoTexto: modo === "ML" ? "Machine Learning" : modo === "CONV" ? "Convencional" : "…",
      carrito, unidades, subtotal, ultimoPedido,
      emitir, marcarInicio, mostrarRecomendaciones, agregar, retirar, sumarUno, confirmar,
    };
  }, [config, modo, sesion, idSesion, refrescar, carrito, ultimoPedido, emitir, marcarInicio, mostrarRecomendaciones,
      agregar, retirar, sumarUno, confirmar]);

  return <TiendaContext.Provider value={valor}>{children}</TiendaContext.Provider>;
}

export const useTienda = () => useContext(TiendaContext);

// Hook para bloques de recomendaciones: pide la lista al backend según el modo activo y registra RECOM_MOSTRADA.
//   bloque: nombre único del bloque ("inicio", "detalle", "carrito")
//   skus:   producto visto o contenido del carrito
//   porCliente: si hay sesión con código de cliente, usa GET /api/recomendar/cliente/{codigo}
//               (B = historial de compras ∪ carrito; sin historial cae a reglas y popularidad)
export function useRecomendaciones(bloque, skus, k = 5, { porCliente = false } = {}) {
  const { modo, idSesion, sesion, mostrarRecomendaciones } = useTienda();
  const cliente = porCliente ? sesion?.codigo_cliente : null;
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const clave = (skus || []).join("|");
  useEffect(() => {
    if (!modo) return;
    let vigente = true;
    setCargando(true);
    const skusActuales = clave ? clave.split("|") : [];
    const peticion = cliente
      ? api.get(`/api/recomendar/cliente/${encodeURIComponent(cliente)}`, { params: { skus: skusActuales, k }, paramsSerializer: { indexes: null } })
      : skusActuales.length === 1
        ? api.get("/api/recomendar", { params: { sku: skusActuales[0], k } })
        : api.post("/api/recomendar/carrito", { skus: skusActuales, k });
    peticion
      .then((r) => {
        if (!vigente) return;
        const datos = cliente ? r.data.resultados : r.data;
        setLista(datos);
        mostrarRecomendaciones(bloque, datos);
      })
      .catch(() => vigente && setLista([]))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
    // idSesion: al iniciar una sesión se vuelven a pedir y registrar las listas visibles
  }, [bloque, clave, k, modo, idSesion, cliente, mostrarRecomendaciones]);
  return { lista, cargando };
}
