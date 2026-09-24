import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, soles } from "../lib/api";
import { useTienda, useRecomendaciones } from "../lib/tienda";
import EtiquetaModo from "../components/EtiquetaModo";

// No hay imágenes de productos en el backend: se usa un ícono por categoría.
const ICONO_CATEGORIA = {
  "Pinturas y Acabados": "format_paint",
  "Herramientas": "handyman",
  "Construcción y Estructuras": "foundation",
  "Electricidad": "electrical_services",
  "Gasfitería": "plumbing",
  "Ferretería General": "hardware",
};
const iconoDe = (categoria) => ICONO_CATEGORIA[categoria] || "inventory_2";
const ORIGENES = ["BUSQUEDA", "CATEGORIA", "RECOMENDACION"];

export default function Detalle() {
  const { sku } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { sesion, unidades, subtotal, agregar } = useTienda();

  // Origen del producto principal (cómo llegó el cliente a esta ficha)
  const origenParam = (params.get("origen") || "").toUpperCase();
  const origen = ORIGENES.includes(origenParam) ? origenParam : "BUSQUEDA";
  const posParam = parseInt(params.get("pos"), 10);
  const posicion = origen === "RECOMENDACION" && Number.isFinite(posParam) ? posParam : null;

  const [producto, setProducto] = useState(null);
  const [error, setError] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [pestana, setPestana] = useState("uso");
  const [similares, setSimilares] = useState([]);
  const [seleccion, setSeleccion] = useState([]);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let vigente = true;
    setProducto(null);
    setError(null);
    setCantidad(1);
    setSeleccion([]);
    api.get(`/api/productos/${encodeURIComponent(sku)}`)
      .then((r) => vigente && setProducto(r.data))
      .catch((e) => vigente && setError(e.response?.status === 404 ? "Producto no encontrado" : "No se pudo cargar el producto"));
    return () => { vigente = false; };
  }, [sku]);

  // Productos similares: misma categoría (y de preferencia misma subcategoría), según el catálogo real
  useEffect(() => {
    if (!producto) return;
    let vigente = true;
    api.get("/api/productos", { params: { categoria: producto.categoria } })
      .then((r) => {
        if (!vigente) return;
        const otros = r.data.filter((p) => p.sku !== producto.sku);
        const misma = otros.filter((p) => p.subcategoria === producto.subcategoria);
        const resto = otros.filter((p) => p.subcategoria !== producto.subcategoria);
        setSimilares([...misma, ...resto].slice(0, 4));
      })
      .catch(() => vigente && setSimilares([]));
    return () => { vigente = false; };
  }, [producto]);

  const { lista: recomendados, cargando: cargandoRecom } = useRecomendaciones("detalle", sku ? [sku] : [], 5);

  useEffect(() => { setSeleccion([]); }, [recomendados]);

  const avisar = (msg) => {
    setAviso(msg);
    setTimeout(() => setAviso(null), 2500);
  };

  const buscar = (e) => {
    e.preventDefault();
    const q = texto.trim();
    if (q) navigate(`/busqueda?q=${encodeURIComponent(q)}`);
  };

  const agregarPrincipal = (irAlCarrito = false) => {
    if (!producto) return;
    agregar(producto, origen, posicion, cantidad);
    if (irAlCarrito) navigate("/carrito");
    else avisar(`${cantidad} × ${producto.nombre} agregado al carrito`);
  };

  const alternar = (s) => setSeleccion((sel) => (sel.includes(s) ? sel.filter((x) => x !== s) : [...sel, s]));
  const elegidos = recomendados.filter((p) => seleccion.includes(p.sku));
  const totalElegidos = elegidos.reduce((s, p) => s + p.precio, 0);
  const agregarSeleccionados = () => {
    elegidos.forEach((p) => agregar(p, "RECOMENDACION", p.posicion));
    if (elegidos.length) avisar(`${elegidos.length} producto(s) recomendados agregados al carrito`);
    setSeleccion([]);
  };

  const irADetalle = (p, org, pos) =>
    navigate(`/detalle/${encodeURIComponent(p.sku)}?origen=${org}${pos ? `&pos=${pos}` : ""}`);

  const stock = producto?.stock ?? 0;

  return (
    <>

{/*  1. BARRA SUPERIOR CORPORATIVA  */}
<section className="bg-primary-container text-on-primary py-space-xs text-label-md font-label-md border-b border-primary">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop flex items-center justify-between">
<div className="flex items-center space-x-space-lg">
<span className="flex items-center gap-1.5 opacity-90">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="local_shipping">local_shipping</span>
          Envíos a todo el Perú
        </span>
<span className="flex items-center gap-1.5 opacity-90">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="bolt">bolt</span>
          Delivery rápido en Lima Metropolitana
        </span>
</div>
<div className="flex items-center space-x-space-lg">
<span className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px]" data-icon="call">call</span>
          Atención: (01) 712 3456
        </span>
