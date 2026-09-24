// Layout común del panel de administración: barra lateral y cabecera del diseño Stitch
// (diseno_stitch/05_panel_recomendador.html). El estado inferior de la barra se lee de /api/admin/config.
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { EVENTO_CONFIG } from './panelUtil';

const SECCIONES = [
  {
    titulo: 'Navegación Principal',
    items: [
      { to: '/admin/resumen', icono: 'dashboard', texto: 'Resumen' },
      { to: '/admin/inventario', icono: 'inventory_2', texto: 'Productos e inventario' },
      { to: '/admin/pedidos', icono: 'receipt_long', texto: 'Pedidos' },
      { to: '/admin/clientes', icono: 'group', texto: 'Clientes' },
    ],
  },
  {
    titulo: 'Módulo Inteligente',
    items: [
      { to: '/admin/recomendador', icono: 'psychology', texto: 'Recomendador' },
      { to: '/admin/evaluacion', icono: 'flaky', texto: 'Evaluación' },
      { to: '/admin/eventos', icono: 'monitoring', texto: 'Registro de eventos' },
      { to: '/admin/configuracion', icono: 'settings', texto: 'Configuración' },
    ],
  },
];

const NOMBRE_MODO = { CONV: 'Convencional', ML: 'Machine Learning' };

export default function PanelLayout({ titulo, subtitulo, acciones, children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [conectado, setConectado] = useState(null);

  useEffect(() => {
    api.get('/api/admin/config')
      .then((r) => { setConfig(r.data); setConectado(true); })
      .catch(() => setConectado(false));
    const onCambio = (e) => setConfig(e.detail);
    window.addEventListener(EVENTO_CONFIG, onCambio);
    return () => window.removeEventListener(EVENTO_CONFIG, onCambio);
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-row text-[#1E293B]">
      {/* ========================================== */}
      {/* BARRA LATERAL (260px, Azul Marino #0F2A4A) */}
      {/* ========================================== */}
      <aside className="w-[260px] min-w-[260px] bg-[#0F2A4A] text-white flex flex-col justify-between h-screen sticky top-0 border-r border-[#1a3d66] z-30 select-none">
        <div>
          {/* Brand Logo & Header */}
          <div className="px-6 py-6 border-b border-[#1b3e68] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F26B1D] flex items-center justify-center font-black text-xl text-white tracking-wider shadow-md">
                F
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-white block leading-none">FERRE<span className="text-[#F26B1D]">MAX</span></span>
                <span className="text-[11px] font-medium text-slate-300 uppercase tracking-widest mt-1 block">Panel de Control</span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="px-3 py-5 space-y-1.5 text-[14px] font-medium">
            {SECCIONES.map((sec, i) => (
              <div key={sec.titulo} className="space-y-1.5">
                <div className={`${i > 0 ? 'pt-4 ' : ''}px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400`}>{sec.titulo}</div>
                {sec.items.map((it) => {
                  const activo = pathname === it.to;
                  return activo ? (
                    <Link key={it.to} to={it.to} className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg bg-[#F26B1D] text-white font-semibold shadow-sm transition-all duration-150 relative">
                      <span className="material-symbols-outlined text-[20px] filled text-white">{it.icono}</span>
                      <span>{it.texto}</span>
                      <span className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    </Link>
                  ) : (
                    <Link key={it.to} to={it.to} className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-slate-200 hover:bg-[#173a63] hover:text-white transition-colors duration-150">
                      <span className="material-symbols-outlined text-[20px] text-slate-300">{it.icono}</span>
                      <span>{it.texto}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Status Card: estado real del backend y modo activo */}
        <div className="p-4 m-3 bg-[#0a1e36] rounded-xl border border-[#1b3e68]/70">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Servidor del recomendador</span>
            {conectado === false ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Sin conexión
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-300 truncate font-mono">
            Modo activo: {config ? `${config.modo_activo} · ${NOMBRE_MODO[config.modo_activo] || ''}` : '—'}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">Tesis UPN 2026 · Recomendación</div>
        </div>
      </aside>

      {/* ========================================== */}
      {/* MAIN WORKSPACE CONTENT AREA                */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F6F8]">
        {/* CABECERA SUPERIOR BLANCA */}
        <header className="bg-white border-b border-[#E2E6EB] min-h-[72px] px-8 py-2 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold text-[#0F2A4A] tracking-tight leading-tight">{titulo}</h1>
              {subtitulo && <p className="text-xs text-slate-500 font-normal">{subtitulo}</p>}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {acciones}
            <Link to="/" className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-200">
              <span className="material-symbols-outlined text-[16px] text-[#0F2A4A]">storefront</span>
              <span className="font-medium">Ver tienda</span>
            </Link>

            <div className="h-8 w-[1px] bg-slate-200"></div>

            {/* User Information (Administrador) */}
            <div className="flex items-center gap-3 pl-1">
              <div className="w-10 h-10 rounded-full bg-[#0F2A4A] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-slate-100">
                AD
              </div>
              <div className="text-left hidden lg:block">
                <span className="text-sm font-semibold text-[#0F2A4A] block leading-tight">Administrador</span>
              </div>
              <button onClick={cerrarSesion} className="text-slate-400 hover:text-slate-600 ml-1 inline-flex items-center gap-1 text-xs" title="Cerrar sesión">
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="hidden xl:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>

        <main className="p-8 max-w-[1400px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Aviso en página (reemplaza alert()): tipo 'ok' | 'error' | 'info'
export function Aviso({ tipo = 'info', children, onCerrar }) {
  if (!children) return null;
  const estilos = {
    ok: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-[#0F2A4A]',
  };
  const icono = { ok: 'check_circle', error: 'error', info: 'info' };
  return (
    <div className={`flex items-start gap-2 px-4 py-2.5 rounded-lg border text-sm ${estilos[tipo]}`}>
      <span className="material-symbols-outlined text-[18px]">{icono[tipo]}</span>
      <span className="flex-1">{children}</span>
      {onCerrar && (
        <button onClick={onCerrar} className="opacity-60 hover:opacity-100">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}
