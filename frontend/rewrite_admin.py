import os

dir_admin = r'E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\frontend\src\pages\admin'

# 1. Resumen (Indicadores)
resumen_code = """import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function Resumen() {
  const [data, setData] = useState(null);
  useEffect(() => {
    axios.get('http://localhost:8000/api/admin/indicadores').then(res => setData(res.data));
  }, []);

  if (!data) return <div className="p-4">Cargando...</div>;

  const chartData = [
    { name: 'Precision@5', CONV: data.agregados.CONV?.precision_5_media || 0, ML: data.agregados.ML?.precision_5_media || 0 },
  ];

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Resumen de Indicadores A/B</h1>
      <div className="grid grid-cols-2 gap-4">
         <div className="p-4 border rounded shadow">
             <h3 className="font-bold">CONV (Convencional)</h3>
             <p>N: {data.agregados.CONV?.n}</p>
             <p>Tiempo Medio: {data.agregados.CONV?.tiempo_medio?.toFixed(2)}s</p>
             <p>Precision@5: {data.agregados.CONV?.precision_5_media?.toFixed(2)}</p>
         </div>
         <div className="p-4 border rounded shadow">
             <h3 className="font-bold">ML (Machine Learning)</h3>
             <p>N: {data.agregados.ML?.n}</p>
             <p>Tiempo Medio: {data.agregados.ML?.tiempo_medio?.toFixed(2)}s</p>
             <p>Precision@5: {data.agregados.ML?.precision_5_media?.toFixed(2)}</p>
         </div>
      </div>
      
      <div className="mt-8 bg-white p-4 border rounded shadow">
         <h3 className="font-bold mb-4">Comparativa Precision@5</h3>
         <BarChart width={600} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="CONV" fill="#8884d8" />
            <Bar dataKey="ML" fill="#82ca9d" />
         </BarChart>
      </div>
    </div>
  );
}
"""
with open(os.path.join(dir_admin, 'Resumen.jsx'), 'w', encoding='utf-8') as f: f.write(resumen_code)

# 2. Recomendador (Reglas)
recomendador_code = """import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Recomendador() {
  const [reglas, setReglas] = useState([]);
  useEffect(() => {
    axios.get('http://localhost:8000/api/admin/reglas').then(res => setReglas(res.data));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Reglas de Asociación (FP-Growth)</h1>
      <div className="overflow-x-auto border rounded shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Antecedentes</th>
              <th className="p-2 text-left">Consecuentes</th>
              <th className="p-2 text-left">Soporte</th>
              <th className="p-2 text-left">Confianza</th>
              <th className="p-2 text-left">Lift</th>
            </tr>
          </thead>
          <tbody>
            {reglas.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.antecedentes}</td>
                <td className="p-2">{r.consecuentes}</td>
                <td className="p-2">{r.soporte.toFixed(3)}</td>
                <td className="p-2">{r.confianza.toFixed(3)}</td>
                <td className="p-2">{r.lift.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
"""
with open(os.path.join(dir_admin, 'Recomendador.jsx'), 'w', encoding='utf-8') as f: f.write(recomendador_code)

# 3. Configuracion
configuracion_code = """import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Configuracion() {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    axios.get('http://localhost:8000/api/admin/config').then(res => setConfig(res.data));
  }, []);

  const save = () => {
    axios.put('http://localhost:8000/api/admin/config', config).then(() => alert("Guardado"));
  };

  if(!config) return null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Configuración</h1>
      <div className="bg-white p-4 border rounded shadow max-w-md space-y-4">
        <div>
          <label className="block font-bold">Modo Activo</label>
          <select value={config.modo_activo} onChange={e => setConfig({...config, modo_activo: e.target.value})} className="border p-2 w-full">
            <option value="CONV">Convencional</option>
            <option value="ML">Machine Learning</option>
          </select>
        </div>
        <div>
          <label className="block font-bold">K Recomendaciones</label>
          <input type="number" value={config.k} onChange={e => setConfig({...config, k: parseInt(e.target.value)})} className="border p-2 w-full"/>
        </div>
        <div>
          <label className="block font-bold">Confianza Mínima</label>
          <input type="number" step="0.01" value={config.confianza_min} onChange={e => setConfig({...config, confianza_min: parseFloat(e.target.value)})} className="border p-2 w-full"/>
        </div>
        <div>
          <label className="block font-bold">Lift Mínimo</label>
          <input type="number" step="0.1" value={config.lift_min} onChange={e => setConfig({...config, lift_min: parseFloat(e.target.value)})} className="border p-2 w-full"/>
        </div>
        <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
      </div>
    </div>
  );
}
"""
with open(os.path.join(dir_admin, 'Configuracion.jsx'), 'w', encoding='utf-8') as f: f.write(configuracion_code)