<span className="text-outline-variant opacity-40">|</span>
<Link className="flex items-center gap-1 hover:text-secondary-fixed transition-colors" to="/mi-cuenta">
<span className="material-symbols-outlined text-[16px]" data-icon="inventory_2">inventory_2</span>
          Seguimiento de pedidos
        </Link>
</div>
</div>
</section>
{/*  2. CABECERA PRINCIPAL  */}
<header className="bg-surface-container-lowest border-b border-outline-variant shadow-sm sticky top-0 z-50">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop py-space-md flex items-center justify-between gap-space-lg">
{/*  Brand Logo  */}
<Link className="text-headline-md font-headline-md font-extrabold text-primary tracking-tight flex items-center shrink-0" to="/">
<span>FERRE</span><span className="text-secondary-container">MAX</span>
</Link>
{/*  Search Bar  */}
<form className="flex-1 max-w-2xl relative" onSubmit={buscar}>
<div className="flex w-full items-center">
<div className="relative w-full">
<span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-outline">
<span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
</span>
<input className="w-full pl-10 pr-4 py-2 bg-surface-bright border border-outline-variant rounded-l-lg text-body-md font-body-md text-primary placeholder-outline focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container" placeholder="¿Qué necesitas hacer? Ej.: pintar una pared" type="text" value={texto} onChange={(e) => setTexto(e.target.value)}/>
</div>
<button className="bg-primary-container hover:bg-primary text-on-primary px-space-lg py-2 h-[42px] rounded-r-lg font-label-lg text-label-lg flex items-center justify-center transition-colors" type="submit">
<span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
</button>
</div>
</form>
{/*  User & Cart cluster  */}
<div className="flex items-center space-x-space-lg shrink-0">
<Link className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-surface-container transition-colors group" to="/mi-cuenta">
<div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary-container group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
<span className="material-symbols-outlined text-[20px]" data-icon="person">person</span>
</div>
<div className="flex flex-col text-left">
<span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">{sesion?.codigo_cliente ? `Hola, ${sesion.codigo_cliente}` : "Hola, Inicia sesión"}</span>
<span className="text-label-lg font-label-lg text-primary font-bold">Mi cuenta</span>
</div>
</Link>
<Link className="flex items-center gap-3 bg-surface-bright hover:bg-surface-container border border-outline-variant px-3.5 py-2 rounded-lg transition-all group" to="/carrito">
<div className="relative flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-[24px]" data-icon="shopping_cart">shopping_cart</span>
<span className="absolute -top-1.5 -right-2 bg-secondary-container text-on-secondary text-label-sm font-label-sm font-bold min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center">{unidades}</span>
</div>
<div className="flex flex-col text-left">
<span className="text-label-sm font-label-sm text-outline">Carrito</span>
<span className="text-label-lg font-label-lg text-primary font-bold">{soles(subtotal)}</span>
</div>
</Link>
</div>
</div>
{/*  3. BARRA DE NAVEGACIÓN SECUNDARIA  */}
<nav className="border-t border-outline-variant bg-surface-container-lowest">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop flex items-center justify-between">
<div className="flex items-center space-x-space-md">
<Link className="bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center gap-2 py-2.5 px-space-md rounded-b-none transition-colors hover:bg-primary" to="/busqueda">
<span className="material-symbols-outlined text-[20px]" data-icon="menu">menu</span>
<span>Todas las categorías</span>
<span className="material-symbols-outlined text-[18px]" data-icon="expand_more">expand_more</span>
</Link>
<div className="flex items-center space-x-space-lg pl-space-md">
<Link className="text-on-surface font-label-lg text-label-lg hover:text-secondary transition-colors py-2.5" to="/">Inicio</Link>
<Link className="text-secondary border-b-2 border-secondary font-label-lg text-label-lg font-bold py-2.5" to="/busqueda">Productos</Link>
<Link className="text-on-surface font-label-lg text-label-lg hover:text-secondary transition-colors py-2.5" to="/busqueda">Categorías</Link>
</div>
</div>
<div className="hidden xl:flex items-center gap-2 text-label-md font-label-md text-on-surface-variant">
<span className="material-symbols-outlined text-[18px] text-secondary-container" data-icon="verified">verified</span>
<span>Venta mayorista disponible · RUC y Factura en todas tus compras</span>
</div>
</div>
</nav>
</header>
{/*  MAIN CANVAS  */}
<main className="flex-grow w-full max-w-[1360px] mx-auto px-margin-desktop py-space-lg space-y-space-xl">
{error && (
<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-space-xl shadow-sm text-center space-y-space-md">
<span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
<h1 className="text-headline-md font-headline-md text-primary font-bold">{error}</h1>
<Link className="inline-flex items-center gap-2 text-secondary-container font-label-lg text-label-lg hover:underline" to="/">
<span className="material-symbols-outlined text-[18px]">arrow_back</span>
<span>Volver a la tienda</span>
</Link>
</section>
)}
{!error && !producto && (
<div className="text-center text-body-md font-body-md text-outline py-space-xl">Cargando producto…</div>
)}
{producto && (
<>
{/*  4. MIGAS DE PAN (BREADCRUMBS)  */}
<nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-label-md font-label-md text-outline">
<Link className="hover:text-primary transition-colors" to="/">Inicio</Link>
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
<Link className="hover:text-primary transition-colors" to={`/busqueda?categoria=${encodeURIComponent(producto.categoria)}`}>{producto.categoria}</Link>
{producto.subcategoria && (
<>
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
<span>{producto.subcategoria}</span>
</>
)}
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
<span aria-current="page" className="text-primary font-bold">{producto.nombre}</span>
</nav>
{/*  5. FICHA PRINCIPAL DE PRODUCTO  */}
<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-space-xl shadow-sm">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
{/*  Columna Izquierda: imagen por categoría  */}
<div className="lg:col-span-6 flex flex-col gap-space-md">
<div className="w-full aspect-square bg-surface-bright rounded-xl border border-outline-variant overflow-hidden relative flex items-center justify-center p-space-lg">
{producto.subcategoria && (
<span className="absolute top-4 left-4 bg-secondary-container text-on-secondary text-label-sm font-label-sm px-2.5 py-1 rounded-md uppercase font-bold tracking-wide">
              {producto.subcategoria}
            </span>
)}
<span className="material-symbols-outlined text-primary-container opacity-80" style={{ fontSize: "180px" }}>{iconoDe(producto.categoria)}</span>
</div>
</div>
{/*  Columna Derecha: Información y Compra  */}
<div className="lg:col-span-6 flex flex-col justify-between">
<div className="space-y-space-md">
<div className="flex items-center justify-between">
<span className="inline-block bg-surface-container text-on-surface-variant font-label-md text-label-md px-3 py-1 rounded tracking-wider uppercase font-bold">
                {producto.marca}
              </span>
</div>
<h1 className="text-headline-xl font-headline-xl text-primary tracking-tight">
              {producto.nombre}
            </h1>
<div className="flex items-center gap-space-lg border-b border-outline-variant pb-space-md">
<span className="text-label-md font-label-md text-outline">SKU: {producto.sku}</span>
<span className="text-label-md font-label-md text-outline">Categoría: {producto.categoria}</span>
</div>
{/*  Price & Stock  */}
<div className="py-space-sm flex items-baseline justify-between">
<div className="flex items-baseline gap-2">
<span className="text-display-lg font-display-lg text-secondary-container tracking-tight">{soles(producto.precio)}</span>
<span className="text-headline-sm font-headline-sm text-outline">/ {producto.unidad}</span>
</div>
{stock > 0 ? (
<div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-label-md font-label-md font-semibold">
<span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                En stock · {stock} unidades
              </div>
) : (
<div className="inline-flex items-center gap-1.5 bg-red-50 text-red-800 border border-red-200 px-3 py-1 rounded-full text-label-md font-label-md font-semibold">
<span className="w-2 h-2 rounded-full bg-red-600"></span>
                Sin stock
              </div>
)}
</div>
{/*  Purchase Controls  */}
<div className="space-y-space-md pt-space-xs">
<div className="flex items-center gap-space-md">
<div className="flex items-center border border-outline-variant rounded-lg bg-surface-bright h-[48px]">
<button aria-label="Disminuir cantidad" className="px-3.5 h-full text-primary hover:bg-surface-container transition-colors flex items-center justify-center font-bold" type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>
<span className="material-symbols-outlined text-[18px]" data-icon="remove">remove</span>
</button>
<input className="w-12 text-center bg-transparent border-0 font-label-lg text-label-lg text-primary font-bold focus:ring-0" readOnly type="text" value={cantidad}/>
<button aria-label="Aumentar cantidad" className="px-3.5 h-full text-primary hover:bg-surface-container transition-colors flex items-center justify-center font-bold" type="button" onClick={() => setCantidad((c) => (stock > 0 ? Math.min(stock, c + 1) : c + 1))}>
<span className="material-symbols-outlined text-[18px]" data-icon="add">add</span>
</button>
</div>
<button className="flex-1 h-[48px] bg-secondary-container hover:bg-secondary text-on-secondary font-label-lg text-label-lg rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-98 disabled:opacity-50" type="button" disabled={stock <= 0} onClick={() => agregarPrincipal(false)}>
<span className="material-symbols-outlined text-[22px]" data-icon="shopping_cart">shopping_cart</span>
<span>Agregar al carrito</span>
</button>
<button className="h-[48px] px-space-xl bg-surface-container-lowest border-2 border-primary-container text-primary-container hover:bg-surface-container font-label-lg text-label-lg rounded-lg transition-colors disabled:opacity-50" type="button" disabled={stock <= 0} onClick={() => agregarPrincipal(true)}>
                  Comprar ahora
                </button>
</div>
{aviso && (
<p className="text-label-md font-label-md text-emerald-700 flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px]">check_circle</span>
<span>{aviso}</span>
</p>
)}
</div>
</div>
{/*  Caja de beneficios y despacho  */}
<div className="mt-space-lg bg-surface-bright rounded-xl border border-outline-variant p-space-md space-y-space-sm">
<div className="flex items-start gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
<span className="material-symbols-outlined text-[18px]" data-icon="local_shipping">local_shipping</span>
</div>
<div className="flex flex-col">
<span className="text-label-md font-label-md text-primary font-bold">Delivery en Lima Metropolitana</span>
<span className="text-body-sm font-body-sm text-outline">Costo y fecha de despacho por coordinar al confirmar el pedido</span>
</div>
</div>
<div className="flex items-start gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
<span className="material-symbols-outlined text-[18px]" data-icon="store">store</span>
</div>
<div className="flex flex-col">
<span className="text-label-md font-label-md text-primary font-bold">Recojo en tienda sin costo</span>
<span className="text-body-sm font-body-sm text-outline">Retira tu pedido en la tienda FerreMax</span>
</div>
</div>
<div className="flex items-start gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
<span className="material-symbols-outlined text-[18px]" data-icon="credit_card">credit_card</span>
</div>
<div className="flex flex-col">
<span className="text-label-md font-label-md text-primary font-bold">Pago con Yape, Plin, tarjetas de crédito/débito o efectivo</span>
<span className="text-body-sm font-body-sm text-outline">Emisión de Boleta o Factura</span>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  6. PESTAÑAS DE INFORMACIÓN  */}
<section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
<div className="flex border-b border-outline-variant bg-surface-bright">
{[["descripcion", "Descripción"], ["especificaciones", "Especificaciones"], ["uso", "Uso recomendado"]].map(([id, titulo]) => (
<button key={id} type="button" onClick={() => setPestana(id)} className={pestana === id
  ? "py-space-md px-space-xl font-label-lg text-label-lg font-bold text-secondary-container border-b-2 border-secondary-container bg-surface-container-lowest"
  : "py-space-md px-space-xl font-label-lg text-label-lg text-outline hover:text-primary transition-colors"}>
          {titulo}
        </button>
))}
</div>
<div className="p-space-xl space-y-space-lg">
<div className="max-w-4xl text-body-lg font-body-lg text-on-surface leading-relaxed">
{pestana === "descripcion" && <>{producto.nombre}, de la marca {producto.marca}. Producto de la línea {producto.subcategoria || producto.categoria} de {producto.categoria}.</>}
{pestana === "especificaciones" && <>Ficha técnica del catálogo FerreMax.</>}
{pestana === "uso" && (producto.uso || "Sin información de uso registrada para este producto.")}
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-sm">
{[["category", "Categoría", producto.categoria], ["label", "Subcategoría", producto.subcategoria || "—"], ["straighten", "Unidad de venta", producto.unidad]].map(([icono, etiqueta, valor]) => (
<div key={etiqueta} className="p-space-md bg-surface-bright rounded-lg border border-outline-variant flex items-center gap-space-md">
<div className="p-3 bg-primary-container text-on-primary rounded-lg flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]">{icono}</span>
</div>
<div>
<span className="text-label-sm font-label-sm text-outline uppercase block">{etiqueta}</span>
<span className="text-headline-sm font-headline-sm text-primary font-bold">{valor}</span>
</div>
</div>
))}
</div>
</div>
</section>
</>
)}
{/*  7. BLOQUE DE RECOMENDACIÓN (modo activo)  */}
{!error && (
<section className="bg-[#FFF3EA] border border-[#FBD7C0] rounded-xl p-space-xl shadow-sm">
<div className="flex flex-col md:flex-row md:items-center justify-between pb-space-lg border-b border-[#FBD7C0] gap-space-sm">
<div>
<div className="flex items-center gap-2 mb-1">
<span className="material-symbols-outlined text-secondary-container text-[24px]" data-icon="auto_awesome">auto_awesome</span>
<h3 className="text-headline-md font-headline-md text-primary font-bold">Complementa tu compra</h3>
<span className="bg-secondary-container text-on-secondary text-label-sm font-label-sm px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
              <EtiquetaModo />
            </span>
</div>
<p className="text-body-md font-body-md text-on-surface-variant">
            Productos que suelen llevarse junto con este. Marca los que quieras y agrégalos al carrito.
          </p>
</div>
</div>
<div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg pt-space-lg items-center">
<div className="xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-space-sm">
{cargandoRecom && recomendados.length === 0 && (
<p className="md:col-span-5 text-body-md font-body-md text-outline">Cargando recomendaciones…</p>
)}
{!cargandoRecom && recomendados.length === 0 && (
<p className="md:col-span-5 text-body-md font-body-md text-outline">No hay recomendaciones para este producto.</p>
)}
{recomendados.map((p) => (
<div key={p.sku} className="bg-surface-container-lowest p-space-sm rounded-lg border border-[#FBD7C0] flex flex-col justify-between hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<input checked={seleccion.includes(p.sku)} onChange={() => alternar(p.sku)} aria-label={`Seleccionar ${p.nombre}`} className="w-5 h-5 rounded border-outline-variant text-primary-container focus:ring-primary-container" type="checkbox"/>
<span className="text-label-sm font-label-sm text-outline">SKU: {p.sku}</span>
</div>
<button type="button" onClick={() => irADetalle(p, "RECOMENDACION", p.posicion)} className="h-24 w-full my-2 bg-surface-bright rounded flex items-center justify-center p-1">
<span className="material-symbols-outlined text-primary-container text-[48px]">{iconoDe(p.categoria)}</span>
</button>
<div>
<button type="button" onClick={() => irADetalle(p, "RECOMENDACION", p.posicion)} className="text-left text-label-md font-label-md text-primary font-semibold line-clamp-2 h-8 hover:text-secondary-container">{p.nombre}</button>
<p className="text-price-md font-price-md text-secondary-container mt-1">{soles(p.precio)}</p>
</div>
</div>
))}
</div>
<div className="xl:col-span-3 bg-surface-container-lowest p-space-lg rounded-xl border border-[#FBD7C0] flex flex-col items-center justify-center text-center space-y-space-md shadow-sm">
<div className="w-10 h-10 rounded-full bg-[#FFF3EA] text-secondary-container flex items-center justify-center">
<span className="material-symbols-outlined text-[24px]" data-icon="playlist_add_check">playlist_add_check</span>
</div>
<div>
<span className="text-label-md font-label-md text-outline block">{elegidos.length} seleccionados</span>
<div className="text-headline-xl font-headline-xl text-primary font-extrabold tracking-tight mt-1">
              {soles(totalElegidos)}
            </div>
</div>
<button className="w-full py-3 px-space-md bg-secondary-container hover:bg-secondary text-on-secondary font-label-lg text-label-lg rounded-lg flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98 disabled:opacity-50" type="button" disabled={elegidos.length === 0} onClick={agregarSeleccionados}>
<span className="material-symbols-outlined text-[20px]" data-icon="add_shopping_cart">add_shopping_cart</span>
<span>Agregar seleccionados</span>
</button>
</div>
</div>
</section>
)}
{/*  8. SECCIÓN PRODUCTOS SIMILARES (misma categoría)  */}
{producto && similares.length > 0 && (
<section className="space-y-space-md">
<div className="flex items-center justify-between">
<h3 className="text-headline-md font-headline-md text-primary font-bold">Productos similares</h3>
<Link className="text-secondary-container hover:text-secondary font-label-lg text-label-lg flex items-center gap-1" to={`/busqueda?categoria=${encodeURIComponent(producto.categoria)}`}>
<span>Ver categoría {producto.categoria}</span>
<span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
</Link>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-space-lg">
{similares.map((p) => (
<div key={p.sku} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-space-md flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all duration-200">
<button type="button" className="text-left" onClick={() => irADetalle(p, "CATEGORIA")}>
<div className="aspect-square bg-surface-bright rounded-lg p-space-md flex items-center justify-center mb-space-md">
<span className="material-symbols-outlined text-primary-container text-[72px]">{iconoDe(p.categoria)}</span>
</div>
<span className="text-label-sm font-label-sm text-outline uppercase font-semibold">{p.marca}</span>
<h4 className="text-headline-sm font-headline-sm text-primary font-semibold mt-1">{p.nombre}</h4>
</button>
<div className="mt-space-md pt-space-sm border-t border-outline-variant flex items-center justify-between">
<span className="text-price-md font-price-md text-primary font-bold">{soles(p.precio)}</span>
<button type="button" aria-label={`Agregar ${p.nombre}`} onClick={() => { agregar(p, "CATEGORIA", null); avisar(`${p.nombre} agregado al carrito`); }} className="p-2 rounded-lg bg-surface-bright hover:bg-secondary-container hover:text-on-secondary text-primary border border-outline-variant transition-colors flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]" data-icon="add_shopping_cart">add_shopping_cart</span>
</button>
</div>
</div>
))}
</div>
</section>
)}
</main>
{/*  9. PIE DE PÁGINA CORPORATIVO  */}
<footer className="bg-primary text-on-primary border-t border-primary-container mt-space-xl">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop py-space-xl">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-xl">
<div className="space-y-space-md">
<Link className="text-headline-md font-headline-md font-extrabold text-on-primary tracking-tight block" to="/">
<span>FERRE</span><span className="text-secondary-container">MAX</span>
</Link>
<p className="text-body-md font-body-md text-on-primary-container leading-relaxed">
            Distribución ferretera y materiales para la construcción. Soluciones para profesionales de la obra y el hogar.
          </p>
