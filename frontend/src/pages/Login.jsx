import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { soles } from "../lib/api";
import { useTienda } from "../lib/tienda";
import EtiquetaModo from "../components/EtiquetaModo";

const CATEGORIAS = ["Pinturas y Acabados", "Herramientas", "Construcción y Estructuras", "Electricidad", "Gasfitería", "Ferretería General"];

// Pantalla de maqueta: en el prototipo no hay registro ni datos personales (BRIEF §8).
// El cliente se identifica solo por el código anónimo de la sesión de evaluación activa.
export default function Login() {
  const navigate = useNavigate();
  const { sesion, unidades, subtotal } = useTienda();
  const [texto, setTexto] = useState("");
  const codigo = sesion?.codigo_cliente || null;

  const buscar = (e) => {
    e.preventDefault();
    const q = texto.trim();
    if (q) navigate(`/busqueda?q=${encodeURIComponent(q)}`);
  };
  const ingresar = (e) => {
    e.preventDefault();
    navigate("/mi-cuenta");
  };

  return (
    <>

{/*  1. TOP ANNOUNCEMENT BAR  */}
<aside className="bg-primary text-on-primary text-body-sm py-2 px-margin-desktop border-b border-primary-container">
<div className="max-w-[1360px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-secondary-container text-[18px]">local_shipping</span>
<span className="font-medium">Envíos a todo el Perú</span>
<span className="text-on-primary-container">|</span>
<span className="material-symbols-outlined text-secondary-container text-[18px]">bolt</span>
<span className="text-on-primary">Delivery rápido en Lima Metropolitana</span>
</div>
<div className="flex items-center gap-6 text-label-md">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px]">headset_mic</span>
<span>Atención: <strong className="text-on-primary">(01) 712 3456</strong></span>
</div>
<Link className="hover:text-secondary-fixed transition-colors flex items-center gap-1" to="/mi-cuenta">
<span className="material-symbols-outlined text-[16px]">pin_drop</span>
          Seguimiento de pedidos
        </Link>
</div>
</div>
</aside>
{/*  2. CABECERA PRINCIPAL  */}
<header className="bg-surface-container-lowest border-b border-outline-variant shadow-sm sticky top-0 z-40">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop h-20 flex items-center justify-between gap-6">
<Link className="flex items-center gap-2 select-none group flex-shrink-0" to="/">
<div className="text-headline-md font-headline-md font-extrabold tracking-tight">
<span className="text-primary-container">FERRE</span><span className="text-secondary-container">MAX</span>
</div>
<span className="text-label-sm font-label-sm bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-semibold">PERÚ</span>
</Link>
<div className="flex-1 max-w-2xl relative">
<form className="flex items-center" onSubmit={buscar}>
<div className="relative w-full">
<input className="w-full h-11 pl-4 pr-12 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" placeholder="¿Qué necesitas hacer? Ej.: pintar una pared" type="text" value={texto} onChange={(e) => setTexto(e.target.value)}/>
<button aria-label="Buscar" className="absolute right-1 top-1 bottom-1 w-10 bg-primary-container hover:bg-primary text-on-primary rounded-md flex items-center justify-center transition-colors" type="submit">
<span className="material-symbols-outlined text-[20px]">search</span>
</button>
</div>
</form>
</div>
<div className="flex items-center gap-5 flex-shrink-0">
<Link className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/60 text-primary-container transition-all" to="/mi-cuenta">
<div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
<span className="material-symbols-outlined text-[20px]">person</span>
</div>
<div className="text-left hidden lg:block leading-tight">
<span className="text-label-sm text-secondary-container font-semibold uppercase tracking-wider block">Estás en</span>
<span className="text-label-lg font-bold text-primary-container">Mi Cuenta</span>
</div>
</Link>
<Link className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant hover:border-primary-container text-on-surface transition-all" to="/carrito">
<div className="relative flex items-center justify-center">
<span className="material-symbols-outlined text-primary-container text-[24px]">shopping_cart</span>
<span className="absolute -top-1.5 -right-2 bg-secondary-container text-on-primary text-[10px] font-bold min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center">{unidades}</span>
</div>
<div className="hidden xl:flex flex-col text-left">
<span className="text-label-sm text-outline">Carrito</span>
<span className="text-label-md font-bold text-primary-container">{soles(subtotal)}</span>
</div>
</Link>
</div>
</div>
{/*  3. BARRA DE NAVEGACIÓN SECUNDARIA  */}
<nav className="bg-surface-container-lowest border-t border-outline-variant/40">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop flex items-center justify-between text-body-md h-11">
<div className="flex items-center gap-8 h-full">
<Link className="bg-primary-container text-on-primary hover:bg-primary px-4 h-full flex items-center gap-2 font-label-lg font-semibold transition-colors" to="/busqueda">
<span className="material-symbols-outlined text-[20px]">menu</span>
<span>Todas las categorías</span>
</Link>
<div className="flex items-center gap-6 h-full font-label-lg">
<Link className="text-on-surface hover:text-secondary flex items-center h-full transition-colors" to="/">Inicio</Link>
<Link className="text-on-surface hover:text-secondary flex items-center h-full transition-colors" to="/busqueda">Productos</Link>
<Link className="text-on-surface hover:text-secondary flex items-center h-full transition-colors" to="/busqueda">Categorías</Link>
</div>
</div>
</div>
</nav>
</header>
{/*  MIGA DE PAN  */}
<div className="bg-surface-container-low border-b border-outline-variant/40">
<div className="max-w-[1360px] mx-auto px-margin-desktop py-3">
<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-body-sm text-outline">
<Link className="hover:text-primary-container transition-colors flex items-center gap-1" to="/">
<span className="material-symbols-outlined text-[16px]">home</span>
<span>Inicio</span>
</Link>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<Link className="hover:text-primary-container transition-colors" to="/mi-cuenta">Mi cuenta</Link>
<span className="material-symbols-outlined text-[14px]">chevron_right</span>
<span className="text-primary-container font-semibold">Iniciar sesión</span>
</nav>
</div>
</div>
{/*  MAIN CANVAS  */}
<main className="flex-grow bg-background py-10">
<div className="max-w-[1240px] mx-auto px-4 md:px-margin-desktop">
<div className="text-center max-w-2xl mx-auto mb-10">
<h1 className="text-headline-xl font-headline-xl text-primary-container tracking-tight mb-2">
          Accede a tu cuenta FerreMax
        </h1>
<p className="text-body-lg font-body-lg text-on-surface-variant">
          En este prototipo cada cliente se identifica con un código anónimo asignado a su sesión de evaluación.
        </p>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
{/*  TARJETA IZQUIERDA: INGRESAR CON CÓDIGO  */}
<section className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
<div className="mb-6">
<h2 className="text-headline-md font-headline-md font-bold text-primary-container">Iniciar sesión</h2>
<p className="text-body-md font-body-md text-on-surface-variant mt-1">Tu código de cliente para esta sesión.</p>
</div>
<form className="space-y-5" onSubmit={ingresar}>
<div>
<label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="login-codigo">
                Código de cliente
</label>
<div className="relative">
<input className="w-full h-11 px-3.5 bg-surface-container-low border border-outline-variant rounded-lg text-primary-container text-body-md font-mono focus:outline-none" id="login-codigo" readOnly type="text" value={codigo || "Sin sesión de evaluación activa"}/>
<span className="material-symbols-outlined absolute right-3 top-3 text-outline text-[20px] pointer-events-none">badge</span>
</div>
</div>
<button className="w-full h-11 bg-secondary-container hover:bg-secondary text-on-primary font-label-lg font-bold rounded-lg shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2" type="submit">
<span>Ingresar</span>
<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</button>
</form>
<div className="mt-8 p-4 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-start gap-3">
<span className="material-symbols-outlined text-secondary-container text-[22px] flex-shrink-0 mt-0.5">engineering</span>
<div>
<p className="text-label-md font-bold text-primary-container">¿Eres Maestro de Obra o Contratista?</p>
<p className="text-body-sm text-on-surface-variant mt-0.5">Consulta por cotizaciones por volumen de cemento, fierro y tuberías.</p>
</div>
</div>
</section>
{/*  TARJETA DERECHA: INFORMACIÓN DEL PROTOTIPO  */}
<section className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
<div className="mb-6">
<h2 className="text-headline-md font-headline-md font-bold text-primary-container">Crear cuenta</h2>
<p className="text-body-md font-body-md text-on-surface-variant mt-1">El registro de clientes no está habilitado en el prototipo.</p>
</div>
<div className="space-y-4 text-body-md font-body-md text-on-surface-variant">
<div className="flex items-start gap-3">
<span className="material-symbols-outlined text-secondary-container text-[22px]">shield_person</span>
<p>No se solicitan nombres, documentos de identidad, teléfonos ni correos. Cada participante recibe un código anónimo (por ejemplo, CLI-001) al iniciar su sesión de evaluación.</p>
</div>
<div className="flex items-start gap-3">
<span className="material-symbols-outlined text-secondary-container text-[22px]">psychology</span>
<p>Las recomendaciones de la tienda se calculan con el recomendador en <strong className="text-primary-container"><EtiquetaModo prefijo="modo " /></strong>.</p>
</div>
</div>
<div className="pt-6">
<Link className="w-full h-11 bg-primary-container hover:bg-primary text-on-primary font-label-lg font-bold rounded-lg shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2" to="/">
<span>Ir a la tienda</span>
<span className="material-symbols-outlined text-[18px]">storefront</span>
</Link>
</div>
</section>
</div>
{/*  FRANJA INFERIOR DE BENEFICIOS  */}
<section className="mt-10 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
<div className="flex items-start gap-4">
<div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0 text-secondary-container">
<span className="material-symbols-outlined text-[26px]">shopping_basket</span>
</div>
<div>
<h3 className="text-headline-sm font-headline-sm font-bold text-primary-container">Guarda tu carrito</h3>
<p className="text-body-md font-body-md text-on-surface-variant mt-1.5 leading-relaxed">
                Tu carrito se conserva en este navegador para continuar tu compra.
              </p>
</div>
</div>
<div className="flex items-start gap-4">
<div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0 text-secondary-container">
<span className="material-symbols-outlined text-[26px]">local_shipping</span>
</div>
<div>
<h3 className="text-headline-sm font-headline-sm font-bold text-primary-container">Sigue tus pedidos</h3>
<p className="text-body-md font-body-md text-on-surface-variant mt-1.5 leading-relaxed">
                Consulta el pedido que registraste desde Mi cuenta.
              </p>
</div>
</div>
<div className="flex items-start gap-4">
<div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0 text-secondary-container">
<span className="material-symbols-outlined text-[26px]">smart_toy</span>
</div>
<div>
<div className="flex items-center gap-2">
<h3 className="text-headline-sm font-headline-sm font-bold text-primary-container">Recomendaciones</h3>
<span className="bg-secondary text-on-secondary text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wider">TESIS UPN</span>
</div>
<p className="text-body-md font-body-md text-on-surface-variant mt-1.5 leading-relaxed">
                Sugerencias de complementos para los productos que buscas y agregas al carrito.
              </p>
</div>
</div>
</div>
</section>
</div>
</main>
{/*  PIE DE PÁGINA  */}
<footer className="bg-primary text-on-primary border-t border-primary-container mt-auto">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop py-space-xl">
<div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-primary-container/80">
<div>
<Link className="text-headline-md font-headline-md font-extrabold tracking-tight mb-3 block" to="/">
<span className="text-on-primary">FERRE</span><span className="text-secondary-container">MAX</span>
</Link>
<p className="text-body-sm text-on-primary-container mb-4 leading-relaxed">
            Materiales de construcción, acabados y ferretería para proyectos civiles y del hogar.
          </p>
</div>
<div>
<h4 className="text-headline-sm font-headline-sm font-semibold text-on-primary mb-4">Categorías</h4>
<ul className="space-y-2 text-body-sm text-on-primary-container">
{CATEGORIAS.map((c) => (
<li key={c}><Link className="hover:text-on-primary transition-colors" to={`/busqueda?categoria=${encodeURIComponent(c)}`}>{c}</Link></li>
))}
</ul>
</div>
<div>
<h4 className="text-headline-sm font-headline-sm font-semibold text-on-primary mb-4">Medios de pago</h4>
<div className="flex flex-wrap gap-2 mb-4">
<span className="px-2 py-1 bg-surface-container-lowest text-primary text-[11px] font-bold rounded">VISA</span>
<span className="px-2 py-1 bg-surface-container-lowest text-primary text-[11px] font-bold rounded">Mastercard</span>
<span className="px-2 py-1 bg-[#742284] text-white text-[11px] font-bold rounded">YAPE</span>
<span className="px-2 py-1 bg-[#00A896] text-white text-[11px] font-bold rounded">PLIN</span>
</div>
</div>
</div>
<div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-label-sm text-on-primary-container">
<span>© 2026 FerreMax - Proyecto de Tesis UPN.</span>
</div>
</div>
</footer>

    </>
  );
}
