// Panel · Evaluación. Basado en diseno_stitch/06_panel_evaluacion.html, con dos bloques separados:
//  (a) Capa 2 · sesiones con clientes  → GET /api/admin/indicadores
//  (b) Capa 1 · evaluación offline     → GET/POST /api/admin/evaluacion-offline
// Recall@5 solo existe offline y el tiempo de selección solo en sesiones: no se mezclan.
import { useCallback, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { api } from '../../lib/api';
import PanelLayout, { Aviso } from './PanelLayout';
import { mensajeError } from './panelUtil';

const NAVY = '#0F2A4A';
const NARANJA = '#F26B1D';
const MODOS = ['CONV', 'ML'];

const fmt = (v, d) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(d));
const fechaHora = (iso) => (iso ? String(iso).slice(0, 19).replace('T', ' ') : '—');

function Leyenda() {
  return (
    <div className="flex items-center gap-6 bg-[#F5F6F8] px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium">
      <div className="flex items-center gap-2">
        <span className="w-3.5 h-3.5 rounded bg-[#0F2A4A] inline-block"></span>
        <span className="text-slate-800 font-semibold">Convencional (CONV)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3.5 h-3.5 rounded bg-[#F26B1D] inline-block"></span>
        <span className="text-[#F26B1D] font-bold">Machine Learning (ML)</span>
      </div>
    </div>
  );
}

// Tarjeta de indicador: muestra el valor por condición (sin porcentajes de mejora inventados)
function TarjetaIndicador({ titulo, icono, colorIcono, conv, ml, pie }) {
  return (
    <div className="bg-white rounded-[12px] p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        <span>{titulo}</span>
        <span className={`p-1 rounded ${colorIcono}`}>
          <span className="material-symbols-outlined text-[18px]">{icono}</span>
        </span>
      </div>
      <div className="my-1 grid grid-cols-2 gap-2">
        <div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0F2A4A]"></span>CONV</span>
          <span className="text-2xl font-extrabold text-[#0F2A4A] tracking-tight">{conv}</span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F26B1D]"></span>ML</span>
          <span className="text-2xl font-extrabold text-[#F26B1D] tracking-tight">{ml}</span>
        </div>
      </div>
      <div className="pt-3 border-t border-gray-100 text-xs text-slate-500">{pie}</div>
    </div>
  );
}

// Series por defecto (Capa 2: condiciones CONV y ML)
const SERIES_CONDICION = [
  ['CONV', 'Convencional (CONV)', NAVY],
  ['ML', 'Machine Learning (ML)', NARANJA],
];
// Capa 1: tres modos offline
const VERDE = '#10B981';
const SERIES_OFFLINE = [
  ['CONV', 'CONV', NAVY],
  ['ML_REGLAS', 'ML_REGLAS', NARANJA],
  ['ML_COMPLETO', 'ML_COMPLETO', VERDE],
];

