import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { soles } from "../lib/api";
import { useTienda } from "../lib/tienda";
import EtiquetaModo from "../components/EtiquetaModo";

const CATEGORIAS = ["Pinturas y Acabados", "Herramientas", "Construcción y Estructuras", "Electricidad", "Gasfitería", "Ferretería General"];
const numeroPedido = (id) => String(id ?? "").padStart(6, "0");

// Pantalla de maqueta: el cliente se identifica solo por su código anónimo de la sesión de evaluación.
// Solo se muestra el pedido confirmado en esta visita (no hay historial por cliente en el backend).
// Sin bloque de recomendaciones: esta pantalla se visita después de confirmar y no debe registrar listas.
export default function MiCuenta() {
  const navigate = useNavigate();
  const { sesion, unidades, subtotal, ultimoPedido } = useTienda();
  const [texto, setTexto] = useState("");
  const codigo = sesion?.codigo_cliente || null;

  const buscar = (e) => {
    e.preventDefault();
    const q = texto.trim();
    if (q) navigate(`/busqueda?q=${encodeURIComponent(q)}`);
  };

  const pedido = ultimoPedido;
  const fecha = pedido?.fecha ? new Date(pedido.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "";

  return (
    <>

{/*  1. Barra superior institucional azul marino  */}
<aside className="w-full bg-[#0F2A4A] text-white text-xs border-b border-[#1E3A5F] select-none">
<div className="w-full max-w-[1360px] mx-auto px-4 lg:px-10 h-9 flex items-center justify-between">
<div className="flex items-center space-x-2">
<span className="material-symbols-outlined text-[17px] text-[#FFB694]">local_shipping</span>
<span className="font-body-sm font-medium tracking-wide">Envíos a todo el Perú · Delivery rápido en Lima Metropolitana</span>
<span className="hidden md:inline-block bg-[#1B3B60] text-[#93C5FD] px-2 py-0.5 rounded text-[11px] font-semibold">Tesis UPN 2026</span>
</div>
<div className="flex items-center space-x-6 text-[13px]">
<div className="flex items-center space-x-1.5 text-white/90">
<span className="material-symbols-outlined text-[16px] text-[#FFB694]">call</span>
<span className="font-label-sm font-semibold tracking-wide">(01) 712 3456</span>
</div>
<Link className="hover:text-[#FFB694] transition-colors flex items-center gap-1 font-medium" to="/mi-cuenta">
<span className="material-symbols-outlined text-[16px]">inventory_2</span>
<span>Seguimiento de pedidos</span>
</Link>
</div>
</div>
</aside>
{/*  2. Cabecera principal blanca  */}
<header className="sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant/40 shadow-sm transition-shadow">
<div className="w-full max-w-[1360px] mx-auto px-4 lg:px-10 h-20 flex items-center justify-between gap-6">
<Link className="flex items-center gap-1 flex-shrink-0 cursor-pointer select-none" to="/">
<span className="text-3xl font-extrabold tracking-tight text-[#0F2A4A]">FERRE</span><span className="text-3xl font-extrabold tracking-tight text-[#F26B1D]">MAX</span>
<span className="ml-2 text-[10px] font-semibold text-[#0F2A4A]/60 uppercase tracking-widest border border-slate-200 px-1.5 py-0.5 rounded">Perú</span>
</Link>
<form className="flex-1 max-w-2xl relative" onSubmit={buscar}>
<div className="relative flex items-center">
<input className="w-full h-11 pl-4 pr-12 bg-white border border-slate-300 rounded-lg text-sm text-[#0F2A4A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2A4A] focus:border-transparent transition-all shadow-inner" placeholder="¿Qué necesitas hacer? Ej.: pintar una pared, vaciar un techo..." type="text" value={texto} onChange={(e) => setTexto(e.target.value)}/>
<button aria-label="Buscar producto" className="absolute right-1 top-1 bottom-1 px-3.5 bg-[#0F2A4A] hover:bg-[#1E3A5F] active:bg-[#0A1D33] text-white rounded-md flex items-center justify-center transition-colors" type="submit">
<span className="material-symbols-outlined text-[20px]">search</span>
</button>
</div>
</form>
<div className="flex items-center space-x-5 flex-shrink-0">
<Link className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 group" to="/mi-cuenta">
<div className="w-9 h-9 rounded-full bg-[#0F2A4A]/10 text-[#0F2A4A] flex items-center justify-center group-hover:bg-[#0F2A4A] group-hover:text-white transition-colors">
<span className="material-symbols-outlined text-[20px]">person</span>
</div>
<div className="text-left leading-tight">
<span className="block text-[11px] text-slate-500 font-medium">{codigo ? `Hola, ${codigo}` : "Hola, inicia sesión"}</span>
<span className="block text-sm font-bold text-[#0F2A4A] group-hover:text-[#F26B1D] transition-colors">Mi cuenta</span>
</div>
</Link>
<div className="h-8 w-px bg-slate-200"></div>
<Link className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 group" to="/carrito">
<div className="relative flex items-center justify-center">
<span className="material-symbols-outlined text-[28px] text-[#0F2A4A]">shopping_cart</span>
<span className="absolute -top-1.5 -right-2 bg-[#F26B1D] text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{unidades}</span>
</div>
<div className="text-left leading-tight hidden xl:block">
<span className="block text-[11px] text-slate-500 font-medium">Carrito</span>
<span className="block text-sm font-bold text-[#0F2A4A]">{soles(subtotal)}</span>
</div>
</Link>
</div>
</div>
</header>
{/*  3. Menú de navegación inferior  */}
<nav className="bg-white border-b border-slate-200 shadow-sm relative z-30">
<div className="w-full max-w-[1360px] mx-auto px-4 lg:px-10 h-11 flex items-center justify-between">
<div className="flex items-center space-x-6 h-full">
<Link className="h-full bg-[#0F2A4A] hover:bg-[#1E3A5F] text-white px-4 flex items-center gap-2 font-label-md text-xs font-semibold rounded-t transition-colors tracking-wide" to="/busqueda">
<span className="material-symbols-outlined text-[18px]">menu</span>
<span>Todas las categorías</span>
</Link>
<div className="flex items-center space-x-6 text-sm font-medium text-slate-700">
<Link className="hover:text-[#F26B1D] transition-colors py-2" to="/">Inicio</Link>
<Link className="hover:text-[#F26B1D] transition-colors py-2" to="/busqueda">Productos</Link>
<Link className="hover:text-[#F26B1D] transition-colors py-2" to="/busqueda">Categorías</Link>
</div>
</div>
</div>
</nav>
{/*  4. Área principal de contenido  */}
<main className="flex-1 w-full max-w-[1360px] mx-auto px-4 lg:px-10 py-6">
<nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 mb-4">
<Link className="hover:text-[#0F2A4A] transition-colors flex items-center gap-1" to="/">
<span className="material-symbols-outlined text-[14px]">home</span>
<span>Inicio</span>
</Link>
<span className="text-slate-400">/</span>
<Link className="hover:text-[#0F2A4A] transition-colors" to="/mi-cuenta">Mi cuenta</Link>
<span className="text-slate-400">/</span>
<span aria-current="page" className="text-slate-800 font-semibold">Mis pedidos</span>
</nav>
{/*  Encabezado de bienvenida  */}
<section className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
<div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-full bg-[#0F2A4A] text-white flex items-center justify-center font-bold text-lg ring-4 ring-[#0F2A4A]/10">
<span className="material-symbols-outlined text-[28px]">person</span>
</div>
<div>
<div className="flex items-center gap-2.5">
<h1 className="text-xl md:text-2xl font-bold text-[#0F2A4A]">{codigo ? `Hola, ${codigo}` : "Hola"}</h1>
<span className="hidden sm:inline-flex bg-amber-50 text-amber-800 text-[11px] font-semibold px-2.5 py-0.5 rounded border border-amber-200">
              Perfil experimental · Tesis UPN 2026
            </span>
</div>
<p className="text-sm text-slate-600 mt-1">
            {codigo ? "Revisa el pedido que registraste en esta visita." : "No hay una sesión de evaluación activa. Los clientes se identifican solo por un código anónimo."}
          </p>
</div>
</div>
</section>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
{/*  Menú lateral  */}
<aside className="lg:col-span-3 space-y-4">
<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 divide-y divide-slate-100">
<div className="pb-2 space-y-1">
<span className="flex items-center justify-between px-3.5 py-2.5 text-sm font-bold text-[#F26B1D] bg-[#FFF3EB] border-l-4 border-[#F26B1D] rounded-r-lg">
<span className="flex items-center gap-3">
<span className="material-symbols-outlined text-[20px] text-[#F26B1D]">package_2</span>
<span>Mis pedidos</span>
</span>
</span>
<Link className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0F2A4A] rounded-lg transition-colors group" to="/carrito">
<span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-[#0F2A4A] transition-colors">shopping_cart</span>
<span>Mi carrito</span>
</Link>
<Link className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0F2A4A] rounded-lg transition-colors group" to="/">
<span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-[#0F2A4A] transition-colors">storefront</span>
<span>Ir a la tienda</span>
</Link>
</div>
<div className="pt-2">
<Link className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group" to="/login">
<span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-red-600 transition-colors">logout</span>
<span>Cerrar sesión</span>
</Link>
</div>
</div>
<div className="bg-slate-100/80 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600">
<div className="flex items-start gap-2">
<span className="material-symbols-outlined text-[18px] text-slate-500 mt-0.5">info</span>
<div>
<p className="font-semibold text-slate-800">Entorno de Pruebas UPN</p>
<p className="text-[11px] text-slate-500 mt-0.5">
{codigo ? <>Sesión experimental <span className="font-mono font-bold text-slate-700">{codigo}</span> activa. </> : <>Sin sesión experimental activa. </>}
<EtiquetaModo prefijo="Recomendador en modo: " />.
</p>
</div>
</div>
</div>
</aside>
{/*  Mis pedidos  */}
<section className="lg:col-span-9 space-y-6">
<div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
<div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
<div>
<h2 className="text-2xl font-bold text-[#0F2A4A] tracking-tight">Mis pedidos</h2>
<p className="text-xs text-slate-500 mt-0.5">Pedido confirmado en esta visita</p>
</div>
</div>
{!pedido ? (
<div className="py-10 text-center space-y-3">
<span className="material-symbols-outlined text-[44px] text-slate-300">package_2</span>
<p className="text-sm text-slate-600">Aún no has registrado pedidos en esta visita.</p>
<Link className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F2A4A] hover:text-[#F26B1D] border border-slate-300 hover:border-[#F26B1D] px-3 py-2 rounded transition-all" to="/">
<span className="material-symbols-outlined text-[16px]">storefront</span>
<span>Ir a la tienda</span>
</Link>
</div>
) : (
<div className="overflow-x-auto mt-4">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
<th className="py-3 px-4" scope="col">N° pedido</th>
<th className="py-3 px-3" scope="col">Fecha</th>
<th className="py-3 px-4" scope="col">Productos</th>
<th className="py-3 px-4 text-right" scope="col">Total</th>
<th className="py-3 px-4 text-center" scope="col">Estado</th>
<th className="py-3 px-4 text-right" scope="col">Acción</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-100 text-sm">
<tr className="hover:bg-amber-50/30 transition-colors">
<td className="py-4 px-4 whitespace-nowrap">
<div className="font-bold text-[#0F2A4A] flex items-center gap-1.5">
<span>#{numeroPedido(pedido.id_pedido)}</span>
</div>
</td>
<td className="py-4 px-3 whitespace-nowrap text-xs text-slate-600 font-medium">{fecha}</td>
<td className="py-4 px-4 text-xs text-slate-700 max-w-xs">
{pedido.items.map((i, n) => (
<React.Fragment key={i.sku}>
<span className="font-medium text-slate-900">{i.cantidad}x</span> {i.nombre}{n < pedido.items.length - 1 ? ", " : ""}
</React.Fragment>
))}
<span className="block text-[11px] text-slate-400 mt-0.5">({pedido.items.length} {pedido.items.length === 1 ? "ítem" : "ítems"})</span>
</td>
<td className="py-4 px-4 whitespace-nowrap text-right font-extrabold text-[#0F2A4A]">{soles(pedido.total)}</td>
<td className="py-4 px-4 whitespace-nowrap text-center">
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
<span className="w-2 h-2 rounded-full bg-amber-500"></span>
<span>Registrado</span>
</span>
</td>
<td className="py-4 px-4 whitespace-nowrap text-right">
<Link className="text-xs font-bold text-[#0F2A4A] hover:text-[#F26B1D] border border-slate-300 hover:border-[#F26B1D] px-2.5 py-1.5 rounded transition-all" to="/pedido-registrado">
                      Ver detalle
                    </Link>
</td>
</tr>
</tbody>
</table>
</div>
)}
</div>
</section>
</div>
</main>
{/*  5. Pie de página institucional azul marino  */}
<footer className="bg-[#0F2A4A] text-white mt-12 border-t border-[#1E3A5F]">
<div className="w-full max-w-[1360px] mx-auto px-4 lg:px-10 py-12">
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
<div>
<Link className="flex items-center gap-1 mb-3" to="/">
<span className="text-2xl font-extrabold tracking-tight text-white">FERRE</span><span className="text-2xl font-extrabold tracking-tight text-[#F26B1D]">MAX</span>
</Link>
<p className="text-xs text-slate-300 leading-relaxed mb-3">
            Distribución ferretera, materiales de construcción y acabados para obras residenciales y comerciales.
          </p>
</div>
<div>
<h4 className="text-sm font-bold uppercase tracking-wider text-[#FFB694] mb-3">Categorías</h4>
<ul className="text-xs space-y-2 text-slate-300">
{CATEGORIAS.map((c) => (
<li key={c}><Link className="hover:text-white transition-colors" to={`/busqueda?categoria=${encodeURIComponent(c)}`}>{c}</Link></li>
))}
</ul>
</div>
<div>
<h4 className="text-sm font-bold uppercase tracking-wider text-[#FFB694] mb-3">Atención</h4>
<div className="space-y-3 text-xs text-slate-300">
<div className="flex items-start gap-2">
<span className="material-symbols-outlined text-[18px] text-[#FFB694] mt-0.5">phone_in_talk</span>
<p className="font-bold text-white text-sm">(01) 712 3456</p>
</div>
<div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
<span className="bg-white/10 px-2 py-0.5 rounded text-[11px]">Visa</span>
<span className="bg-white/10 px-2 py-0.5 rounded text-[11px]">Mastercard</span>
<span className="bg-white/10 px-2 py-0.5 rounded text-[11px]">Yape / Plin</span>
</div>
</div>
</div>
</div>
<div className="border-t border-slate-700/80 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-4">
<p className="text-center md:text-left">
          © 2026 FerreMax - Tesis: Sistema web basado en Machine Learning para la recomendación de productos - UPN 2026.
        </p>
</div>
</div>
</footer>

    </>
  );
}
