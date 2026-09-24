import { useEffect, useState } from 'react';
import { api, soles } from '../../lib/api';
import PanelLayout, { Aviso } from './PanelLayout';
import { mensajeError } from './panelUtil';

export default function Pedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/dashboard').then((r) => setPedidos(r.data?.pedidos || [])).catch((e) => setError(mensajeError(e)));
  }, []);

  return (
    <PanelLayout titulo="Pedidos" subtitulo="Pedidos registrados al confirmar el carrito">
      {error && <Aviso tipo="error">No se pudieron cargar los pedidos: {error}</Aviso>}
      <section className="bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm">
        <p className="text-xs text-slate-500 mb-3">{pedidos ? `${pedidos.length} pedidos` : 'Cargando…'}</p>
        {pedidos && pedidos.length === 0 ? <p className="text-sm text-slate-500">Sin datos: aún no hay pedidos.</p> : (
          <div className="overflow-x-auto rounded-lg border border-[#E2E6EB]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F6F8] text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Fecha (UTC)</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Entrega</th>
                  <th className="py-3 px-3">Pago</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(pedidos || []).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono">{p.id}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{String(p.fecha || '').slice(0, 19).replace('T', ' ')}</td>
                    <td className="py-2 px-3 font-semibold text-[#0F2A4A]">{p.codigo_cliente}</td>
                    <td className="py-2 px-3">{p.entrega || '—'}</td>
                    <td className="py-2 px-3">{p.pago || '—'}</td>
                    <td className="py-2 px-3">{p.estado}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{soles(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PanelLayout>
  );
}
