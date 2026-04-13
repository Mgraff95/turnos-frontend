'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [turnos, setTurnos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [tab, setTab] = useState('turnos');
  const [loading, setLoading] = useState(false);

  // Check token on mount
  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
    if (savedToken) setToken(savedToken);
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (!token) return;
    loadTurnos();
    loadServicios();
  }, [token]);

  const loadTurnos = async () => {
    try {
      const res = await api.get('/api/admin/turnos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTurnos(res.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const loadServicios = async () => {
    try {
      const res = await api.get('/api/servicios');
      setServicios(res.data);
    } catch (err) { /* ignore */ }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await api.post('/api/admin/login', { email, password });
      setToken(res.data.token);
      sessionStorage.setItem('admin_token', res.data.token);
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem('admin_token');
  };

  // LOGIN
  if (!token) {
    return (
      <div className="max-w-sm mx-auto mt-16">
        <div className="text-center mb-8">
          <span className="text-4xl">🔐</span>
          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#8B6F5E] mt-3">
            Admin
          </h2>
        </div>
        <form onSubmit={handleLogin} className="card animate-fade-up">
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
              {loginError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#A89585] mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="text-sm text-[#A89585] mb-1 block">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // DASHBOARD
  const turnosHoy = turnos.filter(t => {
    const hoy = format(new Date(), 'yyyy-MM-dd');
    return t.fecha.split('T')[0] === hoy && t.estado === 'confirmado';
  });

  const turnosProximos = turnos.filter(t => {
    return new Date(t.fecha) >= new Date() && t.estado === 'confirmado';
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#8B6F5E]">
          Dashboard
        </h2>
        <button onClick={handleLogout} className="text-sm text-[#A89585] hover:text-[#8B6F5E] cursor-pointer">
          Cerrar sesión
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-2xl font-bold text-[#8B6F5E]">{turnosHoy.length}</p>
          <p className="text-xs text-[#A89585]">Turnos hoy</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-[#8B6F5E]">{turnosProximos.length}</p>
          <p className="text-xs text-[#A89585]">Próximos</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-[#8B6F5E]">{servicios.length}</p>
          <p className="text-xs text-[#A89585]">Servicios</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F5F0EB] rounded-lg p-1 mb-6">
        {[
          { id: 'turnos', label: 'Turnos' },
          { id: 'servicios', label: 'Servicios' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              tab === t.id ? 'bg-white text-[#8B6F5E] shadow-sm' : 'text-[#A89585]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Turnos tab */}
      {tab === 'turnos' && (
        <div className="space-y-3 animate-fade-up">
          {turnosProximos.length === 0 ? (
            <p className="text-center text-[#A89585] py-8">No hay turnos próximos</p>
          ) : (
            turnosProximos.map(turno => (
              <div key={turno.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold">{turno.cliente_nombre} {turno.cliente_apellido}</p>
                  <p className="text-sm text-[#8B6F5E]">
                    {format(new Date(turno.fecha), "EEE d MMM", { locale: es })} · {turno.hora_inicio} hs
                  </p>
                  <p className="text-xs text-[#A89585]">{turno.servicio?.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#A89585]">{turno.cliente_telefono}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                    turno.estado === 'confirmado' ? 'bg-[#E8F5E8] text-[#6B8F6B]' :
                    turno.estado === 'cancelado' ? 'bg-red-50 text-red-500' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {turno.estado}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Servicios tab */}
      {tab === 'servicios' && (
        <div className="space-y-3 animate-fade-up">
          {servicios.map(s => (
            <div key={s.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{s.nombre}</p>
                <p className="text-sm text-[#A89585]">{s.duracion_minutos} min</p>
              </div>
              <p className="text-lg font-bold text-[#8B6F5E]">${s.precio_pesos}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
