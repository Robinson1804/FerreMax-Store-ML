import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { soles } from "../lib/api";
import { useTienda } from "../lib/tienda";
import ImagenProducto from "../components/ImagenProducto";

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
const numeroPedido = (id) => String(id ?? "").padStart(6, "0");

// Sin bloque de recomendaciones: después de confirmar no se registran más listas (BRIEF §3).
export default function PedidoRegistrado() {
  const navigate = useNavigate();
  const { sesion, unidades, subtotal, ultimoPedido } = useTienda();
  const [texto, setTexto] = useState("");

  const buscar = (e) => {
    e.preventDefault();
    const q = texto.trim();
    if (q) navigate(`/busqueda?q=${encodeURIComponent(q)}`);
  };

  const pedido = ultimoPedido;
  const items = pedido?.items || [];
  const articulos = items.reduce((s, i) => s + i.cantidad, 0);
  const esRecojo = (pedido?.entrega || "").toLowerCase().includes("recojo");
  const fecha = pedido?.fecha ? new Date(pedido.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : null;

  return (
    <>

{/*  1. BARRA SUPERIOR INSTITUCIONAL AZUL MARINO  */}
<header className="w-full bg-[#0F2A4A] text-white text-xs py-2 px-4 border-b border-primary-container z-40">
<div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
<div className="flex items-center space-x-3 text-slate-200">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-orange-400" data-icon="local_shipping">local_shipping</span>
<span>Envíos a todo el Perú</span>
</div>
<span className="text-slate-400">·</span>
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-amber-300" data-icon="bolt">bolt</span>
<span>Delivery rápido en Lima Metropolitana</span>
</div>
</div>
<div className="flex items-center space-x-6 text-slate-200">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px]" data-icon="support_agent">support_agent</span>
<span className="font-medium">(01) 712 3456</span>
</div>
<Link className="hover:text-white transition-colors flex items-center gap-1" to="/mi-cuenta">
<span className="material-symbols-outlined text-[15px]" data-icon="inventory_2">inventory_2</span>
          Seguimiento de pedidos
        </Link>
</div>
</div>
</header>
{/*  2. CABECERA PRINCIPAL BLANCA  */}
<div className="w-full bg-surface-container-lowest border-b border-slate-200 sticky top-0 z-30 shadow-sm">
<div className="w-full max-w-[1360px] mx-auto px-4 md:px-margin-desktop py-3.5 flex items-center justify-between gap-6">
<Link className="flex items-center gap-1 tracking-tight text-3xl font-extrabold select-none" to="/">
<span className="text-[#0F2A4A]">FERRE</span><span className="text-[#F26B1D]">MAX</span>
</Link>
<form className="hidden md:flex flex-1 max-w-2xl mx-4" onSubmit={buscar}>
<div className="relative w-full flex items-center">
<input className="w-full h-11 pl-4 pr-12 text-sm bg-white border border-slate-300 rounded-lg text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2A4A] focus:border-transparent transition-all" placeholder="¿Qué necesitas hacer? Ej.: pintar una pared, fijar repisa..." type="text" value={texto} onChange={(e) => setTexto(e.target.value)}/>
<button type="submit" className="absolute right-1 top-1 bottom-1 px-3.5 bg-[#0F2A4A] hover:bg-[#00152f] text-white rounded-md flex items-center justify-center transition-colors">
<span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
</button>
</div>
</form>
<div className="flex items-center gap-5">
<Link className="flex items-center gap-2 text-primary hover:text-secondary transition-colors py-1 px-2 rounded-lg hover:bg-slate-50" to="/mi-cuenta">
<span className="material-symbols-outlined text-[26px] text-slate-700" data-icon="person">person</span>
<div className="text-left hidden lg:block leading-tight">
<p className="text-[11px] text-slate-500 font-normal">{sesion?.codigo_cliente ? `Hola, ${sesion.codigo_cliente}` : "Hola, inicia sesión"}</p>
<p className="text-xs font-semibold text-[#0F2A4A]">Mi Cuenta</p>
</div>
</Link>
<div className="h-6 w-[1px] bg-slate-200"></div>
<Link className="flex items-center gap-2.5 py-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[#0F2A4A] hover:border-slate-300 transition-colors" to="/carrito">
<div className="relative flex items-center">
<span className="material-symbols-outlined text-[24px] text-slate-600" data-icon="shopping_cart">shopping_cart</span>
<span className={`absolute -top-1.5 -right-2 ${unidades ? "bg-[#F26B1D]" : "bg-slate-400"} text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight`}>{unidades}</span>
</div>
<div className="text-left hidden sm:block">
<p className="text-[10px] text-slate-500 font-medium">Carrito</p>
<p className="text-xs font-bold text-[#0F2A4A]">{soles(subtotal)}</p>
</div>
</Link>
</div>
</div>
</div>
{/*  3. BARRA DE NAVEGACIÓN SECUNDARIA  */}
<nav className="w-full bg-white border-b border-slate-200 hidden md:block">
<div className="max-w-[1360px] mx-auto px-4 md:px-margin-desktop flex items-center justify-between text-sm">
<div className="flex items-center space-x-1">
<Link className="bg-[#0F2A4A] hover:bg-[#00152f] text-white px-5 py-2.5 flex items-center gap-2 font-medium transition-colors" to="/busqueda">
<span className="material-symbols-outlined text-[20px]" data-icon="menu">menu</span>
<span>Todas las categorías</span>
</Link>
<Link className="px-4 py-2.5 text-slate-700 hover:text-[#F26B1D] font-medium transition-colors" to="/">Inicio</Link>
<Link className="px-4 py-2.5 text-slate-700 hover:text-[#F26B1D] font-medium transition-colors" to="/busqueda">Productos</Link>
<Link className="px-4 py-2.5 text-slate-700 hover:text-[#F26B1D] font-medium transition-colors" to="/busqueda">Categorías</Link>
</div>
</div>
</nav>
{/*  4. CONTENIDO PRINCIPAL  */}
<main className="flex-grow py-6 px-4 md:px-margin-desktop">
<div className="max-w-[1360px] mx-auto">
<nav className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
<Link className="hover:text-primary flex items-center gap-1" to="/">
<span className="material-symbols-outlined text-[14px]" data-icon="home">home</span>
          Inicio
        </Link>
<span className="text-slate-300">/</span>
<Link className="hover:text-primary" to="/carrito">Carrito</Link>
<span className="text-slate-300">/</span>
<span className="text-[#0F2A4A] font-bold">Pedido registrado</span>
</nav>
{!pedido ? (
<div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 custom-shadow-card p-6 md:p-10 text-center space-y-4">
<span className="material-symbols-outlined text-[48px] text-slate-400" data-icon="receipt_long">receipt_long</span>
<h1 className="text-2xl font-extrabold text-[#0F2A4A]">No hay un pedido reciente</h1>
<p className="text-sm text-slate-600">Aún no has confirmado un pedido en esta visita.</p>
<Link className="inline-flex items-center justify-center gap-2 bg-[#F26B1D] hover:bg-[#DE5A10] text-white px-8 py-3.5 rounded-lg font-semibold text-sm transition-all" to="/">
<span className="material-symbols-outlined text-[20px]" data-icon="storefront">storefront</span>
            Ir a la tienda
          </Link>
</div>
) : (
<div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 custom-shadow-card p-6 md:p-10 transition-all">
{/*  ENCABEZADO DE ÉXITO CENTRADO  */}
<div className="text-center pb-6 border-b border-slate-100">
<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 mb-4 animate-bounce-short">
<span className="material-symbols-outlined text-[48px] text-emerald-600 font-bold" data-icon="check_circle" style={{"fontVariationSettings": "'FILL' 1"}}>check_circle</span>
</div>
<h1 className="text-2xl md:text-3xl font-extrabold text-[#0F2A4A] tracking-tight mb-2">
            ¡Pedido N° {numeroPedido(pedido.id_pedido)} registrado!
          </h1>
<p className="text-sm md:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
            Tu pedido quedó registrado{fecha ? ` el ${fecha}` : ""}{sesion?.codigo_cliente ? ` para el cliente ${sesion.codigo_cliente}` : ""}.
          </p>
<div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
{pedido.pago && (
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200">
<span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Medio de pago: {pedido.pago}
            </span>
)}
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
<span className="material-symbols-outlined text-[14px]" data-icon="receipt_long">receipt_long</span>
              Estado: Registrado
            </span>
</div>
</div>
{/*  DETALLES DEL PEDIDO  */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6 pt-2">
<div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
<div>
<div className="flex items-center gap-2 mb-3">
<span className="p-2 rounded-md bg-[#0F2A4A] text-white">
<span className="material-symbols-outlined text-[20px]">{esRecojo ? "store" : "local_shipping"}</span>
</span>
<div>
<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Modalidad de entrega</span>
<h3 className="font-bold text-sm text-[#0F2A4A]">{pedido.entrega || "Por coordinar"}</h3>
</div>
</div>
<div className="space-y-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200">
<div className="flex items-start gap-2">
<span className="material-symbols-outlined text-[16px] text-[#F26B1D] mt-0.5">info</span>
<span>{esRecojo ? "Presenta tu número de pedido al recoger en tienda." : "Nos comunicaremos para coordinar la fecha y el costo del envío."}</span>
</div>
</div>
</div>
<div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between bg-white p-3 rounded border border-slate-200">
<div>
<p className="text-[10px] uppercase font-bold text-slate-400">Número de pedido</p>
<p className="font-mono text-base font-extrabold text-[#0F2A4A] tracking-wider">{numeroPedido(pedido.id_pedido)}</p>
</div>
</div>
</div>
<div className="md:col-span-7 flex flex-col justify-between">
<div>
<div className="flex justify-between items-center mb-3">
<h3 className="font-bold text-sm text-[#0F2A4A] flex items-center gap-1.5">
<span className="material-symbols-outlined text-[18px] text-[#F26B1D]" data-icon="check_box">check_box</span>
                  Productos incluidos ({articulos} {articulos === 1 ? "artículo" : "artículos"})
                </h3>
</div>
<div className="divide-y divide-slate-100 text-xs">
{items.map((i) => (
<div key={i.sku} className="py-2.5 flex items-center justify-between gap-3">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded bg-[#F5F6F8] border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
<ImagenProducto producto={i} icono={iconoDe(i.categoria)} className="h-full w-full" iconoClassName="text-[22px] text-[#0F2A4A]" />
</div>
<div>
<h4 className="font-semibold text-slate-800 text-[13px] leading-snug">{i.nombre}</h4>
<p className="text-slate-400 text-[11px]">{i.marca} · Cant: {i.cantidad} {i.cantidad === 1 ? "unidad" : "unidades"}</p>
</div>
</div>
<div className="text-right">
<span className="font-bold text-slate-800 text-sm">{soles(i.precio * i.cantidad)}</span>
</div>
</div>
))}
</div>
</div>
<div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5">
<div className="flex justify-between text-xs text-slate-500">
<span>Subtotal productos:</span>
<span>{soles(pedido.total)}</span>
</div>
<div className="flex justify-between text-xs text-slate-500">
<span>Envío:</span>
<span className="text-emerald-700 font-semibold">{esRecojo ? "Sin costo" : "Por coordinar"}</span>
</div>
<div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
<span className="font-bold text-[#0F2A4A] text-sm">Total del pedido:</span>
<span className="text-2xl font-extrabold text-[#0F2A4A] tracking-tight">{soles(pedido.total)}</span>
</div>
</div>
</div>
</div>
{/*  BOTONES DE ACCIÓN PRINCIPALES  */}
<div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
<Link className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F26B1D] hover:bg-[#DE5A10] text-white px-8 py-3.5 rounded-lg font-semibold text-sm transition-all duration-150 shadow-sm active:scale-98" to="/mi-cuenta">
<span className="material-symbols-outlined text-[20px]" data-icon="visibility">visibility</span>
            Ver mis pedidos
          </Link>
<Link className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-[#0F2A4A] border-1.5 border-[#0F2A4A] px-8 py-3.5 rounded-lg font-semibold text-sm transition-all duration-150 border active:scale-98" to="/">
<span className="material-symbols-outlined text-[20px]" data-icon="storefront">storefront</span>
            Seguir comprando
          </Link>
</div>
</div>
)}
</div>
</main>
{/*  6. PIE DE PÁGINA INSTITUCIONAL AZUL MARINO  */}
<footer className="w-full bg-[#0F2A4A] text-slate-300 mt-12 border-t border-[#00152f]">
<div className="w-full max-w-[1360px] mx-auto px-4 md:px-margin-desktop py-12">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-700/60">
<div className="lg:col-span-2 space-y-4">
<Link className="inline-flex items-center gap-1 text-2xl font-extrabold tracking-tight" to="/">
<span className="text-white">FERRE</span><span className="text-[#F26B1D]">MAX</span>
</Link>
<p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Distribución de materiales de construcción, acabados y herramientas para maestros de obra, contratistas y proyectos del hogar.
          </p>
</div>
<div>
<h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Categorías</h4>
<ul className="space-y-2 text-xs text-slate-400">
{Object.keys(ICONO_CATEGORIA).map((c) => (
<li key={c}><Link className="hover:text-white transition-colors" to={`/busqueda?categoria=${encodeURIComponent(c)}`}>{c}</Link></li>
))}
</ul>
</div>
<div>
<h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Ayuda y Soporte</h4>
<ul className="space-y-2 text-xs text-slate-400">
<li><Link className="hover:text-white transition-colors" to="/mi-cuenta">Seguimiento de pedidos</Link></li>
<li><Link className="hover:text-white transition-colors" to="/carrito">Carrito de compras</Link></li>
</ul>
</div>
</div>
<div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
<div className="flex items-center gap-2 flex-wrap">
<span className="text-[11px] text-slate-400 mr-1">Medios de pago:</span>
<span className="px-2 py-0.5 bg-white text-slate-900 font-bold rounded text-[10px] border border-slate-200">VISA</span>
<span className="px-2 py-0.5 bg-white text-slate-900 font-bold rounded text-[10px] border border-slate-200">Mastercard</span>
<span className="px-2 py-0.5 bg-[#742284] text-white font-bold rounded text-[10px]">Yape</span>
<span className="px-2 py-0.5 bg-[#00D0B5] text-slate-950 font-bold rounded text-[10px]">Plin</span>
</div>
<div className="text-center md:text-right text-[11px] text-slate-400 leading-normal">
<p className="text-slate-500 mt-0.5 font-medium">Tesis: Sistema web basado en Machine Learning para la recomendación de productos - UPN 2026.</p>
</div>
</div>
</div>
</footer>

    </>
  );
}
