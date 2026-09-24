import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import { TiendaProvider } from './lib/tienda'
import PieDatosSimulados from './components/PieDatosSimulados'

import Inicio from './pages/Inicio'
import Busqueda from './pages/Busqueda'
import Detalle from './pages/Detalle'
import Carrito from './pages/Carrito'
import Confirmar from './pages/Confirmar'
import PedidoRegistrado from './pages/PedidoRegistrado'
import MiCuenta from './pages/MiCuenta'
import Login from './pages/Login'

import Recomendador from './pages/admin/Recomendador'
import Evaluacion from './pages/admin/Evaluacion'
import Resumen from './pages/admin/Resumen'
import Inventario from './pages/admin/Inventario'
import Pedidos from './pages/admin/Pedidos'
import Clientes from './pages/admin/Clientes'
import RegistroEventos from './pages/admin/RegistroEventos'
import Configuracion from './pages/admin/Configuracion'
import AdminLogin from './pages/admin/AdminLogin'

// Rutas /admin/* protegidas por el token del login simple por rol
function AdminLayout({ children }) {
  const token = localStorage.getItem('admin_token')
  if (!token) return <Navigate to="/admin/login" />
  return <div className="admin-layout">{children}</div>
}

const admin = (pagina) => <AdminLayout>{pagina}</AdminLayout>

export default function App() {
  return (
    <TiendaProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Inicio />} />
              <Route path="/busqueda" element={<Busqueda />} />
              <Route path="/detalle/:sku" element={<Detalle />} />
              <Route path="/carrito" element={<Carrito />} />
              <Route path="/confirmar" element={<Confirmar />} />
              <Route path="/pedido-registrado" element={<PedidoRegistrado />} />
              <Route path="/mi-cuenta" element={<MiCuenta />} />
              <Route path="/login" element={<Login />} />

              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Navigate to="/admin/recomendador" />} />
              <Route path="/admin/recomendador" element={admin(<Recomendador />)} />
              <Route path="/admin/evaluacion" element={admin(<Evaluacion />)} />
              <Route path="/admin/resumen" element={admin(<Resumen />)} />
              <Route path="/admin/inventario" element={admin(<Inventario />)} />
              <Route path="/admin/pedidos" element={admin(<Pedidos />)} />
              <Route path="/admin/clientes" element={admin(<Clientes />)} />
              <Route path="/admin/eventos" element={admin(<RegistroEventos />)} />
              <Route path="/admin/configuracion" element={admin(<Configuracion />)} />
            </Routes>
          </div>
          <PieDatosSimulados />
        </div>
      </Router>
    </TiendaProvider>
  )
}
