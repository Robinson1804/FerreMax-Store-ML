import { useEffect, useState } from 'react';
import { api, soles } from '../../lib/api';
import PanelLayout, { Aviso } from './PanelLayout';
import { mensajeError } from './panelUtil';

export default function Inventario() {
  const [productos, setProductos] = useState(null);
  const [bajoStock, setBajoStock] = useState(new Set());
  const [filtro, setFiltro] = useState('');
  const [soloBajo, setSoloBajo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/productos').then((r) => setProductos(r.data || [])).catch((e) => setError(mensajeError(e)));
    api.get('/api/admin/dashboard')
      .then((r) => setBajoStock(new Set((r.data?.productos_bajo_stock || []).map((p) => p.sku))))
      .catch((e) => setError(mensajeError(e)));
  }, []);

  const f = filtro.trim().toLowerCase();
  const lista = (productos || []).filter((p) =>
    (!soloBajo || bajoStock.has(p.sku)) &&
    (!f || [p.sku, p.nombre, p.categoria, p.marca].some((x) => String(x || '').toLowerCase().includes(f))));

  return (
    <PanelLayout titulo="Productos e inventario" subtitulo="Catálogo y stock actual">
      {error && <Aviso tipo="error">No se pudieron cargar los productos: {error}</Aviso>}
      <section className="bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm">
        <div className="flex flex-wrap items-center gap-3 pb-4 mb-4 border-b border-slate-100">
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar SKU, nombre, categoría o marca…" className="bg-[#F8F9FA] border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs w-72 focus:outline-none focus:ring-2 focus:ring-[#F26B1D]" />
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={soloBajo} onChange={(e) => setSoloBajo(e.target.checked)} className="accent-[#F26B1D]" />
            Solo stock ≤ mínimo ({bajoStock.size})
          </label>
          <span className="ml-auto text-xs text-slate-500">{productos ? `${lista.length} de ${productos.length} productos` : 'Cargando…'}</span>
        </div>
        <div className="overflow-auto max-h-[65vh] rounded-lg border border-[#E2E6EB]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0">
              <tr className="bg-[#F5F6F8] text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Nombre</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3">Marca</th>
                <th className="py-3 px-3 text-right">Precio</th>
                <th className="py-3 px-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((p) => (
                <tr key={p.sku} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono text-slate-600">{p.sku}</td>
                  <td className="py-2 px-3 font-semibold text-[#0F2A4A]">{p.nombre}</td>
                  <td className="py-2 px-3 text-slate-600">{p.categoria}</td>
                  <td className="py-2 px-3 text-slate-600">{p.marca}</td>
                  <td className="py-2 px-3 text-right font-mono">{soles(p.precio)}</td>
                  <td className={`py-2 px-3 text-right font-mono font-bold ${bajoStock.has(p.sku) ? 'text-red-600' : 'text-slate-800'}`}>{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PanelLayout>
  );
}
