import os, re

# 1. Modify App.jsx to include global header/footer for "Modo" and "Datos simulados"
# I already did this in App.jsx (Dev Nav has Modo and Datos simulados).
# I will just ensure the footer has "Datos simulados".

# 2. Add API calls to Busqueda
with open(r'E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\frontend\src\pages\Busqueda.jsx', 'r', encoding='utf-8') as f:
    b_content = f.read()

b_content = b_content.replace('import React from "react";', 'import React, { useState, useEffect, useContext } from "react";\nimport axios from "axios";\nimport { ConfigContext } from "../App";')

b_content = re.sub(r'export default function Busqueda\(\) \{', '''export default function Busqueda() {
  const config = useContext(ConfigContext);
  const [resultados, setResultados] = useState([]);
  const [texto, setTexto] = useState("pintar un dormitorio");
  
  useEffect(() => {
    if(config) {
      axios.post("http://localhost:8000/api/buscar-necesidad", { texto, k: 5 })
           .then(res => setResultados(res.data))
           .catch(err => console.error(err));
           
      axios.post("http://localhost:8000/api/eventos", {
         id_sesion: "SES-FRONT", codigo_cliente: "CLI-999", escenario: "ESC-01", condicion: config.modo_activo,
         tipo_evento: "INICIO_BUSQUEDA", timestamp: Date.now()
      }).catch(() => {});
    }
  }, [config, texto]);
''', b_content)

# Replace product grid
# We look for the section with id="product-grid" or similar. We can just replace the whole main grid.
# The grid has class "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
grid_pattern = r'(<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">)(.*?)(<!-- Paginación -->)'
def repl_grid(m):
    return m.group(1) + '''
    {resultados.map(p => (
        <div key={p.sku} className="bg-surface-container-lowest border border-surface-container rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col group relative">
            <div className="p-4 flex-1 flex flex-col">
                <span className="text-label-sm font-label-sm text-outline mb-1">{p.marca}</span>
                <h3 className="text-body-lg font-body-lg text-on-surface leading-tight mb-2 group-hover:text-primary-container transition-colors">{p.nombre}</h3>
                <div className="mt-auto">
                    <span className="text-price-md font-price-md text-primary-container font-bold">S/ {p.precio.toFixed(2)}</span>
                </div>
            </div>
        </div>
    ))}
    ''' + m.group(3)

# Wait, the HTML doesn't have `<!-- Paginación -->` since I removed comments!
# Let's just do a simpler replacement
grid_pattern2 = r'(<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">)(.*?</section>)'

def repl_grid2(m):
    return m.group(1) + '''
    {resultados.map((p, i) => {
        // Send event on render for RECOM_MOSTRADA
        axios.post("http://localhost:8000/api/eventos", {
            id_sesion: "SES-FRONT", codigo_cliente: "CLI-999", escenario: "ESC-01", condicion: config.modo_activo,
            tipo_evento: "RECOM_MOSTRADA", timestamp: Date.now(), sku: p.sku, posicion_recom: i+1, origen: "BUSQUEDA"
        }).catch(() => {});
        return (
        <div key={p.sku} className="bg-surface-container-lowest border border-surface-container rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col group relative">
            <div className="p-4 flex-1 flex flex-col">
                <span className="text-label-sm font-label-sm text-outline mb-1">{p.marca}</span>
                <h3 className="text-body-lg font-body-lg text-on-surface leading-tight mb-2 group-hover:text-primary-container transition-colors">{p.nombre}</h3>
                <div className="mt-auto">
                    <span className="text-price-md font-price-md text-primary-container font-bold">S/ {p.precio.toFixed(2)}</span>
                </div>
            </div>
        </div>
    )})}
    </div></section>
    '''

b_content = re.sub(grid_pattern2, repl_grid2, b_content, flags=re.DOTALL)

with open(r'E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\frontend\src\pages\Busqueda.jsx', 'w', encoding='utf-8') as f:
    f.write(b_content)


# 3. Add API calls to Carrito
with open(r'E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\frontend\src\pages\Carrito.jsx', 'r', encoding='utf-8') as f:
    c_content = f.read()

c_content = c_content.replace('import React from "react";', 'import React, { useState, useEffect, useContext } from "react";\nimport axios from "axios";\nimport { ConfigContext } from "../App";')

c_content = re.sub(r'export default function Carrito\(\) \{', '''export default function Carrito() {
  const config = useContext(ConfigContext);
  const [recs, setRecs] = useState([]);
  
  useEffect(() => {
    if(config) {
      axios.post("http://localhost:8000/api/recomendar/carrito", { skus: ["PIN-001"], k: 4 })
           .then(res => setRecs(res.data))
           .catch(err => console.error(err));
    }
  }, [config]);

  const confirmarPedido = () => {
      axios.post("http://localhost:8000/api/carrito/confirmar", {
         id_sesion: "SES-FRONT", codigo_cliente: "CLI-999", escenario: "ESC-01", condicion: config.modo_activo,
         timestamp: Date.now(), items: [{sku: "PIN-001", cantidad: 1, precio: 48.0, origen: "BUSQUEDA"}], total: 48.0
      }).then(() => alert("Pedido confirmado")).catch(() => {});
  };
''', c_content)

c_content = c_content.replace('<button className="w-full bg-primary-container hover:bg-primary text-on-primary py-3 rounded-lg font-label-lg text-label-lg transition-colors cursor-pointer flex items-center justify-center gap-2">',
'<button onClick={confirmarPedido} className="w-full bg-primary-container hover:bg-primary text-on-primary py-3 rounded-lg font-label-lg text-label-lg transition-colors cursor-pointer flex items-center justify-center gap-2">')


# Replace complementar grid
# <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
comp_pattern = r'(<div className="grid grid-cols-2 md:grid-cols-4 gap-4">)(.*?)(</section>)'
def repl_comp(m):
    return m.group(1) + '''
    {recs.map(p => (
        <div key={p.sku} className="bg-surface-container-lowest border border-surface-container rounded-xl p-3 flex flex-col hover:shadow-md transition-shadow cursor-pointer group">
            <span className="text-label-sm font-label-sm text-outline mb-1">{p.marca}</span>
            <h4 className="text-label-md font-label-md text-on-surface leading-tight mb-2 flex-1 group-hover:text-primary-container transition-colors">{p.nombre}</h4>
            <span className="text-label-lg font-label-lg text-primary-container font-bold">S/ {p.precio.toFixed(2)}</span>
            <button className="mt-3 w-full bg-surface-container hover:bg-surface-dim text-primary-container py-1.5 rounded-lg text-label-md font-label-md transition-colors flex items-center justify-center gap-1">
                <span>Agregar</span>
            </button>
        </div>
    ))}
    </div></section>
    '''

c_content = re.sub(comp_pattern, repl_comp, c_content, flags=re.DOTALL)

with open(r'E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\frontend\src\pages\Carrito.jsx', 'w', encoding='utf-8') as f:
    f.write(c_content)

print("Logic injected successfully.")
