// Página de inicio de la tienda (diseño Stitch 01_inicio.html) conectada al backend.
// Eventos: CONSULTA al enviar una necesidad (formularios y chips); INICIO_BUSQUEDA al enfocar un buscador;
// RECOM_MOSTRADA lo registra useRecomendaciones("inicio"); PRODUCTO_AGREGADO con origen
// RECOMENDACION (bloque "Recomendados para ti") o CATEGORIA (productos destacados del catálogo).
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, soles } from "../lib/api";
import { useTienda, useRecomendaciones } from "../lib/tienda";
import EtiquetaModo from "../components/EtiquetaModo";
import ImagenProducto from "../components/ImagenProducto";

// Imágenes del diseño que representan cada categoría (no a un producto concreto)
const IMAGEN_CATEGORIA = {
  "Pinturas y Acabados": "/img/categorias/pinturas-y-acabados.webp",
  "Construcción y Estructuras": "/img/categorias/construccion-y-estructuras.webp",
  "Gasfitería": "/img/categorias/gasfiteria.webp",
  "Electricidad": "/img/categorias/electricidad.webp",
  "Herramientas": "/img/categorias/herramientas.webp",
  "Ferretería General": "/img/categorias/ferreteria-general.webp",
};

// No hay fotos de productos en el backend: cada producto se ilustra con un ícono de su categoría
const ICONO_CATEGORIA = {
  "Pinturas y Acabados": "format_paint",
  "Construcción y Estructuras": "foundation",
  "Gasfitería": "plumbing",
  "Electricidad": "electrical_services",
  "Herramientas": "handyman",
  "Ferretería General": "hardware",
};
const ICONO_SUBCATEGORIA = {
  "Cables y Conductores": "cable",
  "Herramientas Eléctricas": "power",
  "Aerosoles": "format_color_fill",
};
const iconoProducto = (p) => ICONO_SUBCATEGORIA[p.subcategoria] || ICONO_CATEGORIA[p.categoria] || "inventory_2";

const BUSQUEDAS_FRECUENTES = [
  { texto: "Pintar una pared", icono: "format_paint" },
  { texto: "Instalar punto de agua", icono: "water_drop" },
  { texto: "Cambiar un tomacorriente", icono: "bolt" },
  { texto: "Vaciar una losa pequeña", icono: "foundation" },
];

const rutaCategoria = (c) => `/busqueda?categoria=${encodeURIComponent(c)}`;

function EstadoStock({ stock }) {
  return stock > 0 ? (
    <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-surface-container-lowest/90 px-1.5 py-0.5 rounded-full text-emerald-700 text-label-sm font-label-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> En stock
    </span>
  ) : (
    <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-surface-container-lowest/90 px-1.5 py-0.5 rounded-full text-error text-label-sm font-label-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Sin stock
    </span>
  );
}