# 4. RegistroEventos
eventos_code = """import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function RegistroEventos() {
  const [eventos, setEventos] = useState([]);
  const [cond, setCond] = useState("");
  
  useEffect(() => {
    axios.get('http://localhost:8000/api/admin/eventos' + (cond ? `?condicion=${cond}` : '')).then(res => setEventos(res.data));
  }, [cond]);

  const exportCSV = () => {
    let csv = "ID,Sesion,Cliente,Condicion,Evento,SKU,Origen,Timestamp\\n";
    eventos.forEach(e => {
        csv += `${e.id_evento},${e.id_sesion},${e.codigo_cliente},${e.condicion},${e.tipo_evento},${e.sku||''},${e.origen||''},${e.timestamp}\\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "eventos.csv";
    a.click();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Registro de Eventos</h1>
      <div className="mb-4 flex gap-4">
         <select value={cond} onChange={e=>setCond(e.target.value)} className="border p-2">
            <option value="">Todas las condiciones</option>
            <option value="CONV">CONV</option>
            <option value="ML">ML</option>
         </select>
         <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded">Exportar CSV</button>
      </div>
      <div className="overflow-x-auto border rounded shadow h-96 overflow-y-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 text-left">Sesión</th>
              <th className="p-2 text-left">Condición</th>
              <th className="p-2 text-left">Tipo Evento</th>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Origen</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map(e => (
              <tr key={e.id_evento} className="border-t">
                <td className="p-2">{e.id_sesion}</td>
                <td className="p-2">{e.condicion}</td>
                <td className="p-2">{e.tipo_evento}</td>
                <td className="p-2">{e.sku}</td>
                <td className="p-2">{e.origen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
"""
with open(os.path.join(dir_admin, 'RegistroEventos.jsx'), 'w', encoding='utf-8') as f: f.write(eventos_code)

# 5. Inventario, Pedidos, Clientes (using Dashboard endpoint)
inventario_code = """import React, { useEffect, useState } from 'react';
import axios from 'axios';
export default function Inventario() {
  const [data, setData] = useState([]);
  useEffect(() => { axios.get('http://localhost:8000/api/admin/dashboard').then(res => setData(res.data.productos_bajo_stock)); }, []);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Inventario (Bajo Stock)</h1>
      <div className="bg-white border rounded shadow p-4">
        {data.map(p => <div key={p.sku} className="border-b py-2">{p.sku} - {p.nombre} (Stock: <span className="text-red-600">{p.stock}</span>)</div>)}
      </div>
    </div>
  );
}
"""
with open(os.path.join(dir_admin, 'Inventario.jsx'), 'w', encoding='utf-8') as f: f.write(inventario_code)

pedidos_code = """import React, { useEffect, useState } from 'react';
import axios from 'axios';
export default function Pedidos() {
  const [data, setData] = useState([]);
  useEffect(() => { axios.get('http://localhost:8000/api/admin/dashboard').then(res => setData(res.data.pedidos)); }, []);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Pedidos Recientes</h1>
      <div className="bg-white border rounded shadow p-4">
        {data.map(p => <div key={p.id} className="border-b py-2">ID: {p.id} - Estado: {p.estado} - Total: S/{p.total}</div>)}
      </div>
    </div>
  );
}
"""
with open(os.path.join(dir_admin, 'Pedidos.jsx'), 'w', encoding='utf-8') as f: f.write(pedidos_code)

clientes_code = """import React, { useEffect, useState } from 'react';
import axios from 'axios';
export default function Clientes() {
  const [data, setData] = useState([]);
  useEffect(() => { axios.get('http://localhost:8000/api/admin/dashboard').then(res => setData(res.data.clientes)); }, []);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Directorio de Clientes Anónimos</h1>
      <div className="bg-white border rounded shadow p-4 grid grid-cols-3 gap-4">
        {data.map(c => <div key={c.codigo} className="border p-2 bg-gray-50">{c.codigo}</div>)}
      </div>
    </div>
  );
}
"""
with open(os.path.join(dir_admin, 'Clientes.jsx'), 'w', encoding='utf-8') as f: f.write(clientes_code)

# 6. Evaluacion
evaluacion_code = """import React, { useState } from 'react';
import axios from 'axios';

export default function Evaluacion() {
  const [form, setForm] = useState({ id_sesion: '', codigo_cliente: 'CLI-TEST', escenario: 'ESC-01', condicion: 'CONV', orden: 1 });
  
  const start = () => {
    axios.post('http://localhost:8000/api/admin/sesiones', form).then(() => alert('Iniciada'));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Control de Evaluación</h1>
      <div className="bg-white p-4 border rounded shadow max-w-md space-y-4">
         <input placeholder="ID Sesión (ej: SES-001)" value={form.id_sesion} onChange={e=>setForm({...form, id_sesion: e.target.value})} className="border p-2 w-full"/>
         <select value={form.condicion} onChange={e=>setForm({...form, condicion: e.target.value})} className="border p-2 w-full">
            <option value="CONV">CONV</option>
            <option value="ML">ML</option>
         </select>
         <button onClick={start} className="bg-blue-600 text-white px-4 py-2 rounded">Iniciar Sesión</button>
      </div>
    </div>
  );
}
"""
with open(os.path.join(dir_admin, 'Evaluacion.jsx'), 'w', encoding='utf-8') as f: f.write(evaluacion_code)
