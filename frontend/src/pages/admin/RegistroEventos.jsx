import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import PanelLayout, { Aviso } from './PanelLayout';
import { mensajeError } from './panelUtil';

// Los once campos exactos de registro_eventos, en este orden (tabla y CSV)
const CAMPOS = ['id_evento', 'id_sesion', 'codigo_cliente', 'escenario', 'condicion', 'tipo_evento',
  'texto_consulta', 'sku', 'posicion_recom', 'origen', 'timestamp'];
const TIPOS = ['INICIO_BUSQUEDA', 'CONSULTA', 'RECOM_MOSTRADA', 'PRODUCTO_AGREGADO', 'PRODUCTO_RETIRADO', 'CONFIRMACION_CARRITO'];
const VACIO = { id_sesion: '', codigo_cliente: '', condicion: '', tipo_evento: '' };

const celdaCsv = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function RegistroEventos() {
  const [eventos, setEventos] = useState([]);
  const [filtros, setFiltros] = useState(VACIO);
  const [aplicados, setAplicados] = useState(VACIO);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async (f) => {
    setCargando(true);
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, v.trim()]));
      const res = await api.get('/api/admin/eventos', { params });
      setEventos(res.data || []);
    } catch (e) {
      setAviso({ tipo: 'error', texto: `No se pudieron cargar los eventos: ${mensajeError(e)}` });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(aplicados); }, [cargar, aplicados]);

  const exportCSV = () => {
    const lineas = [CAMPOS.join(',')];
    eventos.forEach((e) => lineas.push(CAMPOS.map((c) => celdaCsv(e[c])).join(',')));
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registro_eventos.csv';
    a.click();
    URL.revokeObjectURL(url);
    setAviso({ tipo: 'ok', texto: `CSV exportado con ${eventos.length} eventos.` });
  };

  const input = 'bg-[#F8F9FA] border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#F26B1D]';

  return (
    <PanelLayout titulo="Registro de eventos" subtitulo="Trazabilidad de eventos por sesión y condición experimental">
      {aviso && <Aviso tipo={aviso.tipo} onCerrar={() => setAviso(null)}>{aviso.texto}</Aviso>}
      <section className="bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm">
        <form
          onSubmit={(e) => { e.preventDefault(); setAplicados({ ...filtros }); }}
          className="flex flex-wrap items-end gap-3 pb-5 border-b border-slate-100"
        >
          <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1">id_sesion
            <input className={input} value={filtros.id_sesion} onChange={(e) => setFiltros({ ...filtros, id_sesion: e.target.value })} placeholder="SES-…" />
          </label>
          <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1">codigo_cliente
            <input className={input} value={filtros.codigo_cliente} onChange={(e) => setFiltros({ ...filtros, codigo_cliente: e.target.value.toUpperCase() })} placeholder="CLI-###" />
          </label>
          <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1">condicion
            <select className={input} value={filtros.condicion} onChange={(e) => setFiltros({ ...filtros, condicion: e.target.value })}>
              <option value="">Todas</option>
              <option value="CONV">CONV</option>
              <option value="ML">ML</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1">tipo_evento
            <select className={input} value={filtros.tipo_evento} onChange={(e) => setFiltros({ ...filtros, tipo_evento: e.target.value })}>
              <option value="">Todos</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2A4A] hover:bg-[#173a63] text-white text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">filter_alt</span> Filtrar
          </button>
          <button type="button" onClick={() => { setFiltros(VACIO); setAplicados(VACIO); }} className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Limpiar
          </button>
          <button type="button" onClick={exportCSV} disabled={!eventos.length} className="ml-auto inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px] text-slate-500">download</span> Exportar CSV
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">{cargando ? 'Cargando…' : `${eventos.length} eventos encontrados (más recientes primero).`}</p>
        <div className="mt-2 overflow-auto max-h-[65vh] rounded-lg border border-[#E2E6EB]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0">
              <tr className="bg-[#F5F6F8] text-slate-600 font-semibold text-[10px] tracking-wider border-b border-gray-200">
                {CAMPOS.map((c) => <th key={c} className="py-3 px-3 whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
              {eventos.length === 0 && !cargando && (
                <tr><td colSpan={CAMPOS.length} className="py-6 text-center text-slate-500 font-sans">Sin datos para los filtros seleccionados.</td></tr>
              )}
              {eventos.map((e) => (
                <tr key={e.id_evento} className={e.condicion === 'ML' ? 'hover:bg-orange-50/40' : 'hover:bg-blue-50/40'}>
                  {CAMPOS.map((c) => (
                    <td key={c} className="py-2 px-3 whitespace-nowrap text-slate-700">{e[c] === null || e[c] === undefined ? '—' : String(e[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PanelLayout>
  );
}
