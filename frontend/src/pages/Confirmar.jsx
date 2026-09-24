import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { soles } from "../lib/api";
import { useTienda } from "../lib/tienda";

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

const ENTREGAS = [
  { valor: "Recojo en tienda", icono: "store", titulo: "Recojo en tienda · Sin costo", detalle: "Retira tu pedido en la tienda FerreMax presentando tu número de pedido.", costo: "Sin costo" },
  { valor: "Delivery en Lima Metropolitana", icono: "local_shipping", titulo: "Delivery programado en Lima Metropolitana", detalle: "Entrega en obra o domicilio. La fecha y el costo del envío se coordinan después de registrar el pedido.", costo: "Por coordinar" },
];
const PAGOS = [
  { valor: "Yape / Plin", icono: null, titulo: "Billeteras Digitales (Yape / Plin)", detalle: "Pago desde tu celular" },
  { valor: "Tarjeta de débito o crédito", icono: "credit_card", titulo: "Tarjeta de Débito o Crédito", detalle: "Visa, Mastercard" },
  { valor: "Efectivo", icono: "payments", titulo: "Efectivo", detalle: "Paga en caja al recoger o al recibir tu pedido" },
];

const opcionActiva = "block relative border-2 border-primary-container bg-surface-bright p-space-md rounded-xl cursor-pointer transition-all shadow-sm";
const opcionInactiva = "block border border-outline-variant hover:border-outline bg-surface-container-lowest p-space-md rounded-xl cursor-pointer transition-all";

