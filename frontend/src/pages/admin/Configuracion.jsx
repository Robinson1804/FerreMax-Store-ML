import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import PanelLayout, { Aviso } from './PanelLayout';
import { avisarConfig, mensajeError } from './panelUtil';

// Los seis campos de /api/admin/config; el PUT se envía siempre con el cuerpo completo
const CAMPOS = [
  { campo: 'k', etiqueta: 'k (recomendaciones por lista)', tipo: 'int', paso: 1 },
  { campo: 'soporte_min', etiqueta: 'Soporte mínimo', tipo: 'float', paso: 0.001 },
  { campo: 'confianza_min', etiqueta: 'Confianza mínima', tipo: 'float', paso: 0.01 },
  { campo: 'lift_min', etiqueta: 'Lift mínimo', tipo: 'float', paso: 0.1 },
  { campo: 'peso_contenido', etiqueta: 'Peso de contenido (reordenador ML; 1 = neutro)', tipo: 'float', paso: 0.05 },
];

export default function Configuracion() {
  const [config, setConfig] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/api/admin/config')
      .then((res) => setConfig(res.data))
      .catch((e) => setAviso({ tipo: 'error', texto: `No se pudo leer la configuración: ${mensajeError(e)}` }));
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    const cuerpo = { modo_activo: config.modo_activo, variante_ml: config.variante_ml };
    for (const c of CAMPOS) {
      const v = c.tipo === 'int' ? parseInt(config[c.campo], 10) : parseFloat(config[c.campo]);
      if (Number.isNaN(v)) {
        setAviso({ tipo: 'error', texto: `El campo "${c.etiqueta}" no es un número válido.` });
        return;
      }
      cuerpo[c.campo] = v;
    }
    setGuardando(true);
    try {
      const res = await api.put('/api/admin/config', cuerpo);
      setConfig(res.data);
      avisarConfig(res.data);
      setAviso({ tipo: 'ok', texto: 'Configuración guardada.' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: `No se pudo guardar: ${mensajeError(err)}` });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PanelLayout titulo="Configuración" subtitulo="Modo activo y parámetros del recomendador">
      {aviso && <Aviso tipo={aviso.tipo} onCerrar={() => setAviso(null)}>{aviso.texto}</Aviso>}
      {config && (
        <form onSubmit={guardar} className="bg-white rounded-[12px] p-6 border border-[#E2E6EB] shadow-sm max-w-xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F2A4A] mb-1.5 uppercase tracking-wide">Modo activo</label>
            <select value={config.modo_activo} onChange={(e) => setConfig({ ...config, modo_activo: e.target.value })} className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B1D]">
              <option value="CONV">CONV · Convencional</option>
              <option value="ML">ML · Machine Learning</option>
            </select>
          </div>
          {CAMPOS.map((c) => (
            <div key={c.campo}>
              <label className="block text-xs font-semibold text-[#0F2A4A] mb-1.5 uppercase tracking-wide">{c.etiqueta}</label>
              <input
                type="number"
                step={c.paso}
                value={config[c.campo] ?? ''}
                onChange={(e) => setConfig({ ...config, [c.campo]: e.target.value })}
                className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
              />
            </div>
          ))}
          <p className="text-xs text-slate-500">Los umbrales se aplican al filtrar reglas vigentes y al reentrenar el modelo (panel Recomendador).</p>
          <button type="submit" disabled={guardando} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F2A4A] hover:bg-[#173a63] text-white text-sm font-bold disabled:opacity-60">
            <span className="material-symbols-outlined text-[18px]">save</span>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      )}
    </PanelLayout>
  );
}
