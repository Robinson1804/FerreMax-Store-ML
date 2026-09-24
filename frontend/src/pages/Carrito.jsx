import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { soles } from "../lib/api";
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

// Bloque de recomendaciones según el carrito. Se monta solo cuando el carrito tiene productos,
// para no registrar RECOM_MOSTRADA de una lista que el cliente no ve.
function RecomendadoCarrito({ skus }) {
  const { agregar } = useTienda();
  const navigate = useNavigate();
  const { lista, cargando } = useRecomendaciones("carrito", skus, 5);

  return (
<div className="bg-[#FFF3EA] border border-[#FBD7C0] rounded-xl p-space-lg shadow-sm relative overflow-hidden">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#F5C7A9]">
<div className="flex items-center space-x-2.5">
<div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-surface-container-lowest shrink-0 shadow-sm">
<span className="material-symbols-outlined text-xl" data-icon="auto_awesome">auto_awesome</span>
</div>
<div>
<h2 className="text-headline-sm font-headline-sm font-extrabold text-primary-container">¿Te falta algo? Recomendado según tu carrito</h2>
<p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Complementos sugeridos para los productos de tu carrito.</p>
</div>
</div>
<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-surface-container-lowest text-label-sm font-label-sm font-bold tracking-wide uppercase shadow-sm self-start sm:self-auto">
<span className="material-symbols-outlined text-xs" data-icon="psychology">psychology</span>
<span><EtiquetaModo /></span>
</div>
</div>
{cargando && lista.length === 0 && <p className="text-body-sm text-outline">Cargando recomendaciones…</p>}
{!cargando && lista.length === 0 && <p className="text-body-sm text-outline">No hay recomendaciones para tu carrito.</p>}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
{lista.map((p) => (
<div key={p.sku} className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all group">
<button type="button" className="text-left" onClick={() => navigate(`/detalle/${encodeURIComponent(p.sku)}?origen=RECOMENDACION&pos=${p.posicion}`)}>
<div className="h-28 bg-surface-container-low rounded-lg p-2 mb-3 flex items-center justify-center border border-surface-container-high">
<span className="material-symbols-outlined text-primary-container text-[56px] group-hover:scale-105 transition-transform duration-200">{iconoDe(p.categoria)}</span>
</div>
<span className="text-label-sm font-label-sm font-bold text-outline uppercase">{p.marca}</span>
<h4 className="text-body-md font-body-md font-bold text-primary-container leading-tight mt-0.5 line-clamp-2">{p.nombre}</h4>
<p className="text-body-sm text-outline mt-1">{p.subcategoria || p.categoria}</p>
</button>
<div className="mt-4 pt-3 border-t border-surface-container-high flex items-center justify-between">
<span className="text-price-md font-price-md text-primary-container font-extrabold">{soles(p.precio)}</span>
<button type="button" onClick={() => agregar(p, "RECOMENDACION", p.posicion)} className="bg-secondary-container hover:bg-secondary text-surface-container-lowest px-3 py-1.5 rounded-lg text-label-md font-label-md font-bold flex items-center gap-1 shadow-sm transition-colors active:scale-95">
<span className="material-symbols-outlined text-base" data-icon="add_shopping_cart">add_shopping_cart</span>
<span>+ Agregar</span>
</button>
</div>
</div>
))}
</div>
</div>
  );
}

