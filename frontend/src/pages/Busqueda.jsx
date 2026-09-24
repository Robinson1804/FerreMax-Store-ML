// Búsqueda por necesidad y navegación por categoría (diseño Stitch 02_busqueda_por_necesidad.html).
//   /busqueda?q=texto          → POST /api/buscar-necesidad (según el modo activo del backend)
//   /busqueda?categoria=X      → GET /api/productos?categoria=X
// Eventos: CONSULTA se emite en el manejador de envío del formulario (una vez por consulta enviada; nunca
// en un efecto, así StrictMode, recargas o "atrás" no la duplican); INICIO_BUSQUEDA al enfocar el buscador;
// PRODUCTO_AGREGADO con origen BUSQUEDA (resultados de una consulta), CATEGORIA (listado por categoría)
// o RECOMENDACION (bloque de complementos, que registra RECOM_MOSTRADA vía useRecomendaciones).
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, soles } from "../lib/api";
import { useTienda, useRecomendaciones } from "../lib/tienda";
import EtiquetaModo from "../components/EtiquetaModo";

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

const rutaCategoria = (c) => `/busqueda?categoria=${encodeURIComponent(c)}`;

// Cuenta cuántos resultados hay por valor de un campo (para los filtros laterales)
function contar(lista, campo) {
  const m = new Map();
  lista.forEach((p) => m.set(p[campo], (m.get(p[campo]) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// Texto del puntaje real devuelto por el API según el modo con que se hizo la consulta
function textoPuntaje(puntaje, modo) {
  if (puntaje === null || puntaje === undefined || !modo) return null;
  return modo === "ML"
    ? `Similitud TF-IDF: ${Number(puntaje).toFixed(3)}`
    : `Palabras coincidentes: ${Math.round(Number(puntaje))}`;
}

// Bloque de complementos del primer resultado. Se monta solo cuando ya hay resultados, para no registrar
// RECOM_MOSTRADA de una lista vacía o provisional.
function BloqueComplementos({ base }) {
  const { agregar } = useTienda();
  const { lista, cargando } = useRecomendaciones("busqueda", [base.sku], 5);
  if (!cargando && !lista.length) return null;
  return (
<section className="mt-10 bg-[#FFF3EA] rounded-xl border border-[#FED7AA] p-6 shadow-sm">
{/*  Module Header  */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
<div className="flex items-start gap-3">
<div className="w-10 h-10 rounded-lg bg-secondary-container text-white flex items-center justify-center flex-shrink-0 shadow-xs">
<span className="material-symbols-outlined text-2xl" data-icon="hub" data-weight="fill" style={{"fontVariationSettings": "'FILL' 1"}}>hub</span>
</div>
<div>
<h2 className="text-lg font-bold text-primary tracking-tight">
              Complementos sugeridos para «{base.nombre}»
            </h2>
<p className="text-xs text-on-surface-variant">
              Productos que suelen acompañar al primer resultado de tu búsqueda.
            </p>
</div>
</div>
<div className="flex items-center gap-2 self-start md:self-center">
<span className="inline-flex items-center gap-1.5 bg-[#FFEDD5] text-[#9A3412] border border-[#FDBA74] text-xs font-bold px-3 py-1 rounded-full shadow-xs">
<span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse"></span>
            <EtiquetaModo />
          </span>
</div>
</div>
{/*  5-column Horizontal Recommendation Cards  */}
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
{cargando && !lista.length && (
<p className="col-span-full text-xs text-on-surface-variant py-4 text-center">Cargando sugerencias…</p>
)}
{lista.map((p) => (
<div key={p.sku} className="bg-surface-container-lowest rounded-lg border border-[#FED7AA] p-3 flex flex-col justify-between hover:shadow-sm transition-shadow">
<Link to={`/detalle/${p.sku}`} className="block">
<div className="w-full h-24 bg-surface rounded flex items-center justify-center mb-2 overflow-hidden">
<span className="material-symbols-outlined text-[48px] text-outline" aria-hidden="true">{iconoProducto(p)}</span>
</div>
<span className="text-[10px] uppercase font-bold text-outline">{p.marca}</span>
<h4 className="text-xs font-semibold text-primary line-clamp-1 mb-1 hover:text-secondary transition-colors" title={p.nombre}>
            {p.nombre}
          </h4>
</Link>
<div className="flex items-center justify-between mt-1 pt-1 border-t border-surface-container">
<span className="text-xs font-bold text-primary">{soles(p.precio)}</span>
<button type="button" onClick={() => agregar(p, "RECOMENDACION", p.posicion)} className="bg-[#F25C05] hover:bg-[#DE5A10] text-white text-[11px] font-bold px-2 py-1 rounded transition-colors flex items-center gap-0.5">
<span className="material-symbols-outlined text-xs" data-icon="add">add</span>
<span>Agregar</span>
</button>
</div>
</div>
))}
</div>
</section>
  );
}

export default function Busqueda() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const categoria = (params.get("categoria") || "").trim();
  const porCategoria = !q && !!categoria;

  const { modo, unidades, subtotal, sesion, emitir, marcarInicio, agregar } = useTienda();

  const [entrada, setEntrada] = useState(q);
  const [categorias, setCategorias] = useState([]);
  const [menuCategorias, setMenuCategorias] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [modoConsulta, setModoConsulta] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  // Filtros y orden (solo sobre los resultados ya devueltos por el API)
  const [filtroCategorias, setFiltroCategorias] = useState([]);
  const [filtroMarcas, setFiltroMarcas] = useState([]);
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [soloStock, setSoloStock] = useState(false);
  const [orden, setOrden] = useState("relevancia");
  const [vista, setVista] = useState("cuadricula");

  const limpiarFiltros = () => {
    setFiltroCategorias([]);
    setFiltroMarcas([]);
    setPrecioMin("");
    setPrecioMax("");
    setSoloStock(false);
  };

  useEffect(() => {
    api.get("/api/categorias").then((r) => setCategorias(r.data)).catch(() => setCategorias([]));
  }, []);

  // El cuadro de búsqueda refleja la consulta de la URL
  useEffect(() => {
    setEntrada(q);
  }, [q]);

  // Ejecuta la búsqueda (o el listado por categoría). No emite eventos: CONSULTA sale del envío del formulario.
  useEffect(() => {
    limpiarFiltros();
    setOrden("relevancia");
    if (!q && !categoria) {
      setResultados([]);
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    setError(false);
    const modoAlConsultar = modo;
    const peticion = q
      ? api.post("/api/buscar-necesidad", { texto: q })
      : api.get("/api/productos", { params: { categoria } });
    peticion
      .then((r) => {
        if (!vigente) return;
        setResultados(r.data);
        setModoConsulta(modoAlConsultar);
      })
      .catch(() => {
        if (!vigente) return;
        setResultados([]);
        setError(true);
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
    // Al cambiar el modo activo se repite la consulta para que puntajes y etiqueta coincidan
  }, [q, categoria, modo]);

  // Una consulta enviada = un evento CONSULTA
  const enviarConsulta = (e) => {
    e.preventDefault();
    const t = entrada.trim();
    if (!t) return;
    emitir("CONSULTA", { texto_consulta: t });
    navigate(`/busqueda?q=${encodeURIComponent(t)}`);
  };

  const origen = porCategoria ? "CATEGORIA" : "BUSQUEDA";

  const mostrados = useMemo(() => {
    const min = precioMin === "" ? null : Number(precioMin);
    const max = precioMax === "" ? null : Number(precioMax);
    const lista = resultados.filter((p) =>
      (!filtroCategorias.length || filtroCategorias.includes(p.categoria)) &&
      (!filtroMarcas.length || filtroMarcas.includes(p.marca)) &&
      (min === null || p.precio >= min) &&
      (max === null || p.precio <= max) &&
      (!soloStock || p.stock > 0)
    );
    if (orden === "menor") return [...lista].sort((a, b) => a.precio - b.precio);
    if (orden === "mayor") return [...lista].sort((a, b) => b.precio - a.precio);
    return lista;
  }, [resultados, filtroCategorias, filtroMarcas, precioMin, precioMax, soloStock, orden]);

  const conteoCategorias = useMemo(() => contar(resultados, "categoria"), [resultados]);
  const conteoMarcas = useMemo(() => contar(resultados, "marca"), [resultados]);
  const terminosReconocidos = useMemo(
    () => [...new Set(resultados.flatMap((p) => p.terminos || []))],
    [resultados]
  );
  const hayFiltros = filtroCategorias.length || filtroMarcas.length || precioMin !== "" || precioMax !== "" || soloStock;
  const alternar = (lista, setLista, valor) =>
    setLista(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);

  const titulo = q || categoria;

  return (
    <>

{/*  TOP PROMO BANNER  */}
<div className="bg-primary text-on-primary text-xs py-1.5 px-4 text-center tracking-wide font-medium flex items-center justify-center gap-2 border-b border-primary-container">
<span className="material-symbols-outlined text-secondary-container text-sm" data-icon="local_shipping">local_shipping</span>
<span>Despacho a todo Lima y provincias.</span>
<span className="mx-2 text-outline-variant">|</span>
<span className="text-secondary-fixed font-semibold flex items-center gap-1">
<span>Atención a contratistas y obras</span>
</span>
</div>
{/*  MAIN HEADER (Shared Component JSON TopNavBar)  */}
<header className="bg-surface-container-lowest border-b border-outline-variant shadow-sm sticky top-0 z-50">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop h-20 flex items-center justify-between gap-6">
{/*  Brand Logo  */}
<Link className="flex items-center gap-2 group flex-shrink-0" to="/">
<div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm group-hover:bg-primary transition-colors">
<span className="material-symbols-outlined text-2xl text-secondary-container" data-icon="construction" data-weight="fill" style={{"fontVariationSettings": "'FILL' 1"}}>construction</span>
</div>
<div className="flex flex-col">
<span className="text-headline-md font-headline-md font-extrabold text-primary tracking-tight leading-none">FERRE<span className="text-secondary-container">MAX</span></span>
<span className="text-[10px] font-bold text-outline uppercase tracking-widest leading-tight">Perú Ferreterías</span>
</div>
</Link>
{/*  Need-based Search Engine Input  */}
<div className="flex-1 max-w-2xl relative">
<form className="relative flex items-center" onSubmit={enviarConsulta}>
<div className="absolute left-3.5 text-secondary-container flex items-center pointer-events-none">
<span className="material-symbols-outlined text-xl" data-icon="psychology" data-weight="fill" style={{"fontVariationSettings": "'FILL' 1"}}>psychology</span>
</div>
<input className="w-full pl-11 pr-28 h-11 bg-surface-container-low text-primary font-medium text-body-md rounded-lg border border-outline-variant focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 focus:bg-surface-container-lowest transition-all" placeholder="¿Qué proyecto o necesidad deseas resolver hoy?" type="text" value={entrada} onChange={(e) => setEntrada(e.target.value)} onFocus={marcarInicio}/>
<div className="absolute right-1.5 flex items-center gap-1">

<button className="h-8 px-3.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-md flex items-center justify-center transition-colors" type="submit" title="Buscar">
<span className="material-symbols-outlined text-base" data-icon="search">search</span>
</button>
</div>
</form>
</div>
{/*  Trailing Action Badges  */}
<div className="flex items-center gap-4 flex-shrink-0">
<div className="h-8 w-px bg-outline-variant hidden sm:block"></div>
{/*  Account  */}
<Link className="flex items-center gap-2 text-on-surface hover:text-secondary p-1.5 rounded-lg transition-colors" to="/mi-cuenta">
<div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary-container border border-outline-variant">
<span className="material-symbols-outlined text-xl" data-icon="person">person</span>
</div>
<div className="hidden sm:block text-left leading-tight">
<span className="text-[11px] text-outline block">{sesion?.codigo_cliente ? `Hola, ${sesion.codigo_cliente}` : "Bienvenido"}</span>
<span className="text-label-md font-label-md font-bold text-primary">Mi Cuenta</span>
</div>
</Link>
{/*  Cart Badge with Orange Indicator  */}
<Link className="flex items-center gap-3 bg-secondary-container/10 hover:bg-secondary-container/20 text-on-surface px-3 py-2 rounded-lg border border-secondary-container/30 transition-all active:scale-98" to="/carrito">
<div className="relative">
<span className="material-symbols-outlined text-2xl text-secondary" data-icon="shopping_cart">shopping_cart</span>
<span className="absolute -top-1.5 -right-2 bg-secondary-container text-white font-bold text-[10px] min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center shadow-xs">{unidades}</span>
</div>
<div className="text-left leading-tight">
<span className="text-[11px] text-on-surface-variant block">Carrito</span>
<span className="text-label-md font-label-md font-bold text-primary">{soles(subtotal)}</span>
</div>
</Link>
</div>
</div>
{/*  Secondary Navigation Strip  */}
<nav className="bg-surface-container-lowest border-t border-outline-variant/60 hidden md:block">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop flex items-center justify-between h-11">
<div className="flex items-center gap-6">
{/*  All Categories Mega Button (categorías reales)  */}
<div className="relative">
<button type="button" onClick={() => setMenuCategorias((v) => !v)} className="flex items-center gap-2 bg-primary text-white px-4 h-11 font-label-lg text-sm font-semibold rounded-none hover:bg-primary-container transition-colors">
<span className="material-symbols-outlined text-lg" data-icon="menu">menu</span>
<span>Todas las categorías</span>
<span className="material-symbols-outlined text-xs ml-1" data-icon="expand_more">expand_more</span>
</button>
{menuCategorias && (
<div className="absolute left-0 top-full w-72 bg-surface-container-lowest border border-outline-variant rounded-b-lg shadow-lg z-50 py-1">
{categorias.map((c) => (
<Link key={c.categoria} to={rutaCategoria(c.categoria)} onClick={() => setMenuCategorias(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface hover:bg-surface-container hover:text-secondary transition-colors">
<span className="material-symbols-outlined text-lg text-secondary-container">{ICONO_CATEGORIA[c.categoria] || "category"}</span>
<span>{c.categoria}</span>
</Link>
))}
{!categorias.length && <span className="block px-4 py-2 text-sm text-outline">Cargando categorías…</span>}
</div>
)}
</div>
{/*  Main Nav Links  */}
<div className="flex items-center gap-6">
<Link className="text-on-surface font-label-lg text-sm hover:text-secondary transition-colors" to="/">Inicio</Link>
<span className="text-secondary border-b-2 border-secondary font-label-lg text-sm font-bold pb-1 pt-1 flex items-center gap-1">
<span>Productos</span>
<span className="text-[10px] font-bold bg-secondary-fixed text-on-secondary-fixed px-1.5 rounded-full">Activo</span>
</span>
</div>
</div>
{/*  Etiqueta del modo activo (leída de /api/admin/config)  */}
<div className="flex items-center gap-5 text-xs text-on-surface-variant font-medium">
<span className="flex items-center gap-1">
<span className="material-symbols-outlined text-sm text-secondary-container" data-icon="memory">memory</span>
<span><EtiquetaModo /></span>
</span>
</div>
</div>
</nav>
</header>
{/*  CONTENT CANVAS  */}
<main className="flex-1 w-full max-w-[1360px] mx-auto px-margin-desktop py-6">
{/*  1. BREADCRUMB  */}
<nav aria-label="Migas de pan" className="flex items-center gap-2 text-body-sm font-body-sm text-outline mb-4">
<Link className="hover:text-primary transition-colors flex items-center gap-1" to="/">
<span className="material-symbols-outlined text-sm" data-icon="home">home</span>
<span>Inicio</span>
</Link>
<span className="material-symbols-outlined text-xs text-outline-variant" data-icon="chevron_right">chevron_right</span>
<span>{porCategoria ? "Categorías" : "Búsqueda por necesidad"}</span>
{titulo && (
<>
<span className="material-symbols-outlined text-xs text-outline-variant" data-icon="chevron_right">chevron_right</span>
<span className="text-primary font-semibold truncate max-w-md">{titulo}</span>
</>
)}
</nav>
{/*  2. SEARCH HEADER & MODULE INFO  */}
<section className="mb-6">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
{/*  Left: Query Info Header  */}
<div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-5 border border-outline-variant flex flex-col justify-center shadow-sm">
<div className="flex items-center gap-2 mb-1.5">
<span className="px-2.5 py-0.5 rounded-full text-label-sm font-label-sm bg-secondary-fixed text-on-secondary-fixed uppercase tracking-wider flex items-center gap-1">
<span className="material-symbols-outlined text-xs" data-icon={porCategoria ? "category" : "auto_awesome"}>{porCategoria ? "category" : "auto_awesome"}</span>
              {porCategoria ? "Navegación por categoría" : "Búsqueda por necesidad"}
            </span>

</div>
{titulo ? (
<>
<h1 className="text-headline-md font-headline-md font-bold text-primary tracking-tight mb-1">
            {porCategoria ? "Categoría: " : "Productos para: "}<span className="text-secondary-container">{porCategoria ? categoria : `"${q}"`}</span>
</h1>
<p className="text-body-md font-body-md text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-sm text-secondary" data-icon="inventory_2">inventory_2</span>
            {cargando
              ? "Buscando productos…"
              : <>Encontramos <strong>{resultados.length} {resultados.length === 1 ? "producto" : "productos"}</strong> {porCategoria ? "en esta categoría." : "relacionados con tu necesidad."}</>}
          </p>
</>
) : (
<>
<h1 className="text-headline-md font-headline-md font-bold text-primary tracking-tight mb-1">¿Qué necesitas hacer?</h1>
<p className="text-body-md font-body-md text-on-surface-variant">Escribe tu necesidad en el buscador (por ejemplo, «pintar un dormitorio») o elige una categoría.</p>
</>
)}
</div>
{/*  Right: cómo se obtuvieron los resultados (según el modo real de la consulta)  */}
<div className="lg:col-span-7 bg-[#F0F7FF] rounded-xl p-5 border border-[#BFDBFE] shadow-sm flex flex-col justify-between relative overflow-hidden">
<div className="flex items-start justify-between gap-3 mb-2">
<div className="flex items-center gap-2">
<span className="w-8 h-8 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shadow-xs flex-shrink-0">
<span className="material-symbols-outlined text-xl" data-icon="lightbulb" data-weight="fill" style={{"fontVariationSettings": "'FILL' 1"}}>lightbulb</span>
</span>
<div>
<span className="text-xs font-bold text-primary tracking-wide uppercase">Cómo se ordenaron estos resultados</span>
<span className="block text-[11px] text-[#1E40AF]"><EtiquetaModo /></span>
</div>
</div>
</div>
<p className="text-[#0F2A4A] text-body-md font-medium leading-relaxed mb-3">
{porCategoria
  ? "Productos de la categoría elegida, ordenados del más vendido al menos vendido."
  : !modoConsulta
    ? "Cargando el modo activo del recomendador…"
    : modoConsulta === "ML"
    ? "Tu necesidad se comparó con la descripción de cada producto (nombre, marca, categoría, uso y palabras clave) mediante similitud TF-IDF; se muestran los más parecidos."
    : "Se contaron las palabras de tu necesidad que aparecen en cada producto; a igual número de coincidencias, primero el más vendido."}
</p>
{!porCategoria && q && (
<div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#BFDBFE]/60 gap-3">
<div className="flex flex-wrap items-center gap-2 text-xs text-[#1E40AF]">
<span className="flex items-center gap-1">
<span className="material-symbols-outlined text-sm" data-icon="check_circle">check_circle</span>
                Términos reconocidos:
              </span>
{cargando ? <span>…</span> : terminosReconocidos.length
  ? terminosReconocidos.map((t) => (
      <span key={t} className="bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD] text-[11px] font-bold px-2 py-0.5 rounded-full">{t}</span>
    ))
  : <span>ninguno</span>}
</div>
</div>
)}
</div>
</div>
</section>
{/*  3. TWO-COLUMN MAIN WORKSPACE  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
{/*  A. LEFT FILTER COLUMN  */}
<aside className="lg:col-span-3 space-y-4">
{/*  Filter Card  */}
<div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
{/*  Header  */}
<div className="flex items-center justify-between pb-3 border-b border-outline-variant">
<div className="flex items-center gap-1.5">
<span className="material-symbols-outlined text-primary text-lg" data-icon="tune">tune</span>
<span className="font-label-lg text-label-lg font-bold text-primary">Filtros</span>
</div>
<button type="button" onClick={limpiarFiltros} className="text-xs text-secondary hover:underline font-semibold transition-colors">Limpiar todo</button>
</div>
{/*  Filter Section: Categories  */}
<div className="py-4 border-b border-outline-variant/70">
<h2 className="text-xs font-bold uppercase tracking-wider text-outline mb-3 flex items-center justify-between">
<span>Categoría</span>
</h2>
<div className="space-y-2.5">
{conteoCategorias.map(([nombre, n]) => (
<label key={nombre} className="flex items-center justify-between text-body-sm font-medium text-on-surface-variant hover:text-primary cursor-pointer group">
<div className="flex items-center gap-2.5">
<input checked={filtroCategorias.includes(nombre)} onChange={() => alternar(filtroCategorias, setFiltroCategorias, nombre)} className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer" type="checkbox"/>
<span>{nombre}</span>
</div>
<span className="text-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">{n}</span>
</label>
))}
{!conteoCategorias.length && <p className="text-xs text-outline">Sin resultados que filtrar.</p>}
</div>
</div>
{/*  Filter Section: Brands  */}
<div className="py-4 border-b border-outline-variant/70">
<h2 className="text-xs font-bold uppercase tracking-wider text-outline mb-3 flex items-center justify-between">
<span>Marca</span>
</h2>
<div className="space-y-2.5">
{conteoMarcas.map(([nombre, n]) => (
<label key={nombre} className="flex items-center justify-between text-body-sm font-medium text-on-surface-variant hover:text-primary cursor-pointer">
<div className="flex items-center gap-2.5">
<input checked={filtroMarcas.includes(nombre)} onChange={() => alternar(filtroMarcas, setFiltroMarcas, nombre)} className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer" type="checkbox"/>
<span>{nombre}</span>
</div>
<span className="text-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">{n}</span>
</label>
))}
{!conteoMarcas.length && <p className="text-xs text-outline">Sin resultados que filtrar.</p>}
</div>
</div>
{/*  Filter Section: Price Range  */}
<div className="py-4 border-b border-outline-variant/70">
<h2 className="text-xs font-bold uppercase tracking-wider text-outline mb-3">Rango de Precio (S/)</h2>
<div className="grid grid-cols-2 gap-2 text-xs">
<div>
<label className="text-[11px] text-on-surface-variant font-medium block mb-1" htmlFor="precio-min">Mínimo</label>
<div className="relative">
<span className="absolute left-2 top-2 text-outline text-xs">S/</span>
<input id="precio-min" min="0" className="w-full pl-6 pr-1 py-1.5 text-xs font-bold border border-outline-variant rounded bg-surface text-primary focus:ring-1 focus:ring-primary focus:border-primary" type="number" value={precioMin} onChange={(e) => setPrecioMin(e.target.value)}/>
</div>
</div>
<div>
<label className="text-[11px] text-on-surface-variant font-medium block mb-1" htmlFor="precio-max">Máximo</label>
<div className="relative">
<span className="absolute left-2 top-2 text-outline text-xs">S/</span>
<input id="precio-max" min="0" className="w-full pl-6 pr-1 py-1.5 text-xs font-bold border border-outline-variant rounded bg-surface text-primary focus:ring-1 focus:ring-primary focus:border-primary" type="number" value={precioMax} onChange={(e) => setPrecioMax(e.target.value)}/>
</div>
</div>
</div>
</div>
{/*  Filter Section: Stock Toggle Switch  */}
<div className="pt-4 pb-2">
<label className="flex items-center justify-between cursor-pointer">
<div className="flex flex-col">
<span className="text-body-sm font-semibold text-primary">Solo productos en stock</span>
<span className="text-[11px] text-outline">Oculta los productos agotados</span>
</div>
<div className="relative inline-flex items-center cursor-pointer">
<input checked={soloStock} onChange={(e) => setSoloStock(e.target.checked)} className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
</div>
</label>
</div>
</div>
</aside>
{/*  B. MAIN RESULTS AREA (9 Columns on Desktop)  */}
<section className="lg:col-span-9 space-y-4">
{/*  Results Top Control Strip  */}
<div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant flex flex-wrap items-center justify-between gap-4 shadow-sm">
<div className="flex items-center gap-2">
<span className="text-body-md font-body-md font-bold text-primary">
{cargando ? "Buscando…" : hayFiltros
  ? `${mostrados.length} de ${resultados.length} resultados`
  : `${resultados.length} ${resultados.length === 1 ? "resultado encontrado" : "resultados encontrados"}`}
</span>
<span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <EtiquetaModo />
            </span>
</div>
<div className="flex items-center gap-3">
<div className="flex items-center gap-2">
<label className="text-xs font-medium text-on-surface-variant" htmlFor="sort">Ordenar por:</label>
<select value={orden} onChange={(e) => setOrden(e.target.value)} className="text-xs font-semibold bg-surface border border-outline-variant rounded-lg py-1.5 pl-2.5 pr-7 focus:ring-1 focus:ring-primary focus:border-primary text-primary cursor-pointer" id="sort">
<option value="relevancia">{porCategoria ? "Más vendidos" : "Relevancia por necesidad"}</option>
<option value="menor">Menor precio</option>
<option value="mayor">Mayor precio</option>
</select>
</div>
<div className="h-5 w-px bg-outline-variant"></div>
{/*  View toggle  */}
<div className="flex items-center border border-outline-variant rounded-lg overflow-hidden p-0.5 bg-surface-container-low">
<button type="button" onClick={() => setVista("cuadricula")} className={vista === "cuadricula" ? "p-1 bg-surface-container-lowest text-primary rounded shadow-xs" : "p-1 text-outline hover:text-primary transition-colors"} title="Vista en cuadrícula">
<span className="material-symbols-outlined text-base" data-icon="grid_view">grid_view</span>
</button>
<button type="button" onClick={() => setVista("lista")} className={vista === "lista" ? "p-1 bg-surface-container-lowest text-primary rounded shadow-xs" : "p-1 text-outline hover:text-primary transition-colors"} title="Vista en lista">
<span className="material-symbols-outlined text-base" data-icon="view_list">view_list</span>
</button>
</div>
</div>
</div>
{/*  PRODUCT GRID  */}
{cargando && (
<div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-10 text-center text-body-md text-on-surface-variant">Cargando resultados…</div>
)}
{!cargando && error && (
<div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-10 text-center text-body-md text-error">No se pudo consultar el catálogo. Intenta nuevamente.</div>
)}
{!cargando && !error && titulo && !resultados.length && (
<div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-10 text-center">
<span className="material-symbols-outlined text-4xl text-outline" data-icon="search_off">search_off</span>
<p className="text-body-md font-semibold text-primary mt-2">No encontramos productos para «{titulo}»</p>
<p className="text-body-sm text-on-surface-variant mt-1">Prueba describiendo tu necesidad con otras palabras o explora una categoría.</p>
</div>
)}
{!cargando && !!resultados.length && !mostrados.length && (
<div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-10 text-center text-body-md text-on-surface-variant">
Ningún resultado cumple los filtros elegidos. <button type="button" onClick={limpiarFiltros} className="text-secondary font-semibold hover:underline">Limpiar filtros</button>
</div>
)}
{!cargando && !!mostrados.length && (
<div className={vista === "lista" ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"}>
{mostrados.map((p) => (
<article key={p.sku} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col justify-between hover:border-outline hover:shadow-md transition-all group">
<Link to={`/detalle/${p.sku}`} className="block">
<div className="relative w-full h-44 bg-surface rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-outline-variant/40">
{p.stock > 0 ? (
<span className="absolute top-2 left-2 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10 border border-emerald-300">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> En stock
                </span>
) : (
<span className="absolute top-2 left-2 bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10 border border-red-300">
<span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Sin stock
                </span>
)}
<span className="absolute top-2 right-2 text-[11px] font-bold text-primary bg-white/90 px-1.5 py-0.5 rounded border border-outline-variant">SKU: {p.sku}</span>
<span className="material-symbols-outlined text-[80px] text-outline group-hover:scale-105 transition-transform duration-200" aria-hidden="true">{iconoProducto(p)}</span>
</div>
<div className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">{p.marca}</div>
<h3 className="text-sm font-semibold text-primary group-hover:text-secondary transition-colors line-clamp-2 min-h-[40px]">
                {p.nombre}
              </h3>
</Link>
{!porCategoria && (
<div className="mt-2 mb-3 flex flex-wrap gap-1.5">
{!!(p.terminos && p.terminos.length) && (
<span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-md border border-outline-variant/50">
<span className="material-symbols-outlined text-xs text-secondary-container" data-icon="search_check">search_check</span>
                  Coincide con: {p.terminos.join(", ")}
                </span>
)}
{textoPuntaje(p.puntaje, modoConsulta) && (
<span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-md border border-outline-variant/50">
                  {textoPuntaje(p.puntaje, modoConsulta)}
                </span>
)}
</div>
)}
{porCategoria && (
<div className="mt-2 mb-3">
<span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-md border border-outline-variant/50">
                  {p.subcategoria}
                </span>
</div>
)}
<div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between mt-auto">
<div>
<span className="text-[10px] text-outline block">Precio unitario</span>
<span className="text-price-md font-price-md text-primary">{soles(p.precio)}</span>
</div>
<button type="button" disabled={p.stock <= 0} onClick={() => agregar(p, origen, null)} className="bg-[#F25C05] hover:bg-[#DE5A10] active:scale-95 text-white font-label-lg text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed">
<span className="material-symbols-outlined text-base" data-icon="shopping_cart">shopping_cart</span>
<span>{p.stock > 0 ? "Agregar" : "Sin stock"}</span>
</button>
</div>
</article>
))}
</div>
)}
</section>
</div>
{/*  4. RECOMMENDATION MODULE (complementos del primer resultado de la consulta)  */}
{!porCategoria && q && !cargando && resultados.length > 0 && (
<BloqueComplementos key={resultados[0].sku} base={resultados[0]} />
)}
</main>
{/*  5. CORPORATE NAVY FOOTER  */}
<footer className="bg-[#0f2a4a] text-on-primary mt-14 border-t border-primary-container">
{/*  Institutional Top Section (4 Columns)  */}
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop py-12">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
{/*  Col 1: Brand & Perú Identity  */}
<div className="space-y-3">
<div className="flex items-center gap-2">
<div className="w-9 h-9 rounded-lg bg-surface-container-lowest/10 flex items-center justify-center text-white border border-white/20">
<span className="material-symbols-outlined text-2xl text-secondary-container" data-icon="construction" data-weight="fill" style={{"fontVariationSettings": "'FILL' 1"}}>construction</span>
</div>
<span className="text-headline-sm font-headline-sm font-extrabold text-white tracking-tight">FERRE<span className="text-secondary-container">MAX</span></span>
</div>
<p className="text-body-sm font-body-sm text-on-primary-container leading-relaxed">
            Ferretería, construcción y acabados en el Perú, con recomendación de productos para constructores y hogares.
          </p>
<div className="space-y-1.5 text-xs text-on-primary-container pt-1">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-sm text-secondary-container" data-icon="call">call</span>
<span>Central Telefónica: (01) 640-9000</span>
</div>
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-sm text-secondary-container" data-icon="mail">mail</span>
<span>contacto@ferremax.com.pe</span>
</div>
</div>
</div>
{/*  Col 2: Main Categories (reales)  */}
<div>
<h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Categorías Principales
          </h3>
<ul className="space-y-2 text-xs text-on-primary-container">
{categorias.map((c) => (
<li key={c.categoria}><Link className="hover:text-secondary-fixed transition-colors" to={rutaCategoria(c.categoria)}>{c.categoria}</Link></li>
))}
</ul>
</div>
{/*  Col 3: Help & Support  */}
<div>
<h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Ayuda y Soporte
          </h3>
<ul className="space-y-2 text-xs text-on-primary-container">
<li><Link className="hover:text-secondary-fixed transition-colors" to="/mi-cuenta">Mis pedidos</Link></li>
<li><a className="hover:text-secondary-fixed transition-colors" href="#terminos">Términos y Condiciones</a></li>
<li><a className="hover:text-secondary-fixed transition-colors" href="#envios">Políticas de Envío Nacional</a></li>
<li><a className="hover:text-secondary-fixed transition-colors" href="#faq">Preguntas Frecuentes (FAQ)</a></li>
</ul>
{/*  Libro de Reclamaciones  */}
<div className="mt-4 pt-3 border-t border-white/10">
<a className="inline-flex items-center gap-2.5 bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-white/15 text-xs text-white transition-colors" href="#reclamaciones">
<span className="material-symbols-outlined text-xl text-secondary-container" data-icon="menu_book">menu_book</span>
<div className="text-left leading-tight">
<span className="font-bold block">Libro de Reclamaciones</span>
</div>
</a>
</div>
</div>
{/*  Col 4: Payment Methods  */}
<div>
<h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Medios de Pago
          </h3>
<div className="grid grid-cols-3 gap-2 mb-4">
<div className="bg-white/10 rounded border border-white/15 h-8 flex items-center justify-center text-xs font-bold text-white">VISA</div>
<div className="bg-white/10 rounded border border-white/15 h-8 flex items-center justify-center text-xs font-bold text-white">Mastercard</div>
<div className="bg-white/10 rounded border border-white/15 h-8 flex items-center justify-center text-xs font-bold text-[#640087] bg-white">Yape</div>
<div className="bg-white/10 rounded border border-white/15 h-8 flex items-center justify-center text-xs font-bold text-[#00A9E0] bg-white">Plin</div>
<div className="bg-white/10 rounded border border-white/15 h-8 flex items-center justify-center text-[10px] font-bold text-white col-span-2">PagoEfectivo</div>
</div>
</div>
</div>
</div>
{/*  Copyright Sub-Footer  */}
<div className="border-t border-primary-container/80 bg-[#0A192F] py-4 text-xs">
<div className="w-full max-w-[1360px] mx-auto px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-3 text-on-primary-container">
<div>
<span>Tesis: Sistema web basado en Machine Learning para la recomendación de productos - UPN 2026. © 2026 FerreMax. Todos los derechos reservados.</span>
</div>
</div>
</div>
</footer>

    </>
  );
}