export default function Inicio() {
  const navigate = useNavigate();
  const { carrito, unidades, subtotal, sesion, emitir, marcarInicio, agregar } = useTienda();

  const [textoCabecera, setTextoCabecera] = useState("");
  const [textoNecesidad, setTextoNecesidad] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [menuCategorias, setMenuCategorias] = useState(false);

  useEffect(() => {
    api.get("/api/categorias").then((r) => setCategorias(r.data)).catch(() => setCategorias([]));
    api.get("/api/productos")
      .then((r) => setProductos(r.data))
      .catch(() => setProductos([]))
      .finally(() => setCargandoProductos(false));
  }, []);

  // Bloque de recomendaciones de inicio: según el carrito (vacío → el backend usa popularidad)
  const { lista: recomendados, cargando: cargandoRecom } = useRecomendaciones("inicio", carrito.map((i) => i.sku), 5, { porCliente: true });

  // Una consulta enviada = un evento CONSULTA (se emite aquí, en el manejador, no en un efecto)
  const enviarConsulta = (texto) => {
    const t = (texto || "").trim();
    if (!t) return;
    emitir("CONSULTA", { texto_consulta: t });
    navigate(`/busqueda?q=${encodeURIComponent(t)}`);
  };

  const destacados = productos.slice(0, 8); // /api/productos ya viene ordenado por popularidad
  const irA = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <>

{/*  1. Barra superior fina azul marino (#0F2A4A, 36 px de alto)  */}
<aside className="bg-primary-container text-on-primary h-[36px] flex items-center select-none text-body-sm font-body-sm">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop flex items-center justify-between">
<div className="flex items-center gap-space-lg">
<div className="flex items-center gap-1.5 text-surface-container">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="location_on">location_on</span>
<span>Envíos a todo el Perú</span>
</div>
<div className="h-3 w-[1px] bg-primary"></div>
<div className="flex items-center gap-1.5 text-surface-container">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="local_shipping">local_shipping</span>
<span>Delivery rápido en Lima Metropolitana</span>
</div>
</div>
<div className="flex items-center gap-space-lg">
<div className="flex items-center gap-1.5 text-surface-container">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="headset_mic">headset_mic</span>
<span className="font-label-md text-label-md">(01) 712 3456</span>
</div>
<div className="h-3 w-[1px] bg-primary"></div>
<a className="hover:text-secondary-fixed transition-colors text-surface-container" href="#ayuda">Ayuda</a>
<div className="h-3 w-[1px] bg-primary"></div>
<Link className="hover:text-secondary-fixed transition-colors text-surface-container" to="/mi-cuenta">Seguimiento de pedidos</Link>
</div>
</div>
</aside>
{/*  2. Cabecera blanca (Header principal)  */}
<header className="bg-surface-container-lowest border-b border-surface-container shadow-sm sticky top-0 z-40">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop h-[84px] flex items-center justify-between gap-space-lg">
{/*  Logotipo  */}
<Link className="flex items-center select-none" to="/">
<span className="text-headline-xl font-headline-xl tracking-tight leading-none text-primary-container">FERRE<span className="text-secondary-container">MAX</span></span>
</Link>
{/*  Buscador ancho y prominente  */}
<div className="flex-1 max-w-[620px] mx-auto">
<form className="relative flex items-center w-full" onSubmit={(e) => { e.preventDefault(); enviarConsulta(textoCabecera); }}>
<div className="relative w-full">
<input className="w-full h-[46px] pl-4 pr-14 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface placeholder:text-outline text-body-md font-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container shadow-sm transition-all" placeholder="¿Qué necesitas hacer? Ej.: pintar una pared" type="text" value={textoCabecera} onChange={(e) => setTextoCabecera(e.target.value)} onFocus={marcarInicio}/>
<button className="absolute right-1 top-1 bottom-1 w-[40px] bg-primary-container hover:bg-primary text-on-primary rounded-md flex items-center justify-center transition-colors cursor-pointer" title="Buscar" type="submit">
<span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
</button>
</div>
</form>
</div>
{/*  Acciones de cabecera  */}
<div className="flex items-center gap-space-lg">
{/*  Mi cuenta  */}
<Link className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer group" to="/mi-cuenta">
<div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary-container group-hover:bg-primary-container group-hover:text-on-primary transition-colors">
<span className="material-symbols-outlined text-[22px]" data-icon="person">person</span>
</div>
<div className="text-left">
<span className="block text-body-sm font-body-sm text-outline leading-tight">{sesion?.codigo_cliente ? `Hola, ${sesion.codigo_cliente}` : "Hola, Inicia sesión"}</span>
<span className="block text-label-md font-label-md text-primary-container">Mi cuenta</span>
</div>
</Link>
{/*  Separador  */}
<div className="h-8 w-[1px] bg-surface-container"></div>
{/*  Carrito con badge y monto  */}
<Link className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer" to="/carrito">
<div className="relative flex items-center justify-center text-primary-container">
<span className="material-symbols-outlined text-[28px]" data-icon="shopping_cart">shopping_cart</span>
<span className="absolute -top-1.5 -right-2 bg-secondary-container text-on-secondary text-label-sm font-label-sm px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">{unidades}</span>
</div>
<div className="text-left">
<span className="block text-body-sm font-body-sm text-outline leading-tight">Mi Carrito</span>
<span className="block text-label-lg font-label-lg text-primary-container font-bold">{soles(subtotal)}</span>
</div>
</Link>
</div>
</div>
</header>
{/*  3. Menú de navegación inferior a la cabecera  */}
<nav className="bg-surface-container-lowest border-b border-surface-container">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop h-[48px] flex items-center gap-space-lg">
{/*  Botón Todas las categorías (menú desplegable con las categorías reales)  */}
<div className="relative">
<button type="button" onClick={() => setMenuCategorias((v) => !v)} className="bg-primary-container hover:bg-primary text-on-primary px-4 py-2 rounded-lg flex items-center gap-2 font-label-lg text-label-lg transition-colors cursor-pointer">
<span className="material-symbols-outlined text-[20px]" data-icon="menu">menu</span>
<span>Todas las categorías</span>
<span className="material-symbols-outlined text-[18px] text-on-primary-container" data-icon="keyboard_arrow_down">keyboard_arrow_down</span>
</button>
{menuCategorias && (
<div className="absolute left-0 top-full mt-1 w-72 bg-surface-container-lowest border border-surface-container rounded-lg shadow-lg z-50 py-1">
{categorias.map((c) => (
<Link key={c.categoria} to={rutaCategoria(c.categoria)} onClick={() => setMenuCategorias(false)} className="flex items-center gap-2 px-4 py-2 text-body-sm font-body-sm text-on-surface hover:bg-surface-container hover:text-secondary-container transition-colors">
<span className="material-symbols-outlined text-[18px] text-secondary-container">{ICONO_CATEGORIA[c.categoria] || "category"}</span>
<span>{c.categoria}</span>
</Link>
))}
{!categorias.length && <span className="block px-4 py-2 text-body-sm text-outline">Cargando categorías…</span>}
</div>
)}
</div>
{/*  Enlaces de navegación  */}
<div className="flex items-center gap-space-lg h-full">
{/*  Inicio activo  */}
<Link className="h-full flex items-center px-1 text-primary-container border-b-2 border-secondary-container font-label-lg text-label-lg font-bold" to="/">
          Inicio
        </Link>
{/*  Productos  */}
<a className="h-full flex items-center gap-1 px-1 text-on-surface hover:text-secondary-container font-label-lg text-label-lg transition-colors cursor-pointer" href="#destacados" onClick={(e) => { e.preventDefault(); irA("destacados"); }}>
<span>Productos</span>
</a>
{/*  Categorías  */}
<a className="h-full flex items-center gap-1 px-1 text-on-surface hover:text-secondary-container font-label-lg text-label-lg transition-colors cursor-pointer" href="#categorias" onClick={(e) => { e.preventDefault(); irA("categorias"); }}>
<span>Categorías</span>
</a>
</div>
</div>
</nav>
{/*  Contenido Principal  */}
<main className="flex-1 flex flex-col gap-space-xl pb-space-xl">
{/*  4. Hero de ancho completo (360 px de alto, fondo azul marino profundo #0F2A4A)  */}
<section className="w-full bg-primary-container relative overflow-hidden select-none" style={{"height": "380px"}}>
{/*  Contenedor general  */}
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop h-full relative flex items-center">
{/*  Mitad izquierda de contenidos  */}
<div className="z-20 max-w-[620px] flex flex-col justify-center h-full py-6">
<h1 className="text-display-lg font-display-lg text-on-primary tracking-tight leading-tight">
            Todo para <span className="text-secondary-container">construir y renovar</span>
</h1>
<p className="mt-3 text-body-lg font-body-lg text-surface-container leading-relaxed">
            Compra productos de ferretería de forma rápida y segura.
          </p>
<div className="mt-6 flex items-center gap-4">
<a className="inline-flex items-center gap-2 bg-secondary-container hover:bg-secondary text-on-secondary px-6 py-3 rounded-lg font-label-lg text-label-lg font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer" href="#destacados" onClick={(e) => { e.preventDefault(); irA("destacados"); }}>
<span>Ver productos</span>
<span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
</a>
</div>
{/*  3 Beneficios destacados  */}
<div className="mt-8 pt-6 border-t border-primary flex items-center gap-6">
{/*  Beneficio 1  */}
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-primary/70 flex items-center justify-center text-secondary-container border border-on-primary-container/20 shrink-0">
<span className="material-symbols-outlined text-[20px]" data-icon="verified_user">verified_user</span>
</div>
<div className="leading-tight">
<p className="text-label-md font-label-md text-on-primary font-bold">Compra segura</p>
<p className="text-body-sm font-body-sm text-surface-dim">Tus pagos protegidos</p>
</div>
</div>
{/*  Beneficio 2  */}
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-primary/70 flex items-center justify-center text-secondary-container border border-on-primary-container/20 shrink-0">
<span className="material-symbols-outlined text-[20px]" data-icon="local_shipping">local_shipping</span>
</div>
<div className="leading-tight">
<p className="text-label-md font-label-md text-on-primary font-bold">Envíos rápidos</p>
<p className="text-body-sm font-body-sm text-surface-dim">A todo el Perú</p>
</div>
</div>
{/*  Beneficio 3  */}
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-primary/70 flex items-center justify-center text-secondary-container border border-on-primary-container/20 shrink-0">
<span className="material-symbols-outlined text-[20px]" data-icon="thumb_up">thumb_up</span>
</div>
<div className="leading-tight">
<p className="text-label-md font-label-md text-on-primary font-bold">Productos de calidad</p>
<p className="text-body-sm font-body-sm text-surface-dim">Garantía asegurada</p>
</div>
</div>
</div>
</div>
{/*  Imagen de Hero integrada con fade out a la izquierda  */}
<div className="absolute right-0 top-0 bottom-0 w-[640px] h-full pointer-events-none z-10 overflow-hidden">
<img alt="Herramientas profesionales y materiales de construcción sobre mesa de trabajo" className="w-full h-full object-cover object-center" src="/img/categorias/portada-1.webp"/>
{/*  Degradado de transición a azul marino #0F2A4A  */}
<div className="absolute inset-0 bg-gradient-to-r from-primary-container via-primary-container/50 to-transparent"></div>
</div>
</div>
</section>
{/*  5. Bloque '¿Qué necesitas hacer hoy?'  */}
<section className="w-full max-w-[1360px] mx-auto px-margin-desktop -mt-4 z-20">
<div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm p-6">
<div className="flex items-center gap-2 text-primary-container mb-3">
<span className="material-symbols-outlined text-[24px] text-secondary-container" data-icon="lightbulb">lightbulb</span>
<h2 className="text-headline-md font-headline-md font-bold text-primary-container">¿Qué necesitas hacer hoy?</h2>
</div>
<p className="text-body-md font-body-md text-on-surface-variant mb-4">
          Describe tu proyecto o reparación para encontrar al instante los materiales y herramientas que necesitas.
        </p>
{/*  Input grande con botón de búsqueda  */}
<form className="flex flex-col sm:flex-row gap-3 items-stretch" onSubmit={(e) => { e.preventDefault(); enviarConsulta(textoNecesidad); }}>
<div className="relative flex-1">
<span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[22px]" data-icon="build">build</span>
<input className="w-full h-[48px] pl-11 pr-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface placeholder:text-outline text-body-md font-body-md focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container shadow-inner" placeholder="Escribe tu necesidad, por ejemplo: pintar un dormitorio, instalar un lavatorio, colgar repisas" type="text" value={textoNecesidad} onChange={(e) => setTextoNecesidad(e.target.value)} onFocus={marcarInicio}/>
</div>
<button type="submit" className="bg-secondary-container hover:bg-secondary text-on-secondary px-6 h-[48px] rounded-lg font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer">
<span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
<span>Buscar productos</span>
</button>
</form>
{/*  4 Chips interactivos: cada clic es una consulta enviada  */}
<div className="mt-4 flex flex-wrap items-center gap-2">
<span className="text-body-sm font-body-sm text-outline mr-2 font-medium">Búsquedas frecuentes:</span>
{BUSQUEDAS_FRECUENTES.map((b) => (
<button key={b.texto} type="button" onClick={() => enviarConsulta(b.texto)} className="px-3.5 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-primary-container border border-surface-container-highest text-body-sm font-body-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon={b.icono}>{b.icono}</span>
<span>{b.texto}</span>
</button>
))}
</div>
</div>
</section>
{/*  6. Sección 'Categorías principales'  */}
<section id="categorias" className="w-full max-w-[1360px] mx-auto px-margin-desktop">
<div className="flex items-center justify-between mb-5">
<div>
<h2 className="text-headline-lg font-headline-lg font-bold text-primary-container">Categorías principales</h2>
<p className="text-body-sm font-body-sm text-on-surface-variant">Explora los rubros de nuestro catálogo para proyectos residenciales e industriales</p>
</div>
</div>
{/*  Layout con tarjetas de categoría y tarjeta lateral de confianza  */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-space-md">
{/*  Tarjetas en sub-grid de 3 columnas (categorías reales de /api/categorias)  */}
<div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-space-md">
{categorias.map((c) => (
<Link key={c.categoria} className="group bg-surface-container-lowest rounded-xl border border-surface-container p-4 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:border-outline-variant transition-all cursor-pointer" to={rutaCategoria(c.categoria)}>
<div className="w-full h-28 rounded-lg bg-surface-container-low flex items-center justify-center mb-3 overflow-hidden p-2">
{IMAGEN_CATEGORIA[c.categoria] ? (
<img className="h-full object-contain group-hover:scale-105 transition-transform duration-300" alt={c.categoria} src={IMAGEN_CATEGORIA[c.categoria]}/>
) : (
<span className="material-symbols-outlined text-[56px] text-outline group-hover:scale-105 transition-transform duration-300">{ICONO_CATEGORIA[c.categoria] || "category"}</span>
)}
</div>
<span className="font-headline-sm text-headline-sm text-primary-container group-hover:text-secondary-container transition-colors">{c.categoria}</span>
<span className="text-body-sm font-body-sm text-outline mt-0.5">{c.subcategorias.join(", ")}</span>
</Link>
))}
{!categorias.length && (
<p className="col-span-full text-body-sm font-body-sm text-outline py-6 text-center">Cargando categorías…</p>
)}
</div>
{/*  Tarjeta lateral de destaque / confianza  */}
<div className="bg-surface-container rounded-xl border border-surface-container-highest p-6 flex flex-col justify-between">
<div>
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-label-sm font-label-sm mb-4">
<span className="material-symbols-outlined text-[14px]" data-icon="store">store</span>
<span>VENTA DIRECTA &amp; MAYORISTA</span>
</span>
<h3 className="text-headline-sm font-headline-sm font-bold text-primary-container mb-2">Abastecimiento Integral para Obra</h3>
<p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
              Atendemos proyectos de construcción civil, remodelaciones residenciales y compras corporativas.
            </p>
</div>
<div className="mt-6 pt-6 border-t border-surface-container-highest space-y-4">
{/*  Indicador 1: tamaño real del catálogo  */}
<div className="flex items-start gap-3 bg-surface-container-lowest p-3 rounded-lg border border-surface-container shadow-2xs">
<div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[18px]" data-icon="inventory_2">inventory_2</span>
</div>
<div className="text-left">
<p className="text-label-md font-label-md text-primary-container font-bold">Catálogo</p>
<p className="text-body-sm font-body-sm text-on-surface-variant">
{cargandoProductos ? "Cargando…" : `${productos.length} productos en ${categorias.length} categorías`}
</p>
</div>
</div>
{/*  Indicador 2  */}
<div className="flex items-start gap-3 bg-surface-container-lowest p-3 rounded-lg border border-surface-container shadow-2xs">
<div className="w-8 h-8 rounded-full bg-blue-100 text-primary-container flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[18px]" data-icon="local_shipping">local_shipping</span>
</div>
<div className="text-left">
<p className="text-label-md font-label-md text-primary-container font-bold">Delivery</p>
<p className="text-body-sm font-body-sm text-on-surface-variant">Despacho en Lima Metropolitana</p>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  7. Sección 'Productos destacados' (los más vendidos según /api/productos)  */}
<section id="destacados" className="w-full max-w-[1360px] mx-auto px-margin-desktop">
<div className="flex items-center justify-between mb-5">
<div>
<h2 className="text-headline-lg font-headline-lg font-bold text-primary-container">Productos destacados</h2>
<p className="text-body-sm font-body-sm text-on-surface-variant">Los productos más vendidos de nuestro catálogo</p>
</div>
</div>
{/*  Grilla uniforme de 8 tarjetas de producto de igual altura (4 cols en desktop)  */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-md">
{cargandoProductos && (
<p className="col-span-full text-body-md font-body-md text-outline py-8 text-center">Cargando productos…</p>
)}
{!cargandoProductos && !destacados.length && (
<p className="col-span-full text-body-md font-body-md text-outline py-8 text-center">No hay productos disponibles en este momento.</p>
)}
{destacados.map((p) => (
<div key={p.sku} className="bg-surface-container-lowest rounded-xl border border-surface-container p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-outline-variant transition-all group">
<Link to={`/detalle/${p.sku}`} className="block">
<div className="w-full h-44 rounded-lg bg-surface-container-low flex items-center justify-center p-3 relative overflow-hidden">
<ImagenProducto producto={p} icono={iconoProducto(p)} className="h-full w-full group-hover:scale-105 transition-transform duration-300" iconoClassName="text-[72px] text-outline group-hover:scale-105 transition-transform duration-300" />
<span className="absolute top-2 left-2 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium px-2 py-0.5 rounded-full inline-block">{p.subcategoria || p.categoria}</span>
</div>
<div className="mt-3">
<span className="text-body-sm font-body-sm text-outline font-medium">{p.marca}</span>
<h3 className="font-label-lg text-label-lg text-primary-container font-semibold line-clamp-2 mt-0.5 group-hover:text-secondary-container transition-colors">
                {p.nombre}
              </h3>
</div>
</Link>
<div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
<div>
<span className="text-body-sm font-body-sm text-outline block leading-none">Precio unitario</span>
<span className="text-price-md font-price-md text-primary-container">{soles(p.precio)}</span>
</div>
<button type="button" disabled={p.stock <= 0} onClick={() => agregar(p, "CATEGORIA", null)} className="bg-secondary-container hover:bg-secondary text-on-secondary px-3 py-2 rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
<span className="material-symbols-outlined text-[18px]" data-icon="shopping_cart">shopping_cart</span>
<span>{p.stock > 0 ? "Agregar" : "Sin stock"}</span>
</button>
</div>
</div>
))}
</div>
</section>
{/*  8. Bloque 'Recomendados para ti' con fondo naranja muy claro (#FFF3EA)  */}
<section className="w-full max-w-[1360px] mx-auto px-margin-desktop">
<div className="rounded-xl border border-[#FDBA74]/40 bg-[#FFF3EA] p-6 shadow-sm">
{/*  Cabecera del bloque  */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#FBD7C0]">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary flex items-center justify-center shadow-xs">
<span className="material-symbols-outlined text-[22px]" data-icon="auto_awesome">auto_awesome</span>
</div>
<div>
<div className="flex items-center gap-2">
<h2 className="text-headline-md font-headline-md font-bold text-primary-container">Recomendados para ti</h2>
</div>
<p className="text-body-sm font-body-sm text-on-surface-variant">
{carrito.length ? "Según los productos de tu carrito" : "Según los productos más comprados"}
</p>
</div>
</div>
{/*  Etiqueta del modo activo (leída de /api/admin/config)  */}
<div className="flex items-center">
<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/60 shadow-2xs text-primary-container">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="memory">memory</span>
<span className="text-label-sm font-label-sm font-semibold tracking-wide"><EtiquetaModo /></span>
</div>
</div>
</div>
{/*  K = 5 tarjetas de productos recomendados de igual altura  */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-space-md">
{cargandoRecom && !recomendados.length && (
<p className="col-span-full text-body-md font-body-md text-outline py-6 text-center">Cargando recomendaciones…</p>
)}
{!cargandoRecom && !recomendados.length && (
<p className="col-span-full text-body-md font-body-md text-outline py-6 text-center">No hay recomendaciones disponibles por ahora.</p>
)}
{recomendados.map((p) => (
<div key={p.sku} className="bg-surface-container-lowest rounded-xl border border-surface-container p-4 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-outline-variant transition-all group">
<Link to={`/detalle/${p.sku}`} className="block">
<div className="w-full h-36 rounded-lg bg-surface-container-low flex items-center justify-center p-2 relative overflow-hidden">
<ImagenProducto producto={p} icono={iconoProducto(p)} className="h-full w-full group-hover:scale-105 transition-transform duration-300" iconoClassName="text-[60px] text-outline group-hover:scale-105 transition-transform duration-300" />
<EstadoStock stock={p.stock} />
</div>
<div className="mt-2.5">
<span className="text-body-sm font-body-sm text-outline font-medium">{p.marca}</span>
<h4 className="font-label-lg text-label-lg text-primary-container font-semibold line-clamp-2 mt-0.5 group-hover:text-secondary-container transition-colors">
                  {p.nombre}
                </h4>
</div>
</Link>
<div className="mt-3 pt-2.5 border-t border-surface-container flex items-center justify-between">
<div>
<span className="text-price-md font-price-md text-primary-container">{soles(p.precio)}</span>
</div>
<button type="button" onClick={() => agregar(p, "RECOMENDACION", p.posicion)} className="bg-secondary-container hover:bg-secondary text-on-secondary px-3 py-1.5 rounded-lg font-label-md text-label-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs">
<span className="material-symbols-outlined text-[16px]" data-icon="shopping_cart">shopping_cart</span>
<span>Agregar</span>
</button>
</div>
</div>
))}
</div>
</div>
</section>
</main>
{/*  9. Pie de página azul marino (#0F2A4A, texto claro)  */}
<footer className="bg-primary-container text-on-primary">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop py-space-xl">
{/*  4 Columnas principales  */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg mb-10">
{/*  Col 1: Sobre FerreMax  */}
<div>
<Link className="inline-block select-none mb-4" to="/">
<span className="text-headline-md font-headline-md font-extrabold tracking-tight text-on-primary">FERRE<span className="text-secondary-container">MAX</span></span>
</Link>
<p className="text-body-sm font-body-sm text-surface-container leading-relaxed mb-4">
            Abastecimiento de herramientas, materiales de construcción y acabados para obras residenciales y proyectos en todo el Perú.
          </p>
<div className="space-y-1.5 text-body-sm font-body-sm text-surface-container">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="call">call</span>
<span>Central: (01) 712 3456</span>
</div>
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="mail">mail</span>
<span>contacto@ferremax.pe</span>
</div>
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="schedule">schedule</span>
<span>Lun - Sáb: 7:00 am - 7:00 pm</span>
</div>
</div>
</div>
{/*  Col 2: Categorías (reales)  */}
<div>
<h4 className="text-label-lg font-label-lg font-bold text-on-primary mb-4 pb-1 border-b border-primary">
            Categorías
          </h4>
<ul className="space-y-2 text-body-sm font-body-sm text-surface-container">
{categorias.map((c) => (
<li key={c.categoria}><Link className="hover:text-secondary-fixed transition-colors" to={rutaCategoria(c.categoria)}>{c.categoria}</Link></li>
))}
</ul>
</div>
{/*  Col 3: Ayuda y Soporte  */}
<div>
<h4 className="text-label-lg font-label-lg font-bold text-on-primary mb-4 pb-1 border-b border-primary">
            Ayuda y Soporte
          </h4>
<ul className="space-y-2 text-body-sm font-body-sm text-surface-container">
<li><Link className="hover:text-secondary-fixed transition-colors" to="/mi-cuenta">Seguimiento de pedidos</Link></li>
<li><a className="hover:text-secondary-fixed transition-colors" href="#politicas-envio">Políticas de Envío Nacional</a></li>
<li><a className="hover:text-secondary-fixed transition-colors" href="#preguntas">Preguntas Frecuentes (FAQ)</a></li>
<li><a className="hover:text-secondary-fixed transition-colors" href="#soporte-tecnico">Soporte Técnico</a></li>
<li><a className="hover:text-secondary-fixed transition-colors flex items-center gap-1.5" href="#libro-reclamaciones">
<span className="material-symbols-outlined text-[16px] text-secondary-container" data-icon="menu_book">menu_book</span>
<span>Libro de Reclamaciones</span>
</a></li>
</ul>
</div>
{/*  Col 4: Empresa  */}
<div>
<h4 className="text-label-lg font-label-lg font-bold text-on-primary mb-4 pb-1 border-b border-primary">
            Empresa
          </h4>
<ul className="space-y-2 text-body-sm font-body-sm text-surface-container">
<li><a className="hover:text-secondary-fixed transition-colors" href="#corporativa">Venta Corporativa y Obra</a></li>
<li><a className="hover:text-secondary-fixed transition-colors" href="#terminos">Términos y Condiciones</a></li>
<li><a className="hover:text-secondary-fixed transition-colors" href="#privacidad">Políticas de Privacidad</a></li>
</ul>
<div className="mt-6 pt-4 border-t border-primary">
<span className="block text-label-sm font-label-sm text-surface-dim uppercase tracking-wider mb-2">Medios de pago</span>
<div className="flex items-center gap-2 text-surface-container">
<span className="material-symbols-outlined text-[20px]" data-icon="credit_card">credit_card</span>
<span className="material-symbols-outlined text-[20px]" data-icon="payments">payments</span>
<span className="material-symbols-outlined text-[20px]" data-icon="account_balance">account_balance</span>
<span className="material-symbols-outlined text-[20px]" data-icon="qr_code_2">qr_code_2</span>
</div>
</div>
</div>
</div>
{/*  Línea final divisoria con mención de Tesis y derechos reservados  */}
<div className="border-t border-primary pt-6 flex flex-col md:flex-row items-center justify-between text-body-sm font-body-sm text-surface-dim gap-4 text-center md:text-left">
<div>
<p className="font-medium text-surface-container">Tesis: Sistema web basado en Machine Learning para la recomendación de productos · UPN 2026</p>
<p className="text-label-sm font-label-sm text-outline mt-0.5">© 2026 FerreMax - Proyecto de Tesis UPN. Todos los derechos reservados.</p>
</div>
<div className="flex items-center gap-4 text-body-sm font-body-sm">
<a className="hover:text-on-primary transition-colors" href="#privacidad">Privacidad</a>
<span>·</span>
<a className="hover:text-on-primary transition-colors" href="#terminos">Términos</a>
</div>
</div>
</div>
</footer>

    </>
  );
}