export default function Carrito() {
  const navigate = useNavigate();
  const { sesion, carrito, unidades, subtotal, retirar, sumarUno } = useTienda();
  const [texto, setTexto] = useState("");

  const buscar = (e) => {
    e.preventDefault();
    const q = texto.trim();
    if (q) navigate(`/busqueda?q=${encodeURIComponent(q)}`);
  };
  const vaciar = () => carrito.forEach((i) => retirar(i.sku));
  const vacio = carrito.length === 0;

  return (
    <>

{/*  BARRA DE ANUNCIOS INSTITUCIONAL SUPERIOR  */}
<header className="w-full bg-primary-container text-surface-container-lowest text-label-md py-1.5 px-4 tracking-normal border-b border-primary">
<div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-2">
<div className="flex items-center space-x-6">
<div className="flex items-center space-x-1.5">
<span className="material-symbols-outlined text-sm text-secondary-fixed-dim" data-icon="local_shipping">local_shipping</span>
<span>Envíos a todo el Perú | Delivery rápido en Lima Metropolitana</span>
</div>
</div>
<div className="flex items-center space-x-6 text-on-primary-container">
<div className="flex items-center space-x-1 text-surface-container-lowest">
<span className="material-symbols-outlined text-sm text-secondary-fixed-dim" data-icon="support_agent">support_agent</span>
<span>Atención: (01) 712 3456</span>
</div>
<span className="text-outline">|</span>
<Link className="text-surface-container-lowest hover:text-secondary-fixed-dim transition-colors" to="/mi-cuenta">Seguimiento de pedidos</Link>
</div>
</div>
</header>
{/*  CABECERA PRINCIPAL  */}
<div className="bg-surface-container-lowest border-b border-outline-variant shadow-sm sticky top-0 z-40">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop py-3.5 flex items-center justify-between gap-6">
<Link className="flex items-center gap-1 group shrink-0" to="/">
<span className="text-headline-lg font-headline-lg font-extrabold text-primary-container tracking-tight">FERRE</span><span className="text-headline-lg font-headline-lg font-extrabold text-secondary-container tracking-tight">MAX</span>
</Link>
<div className="flex-1 max-w-2xl">
<form className="relative flex items-center" onSubmit={buscar}>
<input className="w-full h-11 pl-4 pr-12 text-body-md font-body-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all" placeholder="¿Qué necesitas hacer? Ej.: pintar una pared" type="text" value={texto} onChange={(e) => setTexto(e.target.value)}/>
<button className="absolute right-1 top-1 bottom-1 px-3.5 bg-primary-container text-surface-container-lowest rounded hover:bg-primary transition-colors flex items-center justify-center" type="submit">
<span className="material-symbols-outlined text-lg" data-icon="search">search</span>
</button>
</form>
</div>
<div className="flex items-center space-x-6 shrink-0">
<Link className="flex items-center space-x-2 text-on-surface hover:text-secondary transition-colors group" to="/mi-cuenta">
<span className="material-symbols-outlined text-2xl text-on-surface-variant group-hover:text-secondary" data-icon="person">person</span>
<div className="text-left text-label-md font-label-md leading-tight">
<span className="text-outline block text-label-sm font-label-sm">{sesion?.codigo_cliente ? `Hola, ${sesion.codigo_cliente}` : "Hola, inicia sesión"}</span>
<span className="text-primary-container font-bold">Mi cuenta</span>
</div>
</Link>
<Link className="flex items-center space-x-3 bg-surface-container-low hover:bg-surface-container py-2 px-3.5 rounded-lg border border-outline-variant transition-all" to="/carrito">
<div className="relative flex items-center">
<span className="material-symbols-outlined text-2xl text-primary-container" data-icon="shopping_cart">shopping_cart</span>
<span className="absolute -top-2 -right-2 bg-secondary-container text-on-primary text-label-sm font-label-sm font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">{unidades}</span>
</div>
<div className="text-left">
<span className="block text-label-sm font-label-sm text-outline uppercase font-semibold">Carrito</span>
<span className="text-label-lg font-label-lg font-extrabold text-primary-container">{soles(subtotal)}</span>
</div>
</Link>
</div>
</div>
<div className="border-t border-surface-container-high bg-surface-container-lowest">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop flex items-center justify-between text-body-md">
<div className="flex items-center space-x-8">
<Link className="bg-primary-container text-surface-container-lowest px-4 py-2.5 flex items-center space-x-2 font-label-lg font-semibold hover:bg-primary transition-colors" to="/busqueda">
<span className="material-symbols-outlined text-xl" data-icon="menu">menu</span>
<span>Todas las categorías</span>
</Link>
<nav className="hidden md:flex items-center space-x-7 py-2.5">
<Link className="text-on-surface font-label-lg hover:text-secondary transition-colors" to="/">Inicio</Link>
<Link className="text-on-surface font-label-lg hover:text-secondary transition-colors" to="/busqueda">Productos</Link>
<Link className="text-on-surface font-label-lg hover:text-secondary transition-colors" to="/busqueda">Categorías</Link>
</nav>
</div>
<div className="flex items-center space-x-4 text-label-md text-on-surface-variant">
<span className="flex items-center gap-1 font-semibold text-primary-container">
<span className="material-symbols-outlined text-base text-secondary-container" data-icon="store">store</span>
            Venta Corporativa &amp; Mayoristas
          </span>
</div>
</div>
</div>
</div>
{/*  CONTENIDO PRINCIPAL: CARRITO DE COMPRAS  */}
<main className="flex-grow w-full max-w-[1360px] mx-auto px-margin-desktop py-space-lg">
<nav className="flex items-center space-x-2 text-label-md font-label-md text-outline mb-space-md">
<Link className="hover:text-primary-container transition-colors" to="/">Inicio</Link>
<span className="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
<span className="text-primary-container font-bold">Carrito de compras</span>
</nav>
<div className="flex items-baseline justify-between mb-space-lg border-b border-outline-variant pb-space-sm">
<div className="flex items-baseline gap-3">
<h1 className="text-headline-lg font-headline-lg font-extrabold text-primary-container">Tu carrito</h1>
<span className="text-headline-sm font-headline-sm font-normal text-outline">({unidades} {unidades === 1 ? "producto" : "productos"})</span>
</div>
</div>
{vacio ? (
<section className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-space-xl shadow-sm text-center space-y-4">
<span className="material-symbols-outlined text-[56px] text-outline" data-icon="remove_shopping_cart">remove_shopping_cart</span>
<h2 className="text-headline-sm font-headline-sm font-extrabold text-primary-container">Tu carrito está vacío</h2>
<p className="text-body-md text-on-surface-variant">Busca lo que necesitas para tu proyecto y agrégalo aquí.</p>
<Link className="inline-flex items-center gap-2 h-11 px-6 bg-secondary-container hover:bg-secondary text-surface-container-lowest font-label-lg font-bold rounded-lg shadow-sm transition-colors" to="/">
<span className="material-symbols-outlined text-xl" data-icon="storefront">storefront</span>
<span>Ir a la tienda</span>
</Link>
</section>
) : (
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
{/*  COLUMNA IZQUIERDA (Artículos + Recomendaciones)  */}
<section className="lg:col-span-8 flex flex-col space-y-space-lg">
<div className="bg-surface-container-lowest border border-surface-container-high rounded-xl overflow-hidden shadow-sm">
<div className="hidden sm:grid sm:grid-cols-12 px-6 py-3 bg-surface-container-low text-label-sm font-label-sm uppercase tracking-wider text-outline border-b border-surface-container-high font-bold">
<div className="col-span-6">Producto</div>
<div className="col-span-2 text-center">Precio Unit.</div>
<div className="col-span-2 text-center">Cantidad</div>
<div className="col-span-2 text-right">Subtotal</div>
</div>
<div className="divide-y divide-surface-container-high">
{carrito.map((i) => (
<div key={i.sku} className="p-6 transition-colors hover:bg-surface-container-lowest/60 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center">
<div className="col-span-6 flex items-center gap-4 w-full">
<Link to={`/detalle/${encodeURIComponent(i.sku)}`} className="w-20 h-20 bg-surface-container-low rounded-lg p-1.5 flex items-center justify-center shrink-0 border border-outline-variant/30">
<span className="material-symbols-outlined text-primary-container text-[40px]">{iconoDe(i.categoria)}</span>
</Link>
<div className="flex-1">
<span className="text-label-sm font-label-sm font-bold text-outline uppercase tracking-wider">{i.marca}</span>
<h3 className="text-body-lg font-body-lg font-bold text-primary-container leading-snug">{i.nombre}</h3>
<div className="flex items-center gap-3 mt-1">
<span className="text-body-sm font-body-sm text-outline">SKU: {i.sku}</span>
{i.stock > 0 && (
<span className="inline-flex items-center gap-1 text-label-sm font-label-sm font-semibold text-secondary-container">
<span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>
                      En stock
                    </span>
)}
</div>
<button type="button" onClick={() => retirar(i.sku)} className="mt-2 text-label-md font-label-md text-error hover:text-on-error-container flex items-center gap-1 transition-colors">
<span className="material-symbols-outlined text-base" data-icon="delete">delete</span>
<span>Quitar</span>
</button>
</div>
</div>
<div className="col-span-2 text-center w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center">
<span className="sm:hidden text-body-sm text-outline">Precio:</span>
<span className="text-body-md font-body-md font-semibold text-on-surface">{soles(i.precio)} <span className="text-body-sm font-normal text-outline">c/u</span></span>
</div>
<div className="col-span-2 flex justify-center w-full sm:w-auto">
<div className="flex items-center border border-outline-variant rounded-lg bg-surface-container-lowest overflow-hidden">
<button type="button" onClick={() => retirar(i.sku, false)} aria-label="Disminuir cantidad" className="w-8 h-9 flex items-center justify-center text-primary-container hover:bg-surface-container transition-colors">
<span className="material-symbols-outlined text-sm font-bold" data-icon="remove">remove</span>
</button>
<span className="w-10 text-center font-bold text-body-md font-body-md text-primary-container">{i.cantidad}</span>
<button type="button" onClick={() => sumarUno(i.sku)} disabled={i.stock > 0 && i.cantidad >= i.stock} aria-label="Aumentar cantidad" className="w-8 h-9 flex items-center justify-center text-primary-container hover:bg-surface-container transition-colors disabled:opacity-40">
<span className="material-symbols-outlined text-sm font-bold" data-icon="add">add</span>
</button>
</div>
</div>
<div className="col-span-2 text-right w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
<span className="sm:hidden text-body-sm text-outline">Subtotal:</span>
<span className="text-price-md font-price-md text-primary-container font-extrabold">{soles(i.precio * i.cantidad)}</span>
</div>
</div>
))}
</div>
<div className="p-4 bg-surface-container-low/50 border-t border-surface-container-high flex flex-wrap items-center justify-between gap-4">
<Link className="text-label-md font-label-md font-semibold text-primary-container hover:text-secondary-container flex items-center gap-1 transition-colors" to="/">
<span className="material-symbols-outlined text-base" data-icon="arrow_back">arrow_back</span>
<span>Continuar explorando el catálogo</span>
</Link>
<button type="button" onClick={vaciar} className="text-label-md font-label-md text-outline hover:text-error transition-colors flex items-center gap-1">
<span className="material-symbols-outlined text-base" data-icon="remove_shopping_cart">remove_shopping_cart</span>
<span>Vaciar todo el carrito</span>
</button>
</div>
</div>
{/*  MÓDULO DE RECOMENDACIÓN SEGÚN EL CARRITO (modo activo)  */}
<RecomendadoCarrito skus={carrito.map((i) => i.sku)} />
</section>
{/*  COLUMNA DERECHA (Resumen de Compra Sticky)  */}
<aside className="lg:col-span-4 sticky top-28 space-y-space-md">
<div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-6 shadow-sm">
<h2 className="text-headline-sm font-headline-sm font-extrabold text-primary-container border-b border-surface-container-high pb-4">
            Resumen de compra
          </h2>
<div className="py-4 space-y-3">
<div className="flex items-center justify-between text-body-md">
<span className="text-on-surface-variant">Subtotal ({unidades} {unidades === 1 ? "producto" : "productos"})</span>
<span className="font-bold text-on-surface">{soles(subtotal)}</span>
</div>
<div className="flex items-center justify-between text-body-md">
<span className="text-on-surface-variant flex items-center gap-1">
<span>Envío</span>
<span className="material-symbols-outlined text-sm text-outline cursor-help" title="El envío no se incluye en el total; se coordina según la modalidad de entrega">info</span>
</span>
<span className="text-outline italic text-body-sm font-medium">Por coordinar</span>
</div>
<div className="pt-3 border-t border-surface-container-high flex items-baseline justify-between">
<div>
<span className="text-headline-sm font-headline-sm font-extrabold text-primary-container block">Total</span>
<span className="text-label-sm font-label-sm text-outline">Precios con I.G.V.</span>
</div>
<span className="text-price-lg font-price-lg font-extrabold text-primary-container">{soles(subtotal)}</span>
</div>
</div>
<div className="space-y-3 pt-2 border-t border-surface-container-high">
<Link className="w-full h-12 bg-secondary-container hover:bg-secondary text-surface-container-lowest font-label-lg font-bold rounded-lg flex items-center justify-center space-x-2 shadow-sm transition-all duration-150 active:scale-98" to="/confirmar">
<span className="material-symbols-outlined text-xl" data-icon="lock">lock</span>
<span>Continuar con el pedido</span>
</Link>
<Link className="block text-center text-label-md font-label-md font-semibold text-primary-container hover:text-secondary-container transition-colors" to="/">
              ← Seguir comprando
            </Link>
</div>
<div className="mt-4 pt-3 border-t border-surface-container-high text-center">
<p className="text-label-sm font-label-sm text-outline flex items-center justify-center gap-1">
<span className="material-symbols-outlined text-xs" data-icon="schedule">schedule</span>
<span>Al confirmar se registra la hora de cierre de tu selección.</span>
</p>
</div>
</div>
<div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-5 shadow-sm space-y-4">
<div className="flex items-start space-x-3">
<div className="w-8 h-8 rounded-full bg-primary-container/5 text-primary-container flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-lg" data-icon="receipt_long">receipt_long</span>
</div>
<div>
<h4 className="text-label-md font-label-md font-bold text-primary-container">Boleta o Factura Electrónica</h4>
<p className="text-body-sm text-outline">Comprobantes para personas y empresas.</p>
</div>
</div>
<div className="pt-3 border-t border-surface-container-high">
<span className="text-label-sm font-label-sm text-outline uppercase font-bold block mb-2 text-center">Medios de pago disponibles</span>
<div className="flex items-center justify-center gap-2 flex-wrap text-outline font-bold text-xs">
<span className="px-2 py-1 bg-surface-container-low rounded border border-outline-variant/40">VISA</span>
<span className="px-2 py-1 bg-surface-container-low rounded border border-outline-variant/40">MASTERCARD</span>
<span className="px-2 py-1 bg-surface-container-low rounded border border-outline-variant/40">YAPE</span>
<span className="px-2 py-1 bg-surface-container-low rounded border border-outline-variant/40">PLIN</span>
<span className="px-2 py-1 bg-surface-container-low rounded border border-outline-variant/40">EFECTIVO</span>
</div>
</div>
</div>
</aside>
</div>
)}
</main>
{/*  FOOTER INSTITUCIONAL  */}
<footer className="bg-primary-container text-surface-container-lowest mt-space-xl border-t border-primary">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop py-space-xl">
<div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-desktop mb-space-lg">
<div className="space-y-4">
<Link className="flex items-center gap-1" to="/">
<span className="text-headline-md font-headline-md font-extrabold text-surface-container-lowest tracking-tight">FERRE</span><span className="text-headline-md font-headline-md font-extrabold text-secondary-container tracking-tight">MAX</span>
</Link>
<p className="text-body-md font-body-md text-on-primary-container leading-relaxed">
            Suministros para la construcción, ferretería y mejoramiento del hogar.
          </p>
</div>
<div>
<h3 className="text-headline-sm font-headline-sm font-bold text-surface-container-lowest mb-4">Categorías</h3>
<ul className="space-y-2 text-body-md font-body-md text-on-primary-container">
{Object.keys(ICONO_CATEGORIA).map((c) => (
<li key={c}><Link className="hover:text-surface-container-lowest transition-colors" to={`/busqueda?categoria=${encodeURIComponent(c)}`}>{c}</Link></li>
))}
</ul>
</div>
<div>
<h3 className="text-headline-sm font-headline-sm font-bold text-surface-container-lowest mb-4">Ayuda y Soporte</h3>
<ul className="space-y-2 text-body-md font-body-md text-on-primary-container">
<li><Link className="hover:text-surface-container-lowest transition-colors" to="/mi-cuenta">Mi cuenta</Link></li>
<li><span>Libro de Reclamaciones</span></li>
</ul>
</div>
</div>
<div className="border-t border-primary pt-6 mt-6 flex flex-col md:flex-row items-center justify-between text-body-sm font-body-sm text-on-primary-container gap-4">
<p>© 2026 FerreMax - Tesis: Sistema web basado en Machine Learning para la recomendación de productos - UPN 2026.</p>
</div>
</div>
</footer>

    </>
  );
}