</div>
<div>
<h4 className="text-label-lg font-label-lg text-on-primary uppercase font-bold tracking-wider mb-space-md">
            Categorías
          </h4>
<ul className="space-y-2 text-body-md font-body-md text-on-primary-container">
{Object.keys(ICONO_CATEGORIA).map((c) => (
<li key={c}><Link className="hover:text-on-primary transition-colors" to={`/busqueda?categoria=${encodeURIComponent(c)}`}>{c}</Link></li>
))}
</ul>
</div>
<div>
<h4 className="text-label-lg font-label-lg text-on-primary uppercase font-bold tracking-wider mb-space-md">
            Ayuda y Soporte
          </h4>
<ul className="space-y-2 text-body-md font-body-md text-on-primary-container">
<li><Link className="hover:text-on-primary transition-colors" to="/mi-cuenta">Mi cuenta</Link></li>
<li><Link className="hover:text-on-primary transition-colors" to="/carrito">Carrito de compras</Link></li>
<li><span>Libro de Reclamaciones</span></li>
</ul>
</div>
<div className="space-y-space-md">
<h4 className="text-label-lg font-label-lg text-on-primary uppercase font-bold tracking-wider">
            Medios de pago
          </h4>
<div className="flex flex-wrap items-center gap-2">
<span className="bg-surface-container-lowest text-primary text-[11px] font-bold px-2 py-1 rounded">VISA</span>
<span className="bg-surface-container-lowest text-primary text-[11px] font-bold px-2 py-1 rounded">Mastercard</span>
<span className="bg-purple-900 text-on-primary text-[11px] font-bold px-2 py-1 rounded">Yape</span>
<span className="bg-sky-600 text-on-primary text-[11px] font-bold px-2 py-1 rounded">Plin</span>
</div>
</div>
</div>
<div className="border-t border-primary-container mt-space-xl pt-space-lg flex flex-col md:flex-row items-center justify-between text-body-sm font-body-sm text-on-primary-container gap-4">
<p>© 2026 FerreMax - Proyecto de Tesis UPN.</p>
</div>
</div>
</footer>

    </>
  );
}