export default function Confirmar() {
  const navigate = useNavigate();
  const { sesion, carrito, unidades, subtotal, confirmar } = useTienda();
  const [entrega, setEntrega] = useState(ENTREGAS[0].valor);
  const [pago, setPago] = useState(PAGOS[0].valor);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState("");

  const buscar = (e) => {
    e.preventDefault();
    const q = texto.trim();
    if (q) navigate(`/busqueda?q=${encodeURIComponent(q)}`);
  };

  // confirmar() registra CONFIRMACION_CARRITO en el backend (no se emite aquí)
  const realizarPedido = async () => {
    if (enviando || carrito.length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      await confirmar({ entrega, pago });
      navigate("/pedido-registrado");
    } catch (e) {
      const detalle = e.response?.data?.detail;
      setError(typeof detalle === "string" ? detalle : "No se pudo registrar el pedido. Inténtalo nuevamente.");
      setEnviando(false);
    }
  };

  const costoEntrega = ENTREGAS.find((o) => o.valor === entrega)?.costo;
  const vacio = carrito.length === 0;

  return (
    <>

{/*  1. Barra superior institucional  */}
<header className="w-full bg-primary-container text-on-primary">
<div className="max-w-[1360px] mx-auto px-margin-desktop py-1.5 flex items-center justify-between text-body-sm font-body-sm">
<div className="flex items-center space-x-2">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="local_shipping">local_shipping</span>
<span className="font-medium text-surface-container-lowest">Envíos a todo el Perú | Delivery rápido en Lima Metropolitana</span>
</div>
<div className="flex items-center space-x-6 text-on-primary-container">
<div className="flex items-center space-x-1.5">
<span className="material-symbols-outlined text-[16px]" data-icon="support_agent">support_agent</span>
<span>Atención: <strong className="text-on-primary font-semibold">(01) 712 3456</strong></span>
</div>
<Link className="flex items-center space-x-1 hover:text-on-primary transition-colors" to="/mi-cuenta">
<span className="material-symbols-outlined text-[16px]" data-icon="inventory_2">inventory_2</span>
<span>Seguimiento de pedidos</span>
</Link>
</div>
</div>
</header>
{/*  2. Cabecera principal blanca  */}
<nav className="w-full bg-surface-container-lowest border-b border-outline-variant shadow-sm sticky top-0 z-40">
<div className="max-w-[1360px] mx-auto px-margin-desktop py-space-sm flex items-center justify-between gap-6">
<Link className="flex items-center tracking-tight cursor-pointer" to="/">
<span className="text-headline-md font-headline-md font-extrabold text-primary-container">FERRE</span><span className="text-headline-md font-headline-md font-extrabold text-secondary-container">MAX</span>
</Link>
<form className="flex-1 max-w-2xl relative" onSubmit={buscar}>
<div className="relative flex items-center">
<input className="w-full h-11 pl-4 pr-12 text-body-md font-body-md rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all placeholder:text-outline" placeholder="¿Qué necesitas hacer? Ej.: pintar una pared" type="text" value={texto} onChange={(e) => setTexto(e.target.value)}/>
<button type="submit" className="absolute right-1 top-1 bottom-1 px-3.5 bg-primary-container text-on-primary rounded-lg flex items-center justify-center hover:bg-primary transition-colors cursor-pointer">
<span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
</button>
</div>
</form>
<div className="flex items-center space-x-5">
<Link className="flex items-center space-x-2.5 text-on-surface hover:text-secondary-container transition-colors py-1 cursor-pointer" to="/mi-cuenta">
<div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary-container">
<span className="material-symbols-outlined text-[22px]" data-icon="person">person</span>
</div>
<div className="flex flex-col text-left">
<span className="text-label-sm font-label-sm text-outline">{sesion?.codigo_cliente ? `Hola, ${sesion.codigo_cliente}` : "Hola, inicia sesión"}</span>
<span className="text-label-md font-label-md font-bold text-primary-container">Mi cuenta</span>
</div>
</Link>
<div className="h-8 w-px bg-outline-variant"></div>
<Link className="flex items-center space-x-2.5 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant hover:border-secondary-container transition-colors cursor-pointer" to="/carrito">
<div className="relative flex items-center justify-center text-primary-container">
<span className="material-symbols-outlined text-[24px]" data-icon="shopping_cart">shopping_cart</span>
<span className="absolute -top-1.5 -right-2 bg-secondary-container text-on-secondary text-label-sm font-label-sm font-bold min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center">{unidades}</span>
</div>
<div className="flex flex-col text-right">
<span className="text-label-sm font-label-sm text-outline">Carrito</span>
<span className="text-label-md font-label-md font-bold text-secondary-container">{soles(subtotal)}</span>
</div>
</Link>
</div>
</div>
<div className="border-t border-surface-container bg-surface-bright">
<div className="max-w-[1360px] mx-auto px-margin-desktop flex items-center justify-between">
<div className="flex items-center space-x-8">
<Link className="bg-primary-container text-on-primary px-4 py-2.5 rounded-t-lg flex items-center space-x-2 text-label-md font-label-md font-bold hover:bg-primary transition-colors cursor-pointer" to="/busqueda">
<span className="material-symbols-outlined text-[18px]" data-icon="menu">menu</span>
<span>Todas las categorías</span>
</Link>
<div className="flex items-center space-x-6 text-label-md font-label-md font-medium text-on-surface">
<Link className="hover:text-secondary-container transition-colors py-2" to="/">Inicio</Link>
<Link className="hover:text-secondary-container transition-colors py-2" to="/busqueda">Productos</Link>
<Link className="hover:text-secondary-container transition-colors py-2" to="/busqueda">Categorías</Link>
</div>
</div>
</div>
</div>
</nav>
<main className="flex-grow bg-surface pb-space-xl">
<div className="max-w-[1360px] mx-auto px-margin-desktop pt-space-md">
<nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-body-sm font-body-sm text-outline mb-space-sm">
<Link className="hover:text-primary-container transition-colors" to="/">Inicio</Link>
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
<Link className="hover:text-primary-container transition-colors" to="/carrito">Carrito de compras</Link>
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
<span className="font-semibold text-primary-container">Confirmar pedido</span>
</nav>
<div className="flex items-center justify-between pb-space-lg border-b border-outline-variant">
<div>
<h1 className="text-headline-xl font-headline-xl text-primary-container font-extrabold tracking-tight">Confirmar pedido</h1>
<p className="text-body-md font-body-md text-outline mt-0.5">Elige la modalidad de entrega y el medio de pago de tu pedido.</p>
</div>
</div>
{vacio ? (
<section className="mt-space-lg bg-surface-container-lowest p-space-xl rounded-xl border border-outline-variant shadow-sm text-center space-y-4">
<span className="material-symbols-outlined text-[56px] text-outline" data-icon="remove_shopping_cart">remove_shopping_cart</span>
<h2 className="text-headline-sm font-headline-sm text-primary-container font-bold">No hay productos para confirmar</h2>
<p className="text-body-md text-outline">Tu carrito está vacío.</p>
<Link className="inline-flex items-center gap-2 h-11 px-6 bg-secondary-container hover:bg-secondary text-on-secondary rounded-lg font-bold transition-colors" to="/">
<span className="material-symbols-outlined text-[20px]">storefront</span>
<span>Ir a la tienda</span>
</Link>
</section>
) : (
<div className="mt-space-lg grid grid-cols-12 gap-gutter-desktop">
{/*  COLUMNA IZQUIERDA: pasos  */}
<div className="col-span-12 lg:col-span-8 space-y-space-lg">
{/*  PASO 1: Cliente (solo código anónimo)  */}
<div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant shadow-sm">
<div className="flex items-center space-x-3 mb-space-md pb-space-sm border-b border-surface-container">
<span className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary font-headline-sm flex items-center justify-center font-bold text-[15px]">1</span>
<div>
<h2 className="text-headline-sm font-headline-sm text-primary-container font-bold">Datos del cliente</h2>
<p className="text-body-sm font-body-sm text-outline">En este prototipo el cliente se identifica solo por un código anónimo</p>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
<div>
<label className="block text-label-md font-label-md font-semibold text-primary-container mb-1.5" htmlFor="codigo-cliente">Código de cliente</label>
<input id="codigo-cliente" className="w-full h-11 px-3.5 text-body-md font-body-md text-on-surface bg-surface-container-low border border-outline-variant rounded-lg outline-none font-mono" readOnly type="text" value={sesion?.codigo_cliente || "Sin sesión de evaluación"}/>
</div>
</div>
</div>
{/*  PASO 2: Método de entrega  */}
<div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant shadow-sm">
<div className="flex items-center space-x-3 mb-space-md pb-space-sm border-b border-surface-container">
<span className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-headline-sm flex items-center justify-center font-bold text-[15px]">2</span>
<div>
<h2 className="text-headline-sm font-headline-sm text-primary-container font-bold">Método de entrega</h2>
<p className="text-body-sm font-body-sm text-outline">Selecciona cómo deseas recibir tus materiales</p>
</div>
</div>
<div className="space-y-4">
{ENTREGAS.map((o) => {
  const activa = entrega === o.valor;
  return (
<label key={o.valor} className={activa ? opcionActiva : opcionInactiva}>
<div className="flex items-start justify-between">
<div className="flex items-start space-x-3.5">
<input checked={activa} onChange={() => setEntrega(o.valor)} className="mt-1 h-5 w-5 text-primary-container border-outline focus:ring-primary-container" name="metodo_entrega" type="radio"/>
<div>
<div className="flex items-center space-x-2">
<span className={`material-symbols-outlined text-[22px] ${activa ? "text-primary-container" : "text-outline"}`}>{o.icono}</span>
<span className={`text-headline-sm font-headline-sm font-bold ${activa ? "text-primary-container" : "text-on-surface"}`}>{o.titulo}</span>
</div>
<p className="text-body-sm font-body-sm text-outline mt-1">{o.detalle}</p>
</div>
</div>
<span className={`text-label-lg font-label-lg font-bold ${activa ? "text-primary-container" : "text-on-surface"}`}>{o.costo}</span>
</div>
</label>
  );
})}
</div>
</div>
{/*  PASO 3: Método de pago  */}
<div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant shadow-sm">
<div className="flex items-center space-x-3 mb-space-md pb-space-sm border-b border-surface-container">
<span className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-headline-sm flex items-center justify-center font-bold text-[15px]">3</span>
<div>
<h2 className="text-headline-sm font-headline-sm text-primary-container font-bold">Método de pago</h2>
<p className="text-body-sm font-body-sm text-outline">Elige cómo pagarás tu pedido</p>
</div>
</div>
<div className="space-y-3">
{PAGOS.map((o) => {
  const activa = pago === o.valor;
  return (
<label key={o.valor} className={activa ? "block border-2 border-primary-container bg-surface-bright p-4 rounded-xl cursor-pointer" : "block border border-outline-variant hover:border-outline bg-surface-container-lowest p-4 rounded-xl cursor-pointer transition-colors"}>
<div className="flex items-center justify-between">
<div className="flex items-center space-x-3">
<input checked={activa} onChange={() => setPago(o.valor)} className="h-5 w-5 text-primary-container border-outline focus:ring-primary-container" name="metodo_pago" type="radio"/>
<div className="flex items-center space-x-3">
{o.icono ? (
<div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
<span className="material-symbols-outlined text-[24px]">{o.icono}</span>
</div>
) : (
<div className="w-10 h-10 rounded-lg bg-surface-container-lowest border border-outline-variant flex items-center justify-center font-extrabold text-[13px] text-secondary-container tracking-wider">
                        QR
                      </div>
)}
<div>
<span className={`text-label-lg font-label-lg font-bold block ${activa ? "text-primary-container" : "text-on-surface"}`}>{o.titulo}</span>
<span className="text-body-sm font-body-sm text-outline">{o.detalle}</span>
</div>
</div>
</div>
</div>
</label>
  );
})}
</div>
</div>
{/*  BOTÓN PRINCIPAL DE ACCIÓN  */}
<div className="space-y-3 pt-2">
{error && (
<div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-body-sm font-body-sm flex items-center gap-2">
<span className="material-symbols-outlined text-[20px]">error</span>
<span>{error}</span>
</div>
)}
<button type="button" onClick={realizarPedido} disabled={enviando} className="w-full h-14 bg-secondary-container hover:bg-secondary text-on-secondary rounded-xl text-headline-sm font-headline-sm font-bold flex items-center justify-center space-x-3 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait">
<span className="material-symbols-outlined text-[24px]" data-icon="lock">lock</span>
<span>{enviando ? "Registrando pedido…" : `Realizar pedido · ${soles(subtotal)}`}</span>
<span className="material-symbols-outlined text-[22px]" data-icon="arrow_forward">arrow_forward</span>
</button>
<p className="text-center text-body-sm font-body-sm text-outline">
              Al hacer clic en "Realizar pedido" se registra tu pedido y la hora de cierre de tu selección.
            </p>
</div>
</div>
{/*  COLUMNA DERECHA: resumen  */}
<div className="col-span-12 lg:col-span-4">
<div className="sticky top-28 space-y-space-md">
<div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-space-md">
<div className="flex items-center justify-between pb-space-sm border-b border-surface-container mb-space-md">
<h3 className="text-headline-sm font-headline-sm font-bold text-primary-container">Resumen de compra</h3>
<span className="bg-surface-container px-2 py-0.5 rounded text-label-sm font-label-sm font-bold text-primary-container">{unidades} {unidades === 1 ? "producto" : "productos"}</span>
</div>
<div className="divide-y divide-surface-container max-h-80 overflow-y-auto pr-1">
{carrito.map((i) => (
<div key={i.sku} className="py-3 flex items-start space-x-3">
<div className="w-14 h-14 bg-surface-container-low rounded-lg border border-outline-variant shrink-0 flex items-center justify-center p-1">
<span className="material-symbols-outlined text-primary-container text-[28px]">{iconoDe(i.categoria)}</span>
</div>
<div className="flex-1 min-w-0">
<h4 className="text-body-md font-body-md font-semibold text-primary-container truncate">{i.nombre}</h4>
<p className="text-body-sm font-body-sm text-outline">{i.marca} · Cant: {i.cantidad}</p>
<span className="text-body-md font-body-md font-bold text-primary-container">{soles(i.precio * i.cantidad)}</span>
</div>
</div>
))}
</div>
<div className="mt-4 pt-4 border-t border-surface-container space-y-2.5">
<div className="flex justify-between text-body-md font-body-md text-on-surface-variant">
<span>Subtotal productos</span>
<span className="font-medium text-on-surface">{soles(subtotal)}</span>
</div>
<div className="flex justify-between text-body-md font-body-md text-on-surface-variant">
<span>Envío</span>
<span className="font-semibold text-secondary-container">{costoEntrega}</span>
</div>
<div className="pt-3 border-t-2 border-surface-container-highest flex items-baseline justify-between">
<div>
<span className="text-headline-md font-headline-md font-extrabold text-primary-container block">TOTAL A PAGAR</span>
<span className="text-label-sm font-label-sm text-outline block">Precios con I.G.V.{costoEntrega === "Por coordinar" ? " · sin envío" : ""}</span>
</div>
<div className="text-right">
<span className="text-price-lg font-price-lg text-secondary-container font-extrabold">{soles(subtotal)}</span>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
)}
</div>
</main>
{/*  PIE DE PÁGINA INSTITUCIONAL  */}
<footer className="bg-primary-container text-on-primary border-t border-primary-container mt-auto">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop py-space-xl">
<div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-desktop mb-space-lg">
<div className="space-y-3">
<Link className="flex items-center tracking-tight" to="/">
<span className="text-headline-md font-headline-md font-extrabold text-on-primary">FERRE</span><span className="text-headline-md font-headline-md font-extrabold text-secondary-container">MAX</span>
</Link>
<p className="text-body-md font-body-md text-on-primary-container">
            Distribución ferretera y materiales de construcción para obras y proyectos del hogar.
          </p>
</div>
<div className="space-y-2">
<h4 className="text-label-lg font-label-lg font-bold text-on-primary">Categorías</h4>
<ul className="space-y-1.5 text-body-md font-body-md text-on-primary-container">
{Object.keys(ICONO_CATEGORIA).map((c) => (
<li key={c}><Link className="hover:text-on-primary transition-colors" to={`/busqueda?categoria=${encodeURIComponent(c)}`}>{c}</Link></li>
))}
</ul>
</div>
<div className="space-y-2">
<h4 className="text-label-lg font-label-lg font-bold text-on-primary">Servicio al Cliente</h4>
<ul className="space-y-1.5 text-body-md font-body-md text-on-primary-container">
<li><Link className="hover:text-on-primary transition-colors" to="/mi-cuenta">Mi cuenta</Link></li>
<li><Link className="hover:text-on-primary transition-colors" to="/carrito">Carrito de compras</Link></li>
</ul>
</div>
</div>
<div className="pt-space-md border-t border-on-primary-container/20 flex flex-col md:flex-row items-center justify-between text-label-sm font-label-sm text-on-primary-container gap-4">
<p>© 2026 FerreMax - Tesis: Sistema web basado en Machine Learning para la recomendación de productos - UPN 2026.</p>
</div>
</div>
</footer>

    </>
  );
}
