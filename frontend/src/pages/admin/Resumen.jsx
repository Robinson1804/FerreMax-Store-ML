import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import PanelLayout, { Aviso } from './PanelLayout';
import { mensajeError } from './panelUtil';

const MODOS = ['CONV', 'ML'];
const fmt = (v, d) => (v === null || v === undefined ? '—' : Number(v).toFixed(d));
const INDICADORES = [
  ['Tiempo de selección (s)', 'tiempo_seleccion_s', 2],
  ['Precision@5 de sesión', 'precision_5', 4],
  ['Recomendaciones aceptadas', 'recs_aceptadas', 2],
];

export default function Resumen() {
  const [ind, setInd] = useState(null);
  const [dash, setDash] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/indicadores').then((r) => setInd(r.data)).catch((e) => setError(mensajeError(e)));
    api.get('/api/admin/dashboard').then((r) => setDash(r.data)).catch((e) => setError(mensajeError(e)));
  }, []);

  const ag = ind?.agregados || {};
  const tarjetas = [
    ['Pedidos registrados', dash?.pedidos?.length, 'receipt_long', '/admin/pedidos'],
    ['Clientes', dash?.clientes?.length, 'group', '/admin/clientes'],
    ['Productos con stock ≤ mínimo', dash?.productos_bajo_stock?.length, 'inventory_2', '/admin/inventario'],
  ];

  return (
    <PanelLayout titulo="Resumen" subtitulo="Estado general de la tienda y de la evaluación">
      {error && <Aviso tipo="error">No se pudieron cargar los datos: {error}</Aviso>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tarjetas.map(([t, v, icono, to]) => (
          <Link key={t} to={to} className="bg-white rounded-[12px] p-5 border border-[#E2E6EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>{t}</span>
              <span className="material-symbols-outlined text-[20px] text-[#0F2A4A]">{icono}</span>
            </div>
            <div className="text-3xl font-extrabold text-[#0F2A4A] mt-2">{dash ? v ?? 0 : '—'}</div>
          </Link>
        ))}
      </div>

      <section className="bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#0F2A4A]">Indicadores de las sesiones de evaluación</h2>
            <p className="text-xs text-slate-500">Agregados por condición de GET /api/admin/indicadores</p>
          </div>
          <Link to="/admin/evaluacion" className="text-xs font-semibold text-[#F26B1D] hover:underline">Ver evaluación completa</Link>
        </div>
        {!ind ? <p className="text-sm text-slate-400">Cargando…</p> : (
          <>
            <p className="text-xs text-slate-600 mb-3">
              Sesiones válidas completas / registradas: CONV {ag.CONV?.sesiones_validas_completas ?? 0} / {ag.CONV?.sesiones_registradas ?? 0} · ML {ag.ML?.sesiones_validas_completas ?? 0} / {ag.ML?.sesiones_registradas ?? 0}
            </p>
            <div className="overflow-x-auto rounded-lg border border-[#E2E6EB]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F5F6F8] text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <th className="py-3 px-3">Indicador</th>
                    <th className="py-3 px-3 text-center">Condición</th>
                    <th className="py-3 px-3 text-right">n</th>
                    <th className="py-3 px-3 text-right">Media</th>
                    <th className="py-3 px-3 text-right">Mediana</th>
                    <th className="py-3 px-3 text-right">DE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {INDICADORES.flatMap(([nombre, campo, d]) => MODOS.map((m) => {
                    const s = ag[m]?.[campo];
                    return (
                      <tr key={campo + m}>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{nombre}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{m}</td>
                        <td className="py-2.5 px-3 text-right">{s?.n ?? 0}</td>
                        <td className="py-2.5 px-3 text-right">{fmt(s?.media, d)}</td>
                        <td className="py-2.5 px-3 text-right">{fmt(s?.mediana, d)}</td>
                        <td className="py-2.5 px-3 text-right">{fmt(s?.de, d)}</td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </PanelLayout>
  );
}