// Gráfico de barras por serie para un indicador; "Sin datos" si no hay valores
function GraficoCondicion({ datos, decimales, dominio, unidad, series = SERIES_CONDICION }) {
  const hay = datos.some((d) => series.some(([k]) => d[k] !== null && d[k] !== undefined));
  if (!hay) {
    return <div className="h-64 flex items-center justify-center text-sm text-slate-400 border border-dashed border-gray-200 rounded-lg">Sin datos</div>;
  }
  const etiqueta = (v) => (v === null || v === undefined ? '' : `${Number(v).toFixed(decimales)}${unidad || ''}`);
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} barGap={8}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey="indicador" tick={{ fontSize: 12, fill: '#334155' }} />
          <YAxis domain={dominio || [0, 'auto']} tick={{ fontSize: 11, fill: '#94A3B8' }} />
          <Tooltip formatter={(v) => etiqueta(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map(([clave, nombre, color]) => (
            <Bar key={clave} dataKey={clave} name={nombre} fill={color} radius={[6, 6, 0, 0]} maxBarSize={56}>
              <LabelList dataKey={clave} position="top" formatter={etiqueta} style={{ fontSize: 11, fontWeight: 700, fill: color }} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Tabla n / media / mediana / DE por condición
function TablaEstadisticos({ filas }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-[#F5F6F8] text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
            <th className="py-3 px-3.5">Indicador</th>
            <th className="py-3 px-3 text-center">Condición</th>
            <th className="py-3 px-3 text-right">n</th>
            <th className="py-3 px-3 text-right">Media</th>
            <th className="py-3 px-3 text-right">Mediana</th>
            <th className="py-3 px-3 text-right">DE (muestral)</th>
            {filas.some((f) => f.extra !== undefined) && <th className="py-3 px-3 text-right">{filas.find((f) => f.extra !== undefined)?.extraTitulo}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 font-mono text-[12px]">
          {filas.map((f) => (
            <tr key={`${f.indicador}-${f.modo}`} className={f.modo.startsWith('ML') ? 'hover:bg-orange-50/40' : 'hover:bg-blue-50/40'}>
              <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-800">{f.indicador}</td>
              <td className="py-2.5 px-3 text-center">
                <span className={f.modo === 'ML_COMPLETO'
                  ? 'inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : f.modo.startsWith('ML')
                  ? 'inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-[#F26B1D] border border-orange-200'
                  : 'inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-[#0F2A4A] border border-slate-300'}>{f.modo}</span>
              </td>
              <td className="py-2.5 px-3 text-right">{f.s?.n ?? '—'}</td>
              <td className="py-2.5 px-3 text-right font-bold">{fmt(f.s?.media, f.d)}</td>
              <td className="py-2.5 px-3 text-right">{fmt(f.s?.mediana, f.d)}</td>
              <td className="py-2.5 px-3 text-right">{fmt(f.s?.de, f.d)}</td>
              {filas.some((x) => x.extra !== undefined) && <td className="py-2.5 px-3 text-right">{f.extra ?? '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Evaluacion() {
  const [ind, setInd] = useState(null);
  const [off, setOff] = useState(undefined); // undefined = cargando, null = sin corrida
  const [cargando, setCargando] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [a, b] = await Promise.all([
        api.get('/api/admin/indicadores'),
        api.get('/api/admin/evaluacion-offline'),
      ]);
      setInd(a.data);
      setOff(b.data ?? null);
    } catch (e) {
      setAviso({ tipo: 'error', texto: `No se pudieron cargar los indicadores: ${mensajeError(e)}` });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutarOffline = async () => {
    setEjecutando(true);
    setAviso({ tipo: 'info', texto: 'Ejecutando evaluación offline… puede tardar unos segundos.' });
    try {
      const r = await api.post('/api/admin/evaluacion-offline');
      setOff(r.data ?? null);
      setAviso({ tipo: 'ok', texto: `Evaluación offline terminada (${r.data?.fecha_corrida ?? 'sin fecha'}).` });
    } catch (e) {
      setAviso({ tipo: 'error', texto: `No se pudo ejecutar la evaluación offline: ${mensajeError(e)}` });
    } finally {
      setEjecutando(false);
    }
  };

  // ---------- Capa 2 ----------
  const ag = ind?.agregados || {};
  const sesiones = MODOS.flatMap((m) => ind?.por_sesion?.[m] || [])
    .sort((x, y) => String(y.inicio).localeCompare(String(x.inicio)));
  const media = (m, campo) => ag[m]?.[campo]?.media ?? null;

  const filasCapa2 = [
    ['Tiempo de selección (s)', 'tiempo_seleccion_s', 2],
    ['Precision@5 de sesión', 'precision_5', 4],
    ['Recomendaciones aceptadas', 'recs_aceptadas', 2],
  ].flatMap(([indicador, campo, d]) => MODOS.map((modo) => ({ indicador, modo, d, s: ag[modo]?.[campo] })));

  // ---------- Capa 1 ----------
  const pm = off?.por_modo || {};
  const modosOffline = off?.modos || MODOS;
  const seriesOffline = SERIES_OFFLINE.filter(([k]) => modosOffline.includes(k)).length
    ? SERIES_OFFLINE.filter(([k]) => modosOffline.includes(k))
    : SERIES_CONDICION;
  const filasCapa1 = [
    ['Precision@5', 'precision5'],
    ['Recall@5', 'recall5'],
  ].flatMap(([indicador, campo]) => modosOffline.map((modo) => ({
    indicador, modo, d: 4, s: pm[modo]?.[campo], extra: pm[modo]?.aciertos, extraTitulo: 'Aciertos',
  })));

  const acciones = (
    <div className="flex items-center gap-3">
      <div className="hidden xl:flex items-center gap-2 bg-[#F5F6F8] px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-slate-700">
        <span className="material-symbols-outlined text-[16px] text-slate-500">calendar_month</span>
        <span>Sesiones de evaluación</span>
      </div>
      <button
        type="button"
        onClick={cargar}
        disabled={cargando}
        className="flex items-center gap-2 bg-[#0F2A4A] text-white hover:bg-[#18385E] px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
      >
        <span className={`material-symbols-outlined text-[16px] ${cargando ? 'animate-spin' : ''}`}>refresh</span>
        <span>Recalcular métricas</span>
      </button>
    </div>
  );

  return (
    <PanelLayout
      titulo="Evaluación del recomendador"
      subtitulo="Comparación de indicadores entre el modo convencional y el modo Machine Learning"
      acciones={acciones}
    >
      {aviso && <Aviso tipo={aviso.tipo} onCerrar={() => setAviso(null)}>{aviso.texto}</Aviso>}

      {/* ================================================= */}
      {/* (a) CAPA 2 · SESIONES CON CLIENTES                */}
      {/* ================================================= */}
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Sesiones con clientes · Capa 2</h2>
          <p className="text-xs text-slate-500">Fuente: registro de eventos de las sesiones de evaluación (GET /api/admin/indicadores)</p>
        </div>
      </div>

      {/* FILA DE TARJETAS DE INDICADOR */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <TarjetaIndicador
            titulo="Tiempo de selección (media)"
            icono="schedule"
            colorIcono="bg-amber-50 text-amber-600"
            conv={media('CONV', 'tiempo_seleccion_s') === null ? 'Sin datos' : `${fmt(media('CONV', 'tiempo_seleccion_s'), 1)} s`}
            ml={media('ML', 'tiempo_seleccion_s') === null ? 'Sin datos' : `${fmt(media('ML', 'tiempo_seleccion_s'), 1)} s`}
            pie={`n: CONV ${ag.CONV?.tiempo_seleccion_s?.n ?? 0} · ML ${ag.ML?.tiempo_seleccion_s?.n ?? 0} sesiones`}
          />
          <TarjetaIndicador
            titulo="Precision@5 de sesión (media)"
            icono="target"
            colorIcono="bg-orange-50 text-[#F26B1D]"
            conv={media('CONV', 'precision_5') === null ? 'Sin datos' : fmt(media('CONV', 'precision_5'), 4)}
            ml={media('ML', 'precision_5') === null ? 'Sin datos' : fmt(media('ML', 'precision_5'), 4)}
            pie={`n: CONV ${ag.CONV?.precision_5?.n ?? 0} · ML ${ag.ML?.precision_5?.n ?? 0} sesiones`}
          />
          <TarjetaIndicador
            titulo="Sesiones válidas completas"
            icono="layers"
            colorIcono="bg-slate-100 text-slate-600"
            conv={ind ? `${ag.CONV?.sesiones_validas_completas ?? 0} / ${ag.CONV?.sesiones_registradas ?? 0}` : '—'}
            ml={ind ? `${ag.ML?.sesiones_validas_completas ?? 0} / ${ag.ML?.sesiones_registradas ?? 0}` : '—'}
            pie="válidas y completas / registradas por condición"
          />
        </div>

        {/* NOTA METODOLÓGICA */}
        <p className="text-xs text-slate-500 italic mt-2.5 flex items-center gap-1.5 pl-1">
          <span className="material-symbols-outlined text-[16px] text-slate-400">info</span>
          <span>Precision@5 de sesión = promedio, sobre las listas con oportunidad de aceptación (mostradas antes del último PRODUCTO_AGREGADO), de |lista ∩ carrito al confirmar| / 5; las listas posteriores se excluyen y se informan como "sin oportunidad"; tiempo = CONFIRMACION_CARRITO − INICIO_BUSQUEDA. DE = desviación estándar muestral (—: menos de dos sesiones).</span>
        </p>
      </section>

      {/* GRÁFICO COMPARATIVO */}
      <section className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Comparativa de desempeño: Convencional vs. Machine Learning</h2>
            <p className="text-xs text-slate-500 mt-0.5">Medias por condición de las sesiones válidas y completas</p>
          </div>
          <Leyenda />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-2">Tiempo de selección (s) · media</h3>
            <GraficoCondicion
              datos={[{ indicador: 'Tiempo de selección', CONV: media('CONV', 'tiempo_seleccion_s'), ML: media('ML', 'tiempo_seleccion_s') }]}
              decimales={1}
              unidad=" s"
            />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-2">Precision@5 de sesión · media</h3>
            <GraficoCondicion
              datos={[{ indicador: 'Precision@5', CONV: media('CONV', 'precision_5'), ML: media('ML', 'precision_5') }]}
              decimales={4}
              dominio={[0, 1]}
            />
          </div>
        </div>
      </section>

      {/* ESTADÍSTICOS POR CONDICIÓN */}
      <section className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm">
        <div className="pb-4 mb-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-900">Estadísticos por condición</h2>
          <p className="text-xs text-slate-500 mt-0.5">n, media, mediana y desviación estándar muestral calculados por el backend</p>
        </div>
        {ind ? <TablaEstadisticos filas={filasCapa2} /> : <p className="text-sm text-slate-400">Cargando…</p>}
      </section>

      {/* TABLA POR SESIÓN */}
      <section className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Indicadores por sesión</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{sesiones.length} sesiones</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Cada fila se calcula a partir de los eventos registrados de la sesión</p>
          </div>
        </div>
        {sesiones.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Sin datos: aún no hay sesiones registradas.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-[#F5F6F8] text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">id_sesion</th>
                  <th className="py-3 px-3">cliente</th>
                  <th className="py-3 px-3">escenario</th>
                  <th className="py-3 px-2.5 text-center">condición</th>
                  <th className="py-3 px-2.5 text-center">orden</th>
                  <th className="py-3 px-3">inicio (UTC)</th>
                  <th className="py-3 px-2.5 text-center">válida</th>
                  <th className="py-3 px-2.5 text-center">completa</th>
                  <th className="py-3 px-3 text-right">tiempo (s)</th>
                  <th className="py-3 px-3 text-right">listas (sin oport.)</th>
                  <th className="py-3 px-3 text-right">recs mostradas</th>
                  <th className="py-3 px-3 text-right">recs aceptadas</th>
                  <th className="py-3 px-3 text-right">Precision@5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                {sesiones.map((s) => (
                  <tr key={s.id_sesion} className={s.condicion === 'ML' ? 'hover:bg-orange-50/40 transition-colors' : 'hover:bg-blue-50/40 transition-colors bg-slate-50/50'}>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{s.id_sesion}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">{s.codigo_cliente}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{s.escenario}</td>
                    <td className="py-2.5 px-2.5 text-center">
                      <span className={s.condicion === 'ML'
                        ? 'inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-[#F26B1D] border border-orange-200'
                        : 'inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-[#0F2A4A] border border-slate-300'}>{s.condicion}</span>
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-sans">{s.orden}</td>
                    <td className="py-2.5 px-3 text-slate-600">{fechaHora(s.inicio)}</td>
                    <td className="py-2.5 px-2.5 text-center font-sans">{s.valida ? 'Sí' : 'No'}</td>
                    <td className="py-2.5 px-2.5 text-center font-sans">{s.completa ? 'Sí' : 'No'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">{fmt(s.tiempo_s, 2)}</td>
                    <td className="py-2.5 px-3 text-right">{s.listas_mostradas ?? '—'}{s.listas_sin_oportunidad ? ` (${s.listas_sin_oportunidad})` : ''}</td>
                    <td className="py-2.5 px-3 text-right">{s.recs_mostradas ?? '—'}</td>
                    <td className="py-2.5 px-3 text-right">{s.recs_aceptadas ?? '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#F26B1D]">{fmt(s.precision_5, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ================================================= */}
      {/* (b) CAPA 1 · EVALUACIÓN OFFLINE                    */}
      {/* ================================================= */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 border-t border-gray-200">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Evaluación offline · Capa 1</h2>
          <p className="text-xs text-slate-500">Fuente: comprobantes históricos simulados con partición temporal (GET/POST /api/admin/evaluacion-offline)</p>
        </div>
        <button
          type="button"
          onClick={ejecutarOffline}
          disabled={ejecutando}
          className="inline-flex items-center gap-2 bg-[#F26B1D] hover:bg-[#DC5B12] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[16px] ${ejecutando ? 'animate-spin' : ''}`}>{ejecutando ? 'progress_activity' : 'play_arrow'}</span>
          {ejecutando ? 'Ejecutando…' : 'Ejecutar evaluación offline'}
        </button>
      </div>

      {off === undefined && <p className="text-sm text-slate-400">Cargando…</p>}
      {off === null && (
        <section className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm text-sm text-slate-500">
          Sin datos: la evaluación offline aún no se ha ejecutado.
        </section>
      )}
      {off && (
        <>
          {/* FICHA DE LA CORRIDA */}
          <section className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm">
            <div className="pb-4 mb-4 border-b border-gray-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#0F2A4A]">description</span>
              <h2 className="text-base font-bold text-slate-900">Ficha de la corrida</h2>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-xs">
              {[
                ['Fecha de la corrida', off.fecha_corrida],
                ['Conjunto de prueba', `${off.n_prueba_evaluados ?? '—'} evaluados de ${off.n_prueba_total ?? '—'} comprobantes`],
                ['Comprobantes (entrenamiento / total)', `${off.n_entrenamiento ?? '—'} / ${off.n_comprobantes ?? '—'}`],
                ['Semilla', off.semilla],
                ['Partición', off.particion],
                ['k', off.k],
                ['Periodo de entrenamiento', off.periodo_entrenamiento ? `${off.periodo_entrenamiento[0]} → ${off.periodo_entrenamiento[1]}` : '—'],
                ['Periodo de prueba', off.periodo_prueba ? `${off.periodo_prueba[0]} → ${off.periodo_prueba[1]}` : '—'],
                ['Umbrales', off.umbrales ? `soporte ≥ ${off.umbrales.soporte_min} · confianza ≥ ${off.umbrales.confianza_min} · lift ≥ ${off.umbrales.lift_min}` : '—'],
                ['Reglas entrenadas', off.reglas_entrenadas],
                ['Filtrado colaborativo', off.cf_productos != null ? `${off.cf_productos} productos · ${off.cf_clientes} clientes` : '—'],
                ['Reordenador', off.reordenador ? `${off.reordenador.tipo} · ${off.reordenador.n_ejemplos} ejemplos (${off.reordenador.n_positivos} positivos)` : '—'],
                ['AP validación temporal', off.reordenador ? Object.entries(off.reordenador.ap_validacion || {}).map(([m, v]) => `${m} ${v}`).join(' · ') : '—'],
                ['Cobertura de candidatos (prueba)', off.cobertura_candidatos_prueba ?? '—'],
                ['Peso de contenido', off.peso_contenido ?? '—'],
                ['Archivo CSV', off.csv],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                  <dd className="font-mono text-slate-800 break-words">{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* GRÁFICO + TABLA OFFLINE */}
          <section className="bg-white rounded-[12px] p-6 border border-gray-200 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Precision@5 y Recall@5 por modo (offline)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Precision@5 = aciertos / 5; Recall@5 = aciertos / 1 (un producto oculto por comprobante de prueba)</p>
              </div>
            </div>
            <div className="pt-6">
              <GraficoCondicion
                series={seriesOffline}
                datos={['precision5', 'recall5'].map((campo) => ({
                  indicador: campo === 'precision5' ? 'Precision@5' : 'Recall@5',
                  ...Object.fromEntries(modosOffline.map((m) => [m, pm[m]?.[campo]?.media ?? null])),
                }))}
                decimales={4}
                dominio={[0, 1]}
              />
            </div>
            <div className="mt-6">
              <TablaEstadisticos filas={filasCapa1} />
            </div>
            {off.mcnemar_exacto && (
              <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-[#F5F6F8] text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3.5">McNemar exacto (pares de modos)</th>
                      <th className="py-3 px-3 text-right">Ambos aciertan</th>
                      <th className="py-3 px-3 text-right">Solo el primero</th>
                      <th className="py-3 px-3 text-right">Solo el segundo</th>
                      <th className="py-3 px-3 text-right">Ninguno</th>
                      <th className="py-3 px-3 text-right">p-valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-[12px]">
                    {Object.entries(off.mcnemar_exacto).map(([par, m]) => (
                      <tr key={par}>
                        <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-800">{par.replace('_vs_', ' vs ')}</td>
                        <td className="py-2.5 px-3 text-right">{m.ambos}</td>
                        <td className="py-2.5 px-3 text-right">{m.solo_primero}</td>
                        <td className="py-2.5 px-3 text-right">{m.solo_segundo}</td>
                        <td className="py-2.5 px-3 text-right">{m.ninguno}</td>
                        <td className="py-2.5 px-3 text-right font-bold">{m.p_valor < 0.0001 ? '< 0.0001' : m.p_valor.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500 italic flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-slate-400">info</span>
              Datos simulados para la demostración del prototipo. Aciertos = comprobantes de prueba en que el producto oculto apareció en el top-5.
            </p>
          </section>
        </>
      )}
    </PanelLayout>
  );
}
