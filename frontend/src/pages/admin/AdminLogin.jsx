import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Aviso } from './PanelLayout';
import { mensajeError } from './panelUtil';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const res = await api.post('/api/admin/login', { username, password });
      localStorage.setItem('admin_token', res.data.token);
      navigate('/admin/recomendador');
    } catch (err) {
      setError(err?.response?.status === 401 ? 'Usuario o contraseña incorrectos.' : `No se pudo iniciar sesión: ${mensajeError(err)}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6F8] p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-[12px] border border-[#E2E6EB] shadow-sm max-w-sm w-full flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#F26B1D] flex items-center justify-center font-black text-xl text-white shadow-md">F</div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-[#0F2A4A] block leading-none">FERRE<span className="text-[#F26B1D]">MAX</span></span>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Panel de administración</span>
          </div>
        </div>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <label className="text-xs font-semibold text-[#0F2A4A] uppercase tracking-wide">
          Usuario
          <input type="text" autoComplete="username" className="mt-1 w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-lg px-3 py-2.5 text-sm font-normal normal-case focus:outline-none focus:ring-2 focus:ring-[#F26B1D]" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="text-xs font-semibold text-[#0F2A4A] uppercase tracking-wide">
          Contraseña
          <input type="password" autoComplete="current-password" className="mt-1 w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded-lg px-3 py-2.5 text-sm font-normal normal-case focus:outline-none focus:ring-2 focus:ring-[#F26B1D]" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={enviando} className="inline-flex items-center justify-center gap-2 bg-[#0F2A4A] hover:bg-[#173a63] text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-60">
          <span className="material-symbols-outlined text-[18px]">login</span>
          {enviando ? 'Ingresando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
