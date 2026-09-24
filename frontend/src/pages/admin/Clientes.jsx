import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import PanelLayout, { Aviso } from './PanelLayout';
import { mensajeError } from './panelUtil';

export default function Clientes() {
  const [clientes, setClientes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/dashboard').then((r) => setClientes(r.data?.clientes || [])).catch((e) => setError(mensajeError(e)));
  }, []);

  return (
    <PanelLayout titulo="Clientes" subtitulo="Clientes anonimizados por código (sin datos personales)">
      {error && <Aviso tipo="error">No se pudieron cargar los clientes: {error}</Aviso>}
      <section className="bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm">
        <p className="text-xs text-slate-500 mb-3">{clientes ? `${clientes.length} clientes` : 'Cargando…'}</p>
        <div className="overflow-auto max-h-[65vh] rounded-lg border border-[#E2E6EB]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0">
              <tr className="bg-[#F5F6F8] text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Primera compra</th>
                <th className="py-3 px-3 text-center">Participa en evaluación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(clientes || []).map((c) => (
                <tr key={c.codigo} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono font-semibold text-[#0F2A4A]">{c.codigo}</td>
                  <td className="py-2 px-3">{c.tipo || '—'}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{c.primera_compra ? String(c.primera_compra).slice(0, 10) : '—'}</td>
                  <td className="py-2 px-3 text-center">{c.participa_evaluacion ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PanelLayout>
  );
}
