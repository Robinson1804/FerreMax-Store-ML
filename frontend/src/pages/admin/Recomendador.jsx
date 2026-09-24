// Panel · Recomendador. Reproduce diseno_stitch/05_panel_recomendador.html con datos reales:
// GET/PUT /api/admin/config, /api/admin/sesiones, /api/sesiones/activa, /api/admin/reglas, /api/productos,
// POST /api/admin/modelo/reentrenar. Ningún número se escribe a mano.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import PanelLayout, { Aviso } from './PanelLayout';
import { avisarConfig, mensajeError } from './panelUtil';

const ESCENARIOS = ['ESC-01', 'ESC-02', 'ESC-03', 'ESC-04', 'ESC-05', 'ESC-06', 'ESC-07', 'ESC-08'];
const PATRON_CLIENTE = /^CLI-\d{3}$/;
const TAM_PAGINA = 20;
const CAMPOS_CONFIG = ['modo_activo', 'k', 'soporte_min', 'confianza_min', 'lift_min', 'peso_contenido', 'variante_ml'];

const parseSkus = (s) => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [String(v)];
  } catch {
    return [String(s)];
  }
};
const fechaHora = (iso) => (iso ? `${String(iso).slice(0, 19).replace('T', ' ')} UTC` : '—');
const num = (v, d) => (v === null || v === undefined ? '—' : Number(v).toFixed(d));

export default function Recomendador() {
  const [config, setConfig] = useState(null);
  const [productos, setProductos] = useState({});
  const [reglas, setReglas] = useState(null);
  const [totalAlmacenadas, setTotalAlmacenadas] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [activa, setActiva] = useState(null);
  const [ultimoEntreno, setUltimoEntreno] = useState(null);

  const [form, setForm] = useState({ codigo_cliente: '', escenario: 'ESC-01', condicion: 'CONV', orden: 'A' });
  const [filtro, setFiltro] = useState('');
  const [visibles, setVisibles] = useState(TAM_PAGINA);
  const [verTodasSesiones, setVerTodasSesiones] = useState(false);

  const [ocupado, setOcupado] = useState('');
  const [aviso, setAviso] = useState(null); // {tipo, texto}

  const cargarConfig = useCallback(() =>
    api.get('/api/admin/config').then((r) => { setConfig(r.data); avisarConfig(r.data); }), []);
  const cargarSesiones = useCallback(() => Promise.all([
    api.get('/api/admin/sesiones').then((r) => setSesiones(r.data || [])),
    api.get('/api/sesiones/activa').then((r) => setActiva(r.data || null)),
  ]), []);
  const cargarReglas = useCallback(() => Promise.all([
    api.get('/api/admin/reglas', { params: { vigentes: true } }).then((r) => setReglas(r.data || [])),
    api.get('/api/admin/reglas').then((r) => setTotalAlmacenadas((r.data || []).length)),
  ]), []);

  useEffect(() => {
    const err = (e) => setAviso({ tipo: 'error', texto: `No se pudo cargar datos del backend: ${mensajeError(e)}` });
    cargarConfig().catch(err);
    cargarSesiones().catch(err);
    cargarReglas().catch(err);
    api.get('/api/productos')
      .then((r) => setProductos(Object.fromEntries((r.data || []).map((p) => [p.sku, p]))))
      .catch(err);
  }, [cargarConfig, cargarSesiones, cargarReglas]);

  // ---- Variante del modo ML: REGLAS (FP-Growth) o COMPLETO (candidatos + CF + reordenador) ----
  const cambiarVariante = async (variante) => {
    if (!config || config.variante_ml === variante || ocupado) return;
    setOcupado('modo');
    try {
      const cuerpo = Object.fromEntries(CAMPOS_CONFIG.map((c) => [c, config[c]]));
      cuerpo.variante_ml = variante;
      const r = await api.put('/api/admin/config', cuerpo);
      setConfig(r.data);
      avisarConfig(r.data);
      setAviso({ tipo: 'ok', texto: `Variante ML cambiada a ${variante}.` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: `No se pudo cambiar la variante: ${mensajeError(e)}` });
    } finally {
      setOcupado('');
    }
  };

  // ---- Modo activo ----
  const cambiarModo = async (modo) => {
    if (!config || config.modo_activo === modo || ocupado) return;
    setOcupado('modo');
    try {
      const cuerpo = Object.fromEntries(CAMPOS_CONFIG.map((c) => [c, config[c]]));
      cuerpo.modo_activo = modo;
      const r = await api.put('/api/admin/config', cuerpo);
      setConfig(r.data);
      avisarConfig(r.data);
      const nota = activa && activa.condicion !== modo
        ? ` Atención: la sesión activa ${activa.id_sesion} tiene condición ${activa.condicion}.`
        : '';
      setAviso({ tipo: activa && activa.condicion !== modo ? 'error' : 'ok', texto: `Modo activo cambiado a ${modo}.${nota}` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: `No se pudo cambiar el modo: ${mensajeError(e)}` });
    } finally {
      setOcupado('');
    }
  };

  // ---- Sesión de evaluación ----
  const clienteValido = PATRON_CLIENTE.test(form.codigo_cliente);
  const iniciarSesion = async (e) => {
    e.preventDefault();
    if (!clienteValido) {
      setAviso({ tipo: 'error', texto: 'El código de cliente debe tener el formato CLI-### (por ejemplo, CLI-007).' });
      return;
    }
    setOcupado('iniciar');
    try {
      const r = await api.post('/api/admin/sesiones', form);
      await Promise.all([cargarSesiones(), cargarConfig()]);
      setAviso({ tipo: 'ok', texto: `Sesión ${r.data?.sesion?.id_sesion} iniciada. Modo activo fijado en ${form.condicion}.` });
    } catch (err) {
      setAviso({ tipo: 'error', texto: `No se pudo iniciar la sesión: ${mensajeError(err)}` });
    } finally {
      setOcupado('');
    }
  };

  const finalizarSesion = async (valida) => {
    if (!activa) return;
    setOcupado(valida ? 'fin-valida' : 'fin-invalida');
    try {
      await api.put('/api/admin/sesiones', { id_sesion: activa.id_sesion, valida });
      setAviso({ tipo: 'ok', texto: `Sesión ${activa.id_sesion} finalizada como ${valida ? 'válida' : 'inválida'}.` });
      await cargarSesiones();
    } catch (err) {
      setAviso({ tipo: 'error', texto: `No se pudo finalizar la sesión: ${mensajeError(err)}` });
    } finally {
      setOcupado('');
    }
  };

  // ---- Modelo ----
  const reentrenar = async () => {
    setOcupado('reentrenar');
    try {
      const r = await api.post('/api/admin/modelo/reentrenar');
      setUltimoEntreno(r.data);
      setAviso({ tipo: r.data?.status === 'error' ? 'error' : 'ok', texto: r.data?.message || 'Reentrenamiento terminado.' });
      setVisibles(TAM_PAGINA);
      await cargarReglas();
    } catch (err) {
      setAviso({ tipo: 'error', texto: `No se pudo reentrenar: ${mensajeError(err)}` });
    } finally {
      setOcupado('');
    }
  };

  const nombre = useCallback((sku) => productos[sku]?.nombre || sku, [productos]);
  const versiones = useMemo(() => [...new Set((reglas || []).map((r) => r.version_modelo).filter(Boolean))], [reglas]);

  const reglasFiltradas = useMemo(() => {
    const lista = (reglas || []).map((r) => ({ ...r, ant: parseSkus(r.antecedentes), con: parseSkus(r.consecuentes) }));
    const f = filtro.trim().toLowerCase();
    if (!f) return lista;
    return lista.filter((r) => [...r.ant, ...r.con].some((s) => s.toLowerCase().includes(f) || nombre(s).toLowerCase().includes(f)));
  }, [reglas, filtro, nombre]);

  const descargarReglas = () => {
    const esc = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const filas = [['id', 'antecedentes', 'consecuentes', 'soporte', 'confianza', 'lift', 'version_modelo']];
    reglasFiltradas.forEach((r) => filas.push([r.id, r.ant.join(' + '), r.con.join(' + '), r.soporte, r.confianza, r.lift, r.version_modelo]));
    const blob = new Blob(['﻿' + filas.map((f) => f.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reglas_vigentes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const modo = config?.modo_activo;
  const listaSesiones = verTodasSesiones ? sesiones : sesiones.slice(0, 5);

  const tarjetaModo = (valor, titulo, descripcion, icono) => {
    const sel = modo === valor;
    return sel ? (
      <div className="flex-1 flex items-center justify-between p-4 rounded-lg bg-[#F26B1D] text-white shadow-sm ring-2 ring-[#F26B1D]/20 cursor-pointer transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] filled">{icono}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white block">{titulo}</span>
              <span className="bg-white/25 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide">Activo</span>
            </div>
            <span className="text-xs text-white/90 font-medium">{descripcion}</span>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-white text-[#F26B1D] flex items-center justify-center shadow">
          <span className="material-symbols-outlined text-[18px] font-bold">check</span>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => cambiarModo(valor)}
        disabled={!config || !!ocupado}
        className="flex-1 text-left flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-white text-slate-600 border border-transparent hover:border-slate-200 cursor-pointer transition-all duration-200 disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">{icono}</span>
          </div>
          <div>
            <span className="text-sm font-bold text-slate-700 block">{titulo}</span>
            <span className="text-xs text-slate-500 font-normal">{descripcion}</span>
          </div>
        </div>
        <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
          {/* Radio desmarcado */}
        </div>
      </button>
    );
  };

  return (
    <PanelLayout titulo="Recomendador" subtitulo="Gestión de algoritmos de asociación, sesiones de prueba y parámetros del modelo">
      {aviso && <Aviso tipo={aviso.tipo} onCerrar={() => setAviso(null)}>{aviso.texto}</Aviso>}

      {/* ========================================== */}
      {/* (1) TARJETA: MODO ACTIVO DEL SISTEMA      */}
      {/* ========================================== */}
      <section className="bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F26B1D]">
              <span className="material-symbols-outlined text-[22px]">toggle_on</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F2A4A]">Modo activo del sistema</h2>
              <p className="text-xs text-slate-500">Define el motor de recomendación desplegado en tiempo real en la tienda digital</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            Modo vigente: {modo || '—'}{config ? ` · k = ${config.k}` : ''}
          </div>
        </div>

        {/* Interruptor grande de dos posiciones */}
        <div className="bg-[#F5F6F8] p-1.5 rounded-xl border border-[#E2E6EB] flex flex-col sm:flex-row gap-2">
          {tarjetaModo('CONV', 'Convencional', 'Más vendidos y misma categoría', 'equalizer')}
          {tarjetaModo('ML', 'Machine Learning', 'Búsqueda por necesidad y reglas de asociación', 'auto_awesome')}
        </div>

        {/* Texto explicativo requerido */}
        <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-500">
          <span className="material-symbols-outlined text-[16px] text-[#F26B1D]">info</span>
          <span>El modo activo se aplica a toda la tienda. Al iniciar una sesión de evaluación el modo se fija en la condición de la sesión.</span>
        </div>
      </section>

      {/* ========================================== */}
      {/* FILA DE 2 TARJETAS: EVALUACIÓN Y MODELO    */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* (2) TARJETA: SESIÓN DE EVALUACIÓN (7 columnas) */}
        <section className="lg:col-span-7 bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm flex flex-col justify-between">
          <form onSubmit={iniciarSesion} className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-[#0F2A4A] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0F2A4A]">Sesión de evaluación</h2>
                    <p className="text-xs text-slate-500">Protocolo de prueba comparativa con usuarios participantes</p>
                  </div>
                </div>
                {activa ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-orange-50 text-[#F26B1D] border border-orange-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F26B1D] animate-pulse"></span> Sesión en curso
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Listo para registrar
                  </span>
                )}
              </div>

              {/* Sesión activa (GET /api/sesiones/activa) */}
              {activa && (
                <div className="mb-4 p-3 rounded-lg border border-orange-200 bg-orange-50/60 text-xs text-[#0F2A4A] grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="col-span-2 font-mono font-bold">{activa.id_sesion}</div>
                  <div>Cliente: <strong>{activa.codigo_cliente}</strong></div>
                  <div>Escenario: <strong>{activa.escenario}</strong></div>
                  <div>Condición: <strong>{activa.condicion}</strong></div>
                  <div>Orden: <strong>{activa.orden}</strong></div>
                  <div className="col-span-2 text-slate-500">Inicio: {fechaHora(activa.inicio)}</div>
                </div>
              )}

              {/* Formulario de campos de evaluación */}
              <div className="space-y-4">
                {/* Campo: Código de cliente */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F2A4A] mb-1.5 uppercase tracking-wide">
                    Código de cliente
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">person</span>
                    <input
                      type="text"
                      value={form.codigo_cliente}
                      onChange={(e) => setForm({ ...form, codigo_cliente: e.target.value.toUpperCase() })}
                      placeholder="CLI-###"
                      className={`w-full bg-[#F8F9FA] border rounded-lg pl-10 pr-4 py-2.5 text-sm font-semibold text-[#0F2A4A] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] ${form.codigo_cliente && !clienteValido ? 'border-red-400' : 'border-[#CBD5E1]'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                      {form.codigo_cliente && !clienteValido ? 'Formato CLI-###' : 'Participante'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Campo: Escenario (Lista desplegable) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0F2A4A] mb-1.5 uppercase tracking-wide">
                      Escenario de prueba
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">alt_route</span>
                      <select
                        value={form.escenario}
                        onChange={(e) => setForm({ ...form, escenario: e.target.value })}
                        className="w-full appearance-none bg-white border border-[#CBD5E1] rounded-lg pl-10 pr-10 py-2.5 text-sm font-medium text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                      >
                        {ESCENARIOS.map((e) => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  {/* Campo: Condición de la sesión */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0F2A4A] mb-1.5 uppercase tracking-wide">
                      Condición de esta sesión
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">science</span>
                      <select
                        value={form.condicion}
                        onChange={(e) => setForm({ ...form, condicion: e.target.value })}
                        className="w-full appearance-none bg-white border border-[#CBD5E1] rounded-lg pl-10 pr-10 py-2.5 text-sm font-medium text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                      >
                        <option value="CONV">CONV · Convencional</option>
                        <option value="ML">ML · Machine Learning</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </div>

                {/* Campo: Orden de condiciones */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F2A4A] mb-1.5 uppercase tracking-wide">
                    Orden de condiciones (Contrabalanceo)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['A', 'A: Convencional → ML', 'Grupo de control primero'],
                      ['B', 'B: ML → Convencional', 'Grupo experimental primero'],
                    ].map(([valor, titulo, desc]) => (
                      <label
                        key={valor}
                        className={form.orden === valor
                          ? 'flex items-center gap-2.5 p-3 rounded-lg border border-[#F26B1D] bg-orange-50/60 cursor-pointer'
                          : 'flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors'}
                      >
                        <input
                          type="radio"
                          name="order_condition"
                          checked={form.orden === valor}
                          onChange={() => setForm({ ...form, orden: valor })}
                          className="w-4 h-4 accent-[#F26B1D]"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-[#0F2A4A] block">{titulo}</span>
                          <span className="text-slate-500 text-[11px]">{desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción requeridos */}
            <div className="flex flex-wrap items-center gap-3 pt-5 mt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={!!ocupado || !clienteValido}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#F26B1D] hover:bg-[#d95a12] text-white text-sm font-bold shadow-sm transition-all duration-150 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[19px]">play_arrow</span>
                {ocupado === 'iniciar' ? 'Iniciando…' : 'Iniciar sesión de evaluación'}
              </button>
              <button
                type="button"
                onClick={() => finalizarSesion(true)}
                disabled={!activa || !!ocupado}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all duration-150 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[19px] text-emerald-600">stop</span>
                Finalizar (válida)
              </button>
              <button
                type="button"
                onClick={() => finalizarSesion(false)}
                disabled={!activa || !!ocupado}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all duration-150 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[19px] text-red-500">block</span>
                Finalizar (inválida)
              </button>
            </div>
          </form>
        </section>

        {/* (3) TARJETA: MODELO ACTUAL (5 columnas) */}
        <section className="lg:col-span-5 bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-[#0F2A4A] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">schema</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F2A4A]">Modelo actual</h2>
                  <p className="text-xs text-slate-500">Parámetros y reglas almacenadas</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0F2A4A] text-white">
                {versiones.length ? `Versión ${versiones.join(', ')}` : 'Sin versión'}
              </span>
            </div>

            {/* Resultado del último reentrenamiento en esta vista */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="material-symbols-outlined text-[17px] text-[#F26B1D]">calendar_today</span>
                <span>Último reentrenamiento:</span>
                <strong className="text-[#0F2A4A] font-semibold">{ultimoEntreno ? 'en esta sesión del panel' : 'no ejecutado en esta vista'}</strong>
              </div>
            </div>

            {/* Grid de Métricas Principales */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Comprobantes */}
              <div className="p-3 rounded-lg bg-white border border-[#E2E6EB] hover:border-slate-300 transition-colors">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Transacciones</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-extrabold text-[#0F2A4A]">{ultimoEntreno?.comprobantes ?? '—'}</span>
                  <span className="text-xs text-slate-500">{ultimoEntreno ? 'comprobantes' : 'tras reentrenar'}</span>
                </div>
              </div>

              {/* Reglas */}
              <div className="p-3 rounded-lg bg-white border border-[#E2E6EB] hover:border-slate-300 transition-colors">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Reglas vigentes</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-extrabold text-[#F26B1D]">{reglas ? reglas.length : '—'}</span>
                  <span className="text-xs text-slate-500">de {totalAlmacenadas ?? '—'} almacenadas</span>
                </div>
              </div>
            </div>

            {/* Umbrales y Parámetros Algorítmicos (GET /api/admin/config) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">Soporte mínimo (Min Support):</span>
                <span className="font-mono font-bold text-[#0F2A4A] bg-slate-100 px-2 py-0.5 rounded">{config ? config.soporte_min : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">Confianza mínima (Min Confidence):</span>
                <span className="font-mono font-bold text-[#0F2A4A] bg-slate-100 px-2 py-0.5 rounded">{config ? config.confianza_min : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">Lift mínimo (Min Lift):</span>
                <span className="font-mono font-bold text-[#0F2A4A] bg-slate-100 px-2 py-0.5 rounded">{config ? config.lift_min : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-medium">Peso de contenido (reordenador):</span>
                <span className="font-mono font-bold text-[#0F2A4A] bg-slate-100 px-2 py-0.5 rounded">{config ? config.peso_contenido : '—'}</span>
              </div>
              {/* Variante del modo ML */}
              <div className="pt-3 mt-2 border-t border-slate-100">
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Variante del modo ML</span>
                <div className="grid grid-cols-2 gap-2">
                  {[['REGLAS', 'Reglas FP-Growth'], ['COMPLETO', 'Reglas + CF + reordenador']].map(([v, etiqueta]) => (
                    <button key={v} type="button" onClick={() => cambiarVariante(v)} disabled={!!ocupado}
                      className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${config?.variante_ml === v
                        ? 'bg-[#FFF4ED] border-[#F26B1D] text-[#0F2A4A] font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <span className="block">{v}</span>
                      <span className="block font-normal text-[10px] text-slate-500">{etiqueta}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Ficha del reordenador supervisado (GET /api/admin/config → reordenador) */}
              <div className="pt-3 mt-2 border-t border-slate-100 text-xs space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reordenador supervisado</span>
                {config?.reordenador ? (
                  <>
                    <div className="flex justify-between"><span className="text-slate-500">Modelo elegido:</span><span className="font-mono font-bold text-[#0F2A4A]">{config.reordenador.tipo} · v{config.reordenador.version}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Entrenado:</span><span className="font-mono text-[#0F2A4A]">{config.reordenador.fecha}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Ejemplos (positivos):</span><span className="font-mono text-[#0F2A4A]">{config.reordenador.n_ejemplos} ({config.reordenador.n_positivos})</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Cobertura de candidatos:</span><span className="font-mono text-[#0F2A4A]">{config.reordenador.cobertura_candidatos}</span></div>
                    {Object.entries(config.reordenador.ap_validacion || {}).map(([m, ap]) => (
                      <div key={m} className="flex justify-between"><span className="text-slate-500">AP validación · {m}:</span><span className="font-mono text-[#0F2A4A]">{ap}</span></div>
                    ))}
                  </>
                ) : (
                  <span className="text-slate-400">Sin entrenar: use «Reentrenar modelo».</span>
                )}
              </div>
            </div>
          </div>

          {/* Botón azul marino Reentrenar modelo */}
          <div className="pt-5 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={reentrenar}
              disabled={!!ocupado}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#173a63] text-white text-sm font-bold shadow-sm transition-all duration-150 disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[19px] ${ocupado === 'reentrenar' ? 'animate-spin' : ''}`}>sync</span>
              {ocupado === 'reentrenar' ? 'Reentrenando…' : 'Reentrenar modelo'}
            </button>
          </div>
        </section>
      </div>

      {/* ========================================== */}
      {/* SESIONES RECIENTES (GET /api/admin/sesiones) */}
      {/* ========================================== */}
      <section className="bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-[#0F2A4A] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <h2 className="text-base font-bold text-[#0F2A4A]">Sesiones recientes</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">{sesiones.length} registradas</span>
          </div>
          {sesiones.length > 5 && (
            <button type="button" onClick={() => setVerTodasSesiones((v) => !v)} className="text-xs font-semibold text-[#F26B1D] hover:underline">
              {verTodasSesiones ? 'Ver menos' : 'Ver todas'}
            </button>
          )}
        </div>
        {sesiones.length === 0 ? (
          <p className="text-sm text-slate-500">Sin datos: aún no se ha registrado ninguna sesión de evaluación.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E2E6EB]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] font-bold text-[#0F2A4A] uppercase tracking-wider border-b border-[#E2E6EB]">
                  <th className="py-2.5 px-3">id_sesion</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Escenario</th>
                  <th className="py-2.5 px-3 text-center">Condición</th>
                  <th className="py-2.5 px-3 text-center">Orden</th>
                  <th className="py-2.5 px-3">Inicio</th>
                  <th className="py-2.5 px-3">Fin</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EB]">
                {listaSesiones.map((s) => (
                  <tr key={s.id_sesion} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono text-slate-700">{s.id_sesion}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#0F2A4A]">{s.codigo_cliente}</td>
                    <td className="py-2.5 px-3">{s.escenario}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={s.condicion === 'ML'
                        ? 'inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-[#F26B1D] border border-orange-200'
                        : 'inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-[#0F2A4A] border border-slate-300'}>{s.condicion}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">{s.orden}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{fechaHora(s.inicio)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{s.fin ? fechaHora(s.fin) : 'En curso'}</td>
                    <td className="py-2.5 px-3 text-center">
                      {!s.fin ? <span className="text-[#F26B1D] font-semibold">Activa</span>
                        : s.valida ? <span className="text-emerald-700 font-semibold">Válida</span>
                          : <span className="text-red-600 font-semibold">Inválida</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ========================================== */}
      {/* (4) TABLA: REGLAS DE ASOCIACIÓN PRINCIPALES*/}
      {/* ========================================== */}
      <section className="bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-[#F26B1D] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">hub</span>
              </div>
              <h2 className="text-base font-bold text-[#0F2A4A]">Reglas de asociación vigentes</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">Ordenadas por confianza × lift</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Reglas que cumplen los umbrales configurados de soporte, confianza y lift</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                value={filtro}
                onChange={(e) => { setFiltro(e.target.value); setVisibles(TAM_PAGINA); }}
                placeholder="Filtrar producto o SKU..."
                className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F26B1D] w-48"
              />
            </div>
            <button type="button" onClick={descargarReglas} disabled={!reglasFiltradas.length} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50" title="Descargar CSV">
              <span className="material-symbols-outlined text-[18px]">download</span>
            </button>
          </div>
        </div>

        {/* Tabla estructurada */}
        <div className="overflow-x-auto rounded-lg border border-[#E2E6EB]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] text-[12px] font-bold text-[#0F2A4A] uppercase tracking-wider border-b border-[#E2E6EB]">
                <th className="py-3 px-4 w-12 text-center text-slate-400 font-mono">#</th>
                <th className="py-3 px-4">Si compra (Antecedente)</th>
                <th className="py-3 px-4 text-center w-10 text-slate-400"></th>
                <th className="py-3 px-4">Recomienda (Consecuente)</th>
                <th className="py-3 px-4 text-right">Soporte</th>
                <th className="py-3 px-4 text-right">Confianza</th>
                <th className="py-3 px-4 text-right">Lift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EB] text-sm">
              {reglas === null && (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400 text-sm">Cargando reglas…</td></tr>
              )}
              {reglas !== null && reglasFiltradas.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-slate-500 text-sm">Sin datos: no hay reglas vigentes{filtro ? ' que coincidan con el filtro' : ''}.</td></tr>
              )}
              {reglasFiltradas.slice(0, visibles).map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-center text-xs text-slate-400 font-mono">{i + 1}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#0F2A4A]">
                    {r.ant.map((s) => (
                      <div key={s} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                        <span>{nombre(s)} <span className="font-mono text-[10px] text-slate-400">{s}</span></span>
                      </div>
                    ))}
                  </td>
                  <td className="py-3.5 px-4 text-center text-[#F26B1D]">
                    <span className="material-symbols-outlined text-[18px]">trending_flat</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {r.con.map((s) => (
                      <div key={s}>{nombre(s)} <span className="font-mono text-[10px] text-slate-400">{s}</span></div>
                    ))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-600 text-xs">{num(r.soporte, 3)}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F2A4A]">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 rounded">{num(r.confianza, 2)}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#F26B1D]">
                    {num(r.lift, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Lift &gt; 1: complementariedad por encima del azar</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Confianza: frecuencia condicionada</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-mono">
              Mostrando {Math.min(visibles, reglasFiltradas.length)} de {reglasFiltradas.length} reglas{filtro ? ' filtradas' : ' vigentes'}
            </span>
            {visibles < reglasFiltradas.length && (
              <button type="button" onClick={() => setVisibles((v) => v + TAM_PAGINA)} className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">
                Ver más
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Pie institucional interno del panel */}
      <footer className="pt-2 pb-6 text-center text-xs text-slate-400">
        Proyecto de Tesis UPN 2026 · Sistema Web de Comercio Electrónico Ferretero basado en Machine Learning · FerreMax
      </footer>
    </PanelLayout>
  );
}
