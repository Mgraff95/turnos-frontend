'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [turnos, setTurnos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [tab, setTab] = useState('turnos');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // ── Estado para formularios ──────────────────
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', duracion_minutos: 30, precio_pesos: '' });
  const [editandoServicio, setEditandoServicio] = useState(null);
  const [nuevoBloque, setNuevoBloque] = useState({ fecha: '', motivo: '' });

  // Check token
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
    if (saved) setToken(saved);
  }, []);

  // Load data
  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token]);

  const loadAll = () => {
    loadTurnos();
    loadServicios();
    loadHorarios();
    loadBloques();
  };

  const headers = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const loadTurnos = async () => {
    try {
      const res = await api.get('/api/admin/turnos', headers());
      setTurnos(res.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    }
  };

  const loadServicios = async () => {
    try { const res = await api.get('/api/servicios'); setServicios(res.data); } catch (e) {}
  };

  const loadHorarios = async () => {
    try { const res = await api.get('/api/horarios'); setHorarios(res.data); } catch (e) {}
  };

  const loadBloques = async () => {
    try { const res = await api.get('/api/horarios/bloques-cerrados'); setBloques(res.data); } catch (e) {}
  };

  const showMsg = (msg) => { setMensaje(msg); setError(''); setTimeout(() => setMensaje(''), 3000); };
  const showErr = (msg) => { setError(msg); setMensaje(''); setTimeout(() => setError(''), 5000); };

  // ── LOGIN ────────────────────────────────────
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
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem('admin_token');
  };

  // ── SERVICIOS: Crear ─────────────────────────
  const handleCrearServicio = async (e) => {
    e.preventDefault();
    if (!nuevoServicio.nombre || !nuevoServicio.precio_pesos) return;
    try {
      await api.post('/api/servicios', nuevoServicio, headers());
      setNuevoServicio({ nombre: '', duracion_minutos: 30, precio_pesos: '' });
      showMsg('Servicio creado');
      loadServicios();
    } catch (err) { showErr(err.response?.data?.error || 'Error al crear servicio'); }
  };

  // ── SERVICIOS: Editar ────────────────────────
  const handleEditarServicio = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/servicios/${editandoServicio.id}`, {
        nombre: editandoServicio.nombre,
        duracion_minutos: parseInt(editandoServicio.duracion_minutos),
        precio_pesos: parseFloat(editandoServicio.precio_pesos)
      }, headers());
      setEditandoServicio(null);
      showMsg('Servicio actualizado');
      loadServicios();
    } catch (err) { showErr('Error al actualizar servicio'); }
  };

  // ── SERVICIOS: Desactivar ────────────────────
  const handleDesactivarServicio = async (id) => {
    if (!confirm('¿Desactivar este servicio?')) return;
    try {
      await api.delete(`/api/servicios/${id}`, headers());
      showMsg('Servicio desactivado');
      loadServicios();
    } catch (err) { showErr('Error al desactivar'); }
  };

  // ── HORARIOS: Actualizar ─────────────────────
  const handleActualizarHorario = async (dia, campo, valor) => {
    const horario = horarios.find(h => h.dia_semana === dia) || {};
    const data = {
      abierto: horario.abierto ?? true,
      hora_inicio: horario.hora_inicio || '09:00',
      hora_fin: horario.hora_fin || '18:00',
      espacio_entre_turnos_min: horario.espacio_entre_turnos_min || 10,
      [campo]: valor
    };
    try {
      await api.patch(`/api/horarios/${dia}`, data, headers());
      showMsg(`${DIAS[dia]} actualizado`);
      loadHorarios();
    } catch (err) { showErr('Error al actualizar horario'); }
  };

  // ── BLOQUES: Crear ───────────────────────────
  const handleCrearBloque = async (e) => {
    e.preventDefault();
    if (!nuevoBloque.fecha) return;
    try {
      await api.post('/api/horarios/bloques-cerrados', nuevoBloque, headers());
      setNuevoBloque({ fecha: '', motivo: '' });
      showMsg('Bloqueo agregado');
      loadBloques();
    } catch (err) { showErr('Error al crear bloqueo'); }
  };

  // ── BLOQUES: Eliminar ────────────────────────
  const handleEliminarBloque = async (id) => {
    try {
      await api.delete(`/api/horarios/bloques-cerrados/${id}`, headers());
      showMsg('Bloqueo eliminado');
      loadBloques();
    } catch (err) { showErr('Error al eliminar'); }
  };

  // ═══════════════ LOGIN SCREEN ═══════════════
  if (!token) {
    return (
      <div className="max-w-sm mx-auto mt-16">
        <div className="text-center mb-8">
          <span className="text-4xl">🔐</span>
          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#8B6F5E] mt-3">Admin</h2>
        </div>
        <form onSubmit={handleLogin} className="card animate-fade-up">
          {loginError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{loginError}</div>}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#A89585] mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="text-sm text-[#A89585] mb-1 block">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Entrando...' : 'Entrar'}</button>
          </div>
        </form>
      </div>
    );
  }

  // ═══════════════ DASHBOARD ═══════════════
  const turnosProximos = turnos.filter(t => new Date(t.fecha) >= new Date() && t.estado === 'confirmado')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));

  const turnosHoy = turnos.filter(t => {
    const hoy = format(new Date(), 'yyyy-MM-dd');
    return t.fecha.split('T')[0] === hoy && t.estado === 'confirmado';
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#8B6F5E]">Dashboard</h2>
        <button onClick={handleLogout} className="text-sm text-[#A89585] hover:text-[#8B6F5E] cursor-pointer">Cerrar sesión</button>
      </div>

      {/* Notificaciones */}
      {mensaje && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4 text-sm animate-fade-up">{mensaje}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm animate-fade-up">{error}</div>}

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
          { id: 'turnos', label: '📋 Turnos' },
          { id: 'servicios', label: '💅 Servicios' },
          { id: 'horarios', label: '🕐 Horarios' },
          { id: 'bloques', label: '🚫 Bloqueos' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === t.id ? 'bg-white text-[#8B6F5E] shadow-sm' : 'text-[#A89585]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: TURNOS ═══ */}
      {tab === 'turnos' && (
        <div className="space-y-3 animate-fade-up">
          {turnosProximos.length === 0 ? (
            <p className="text-center text-[#A89585] py-8">No hay turnos próximos</p>
          ) : turnosProximos.map(turno => (
            <div key={turno.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{turno.cliente_nombre} {turno.cliente_apellido}</p>
                <p className="text-sm text-[#8B6F5E]">{format(new Date(turno.fecha), "EEE d MMM", { locale: es })} · {turno.hora_inicio} hs</p>
                <p className="text-xs text-[#A89585]">{turno.servicio?.nombre}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#A89585]">{turno.cliente_telefono}</p>
                <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block bg-[#E8F5E8] text-[#6B8F6B]">confirmado</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TAB: SERVICIOS ═══ */}
      {tab === 'servicios' && (
        <div className="animate-fade-up">
          {/* Formulario crear servicio */}
          <div className="card mb-6">
            <h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Nuevo servicio</h3>
            <form onSubmit={handleCrearServicio} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="text-xs text-[#A89585] mb-1 block">Nombre</label>
                <input type="text" value={nuevoServicio.nombre} onChange={e => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
                  placeholder="Ej: Manicura gel" className="input-field" required />
              </div>
              <div>
                <label className="text-xs text-[#A89585] mb-1 block">Duración (min)</label>
                <input type="number" value={nuevoServicio.duracion_minutos} onChange={e => setNuevoServicio({ ...nuevoServicio, duracion_minutos: parseInt(e.target.value) || 0 })}
                  min="15" step="15" className="input-field" required />
              </div>
              <div>
                <label className="text-xs text-[#A89585] mb-1 block">Precio ($)</label>
                <input type="number" value={nuevoServicio.precio_pesos} onChange={e => setNuevoServicio({ ...nuevoServicio, precio_pesos: e.target.value })}
                  placeholder="500" className="input-field" required />
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn-primary w-full">Crear</button>
              </div>
            </form>
          </div>

          {/* Lista de servicios */}
          <div className="space-y-3">
            {servicios.map(s => (
              <div key={s.id} className="card">
                {editandoServicio?.id === s.id ? (
                  <form onSubmit={handleEditarServicio} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-xs text-[#A89585] mb-1 block">Nombre</label>
                      <input type="text" value={editandoServicio.nombre} onChange={e => setEditandoServicio({ ...editandoServicio, nombre: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label className="text-xs text-[#A89585] mb-1 block">Duración</label>
                      <input type="number" value={editandoServicio.duracion_minutos} onChange={e => setEditandoServicio({ ...editandoServicio, duracion_minutos: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label className="text-xs text-[#A89585] mb-1 block">Precio</label>
                      <input type="number" value={editandoServicio.precio_pesos} onChange={e => setEditandoServicio({ ...editandoServicio, precio_pesos: e.target.value })} className="input-field" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary flex-1">Guardar</button>
                      <button type="button" onClick={() => setEditandoServicio(null)} className="px-3 py-2 border border-[#E8DDD3] rounded-lg text-sm cursor-pointer">✕</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{s.nombre}</p>
                      <p className="text-sm text-[#A89585]">{s.duracion_minutos} min</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-[#8B6F5E]">${s.precio_pesos}</p>
                      <button onClick={() => setEditandoServicio({ ...s })} className="text-sm text-[#8B6F5E] hover:underline cursor-pointer">Editar</button>
                      <button onClick={() => handleDesactivarServicio(s.id)} className="text-sm text-[#C47070] hover:underline cursor-pointer">Desactivar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TAB: HORARIOS ═══ */}
      {tab === 'horarios' && (
        <div className="animate-fade-up">
          <p className="text-sm text-[#A89585] mb-4">Configurá los horarios de atención para cada día de la semana.</p>
          <div className="space-y-3">
            {DIAS.map((dia, idx) => {
              const h = horarios.find(h => h.dia_semana === idx) || { abierto: false, hora_inicio: '09:00', hora_fin: '18:00', espacio_entre_turnos_min: 10 };
              return (
                <div key={idx} className={`card transition-opacity ${h.abierto ? '' : 'opacity-60'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-[#2D2A26]">{dia}</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-[#A89585]">{h.abierto ? 'Abierto' : 'Cerrado'}</span>
                      <input type="checkbox" checked={h.abierto} onChange={e => handleActualizarHorario(idx, 'abierto', e.target.checked)}
                        className="w-5 h-5 accent-[#8B6F5E] cursor-pointer" />
                    </label>
                  </div>
                  {h.abierto && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-[#A89585] mb-1 block">Desde</label>
                        <input type="time" value={h.hora_inicio} onChange={e => handleActualizarHorario(idx, 'hora_inicio', e.target.value)} className="input-field" />
                      </div>
                      <div>
                        <label className="text-xs text-[#A89585] mb-1 block">Hasta</label>
                        <input type="time" value={h.hora_fin} onChange={e => handleActualizarHorario(idx, 'hora_fin', e.target.value)} className="input-field" />
                      </div>
                      <div>
                        <label className="text-xs text-[#A89585] mb-1 block">Espacio entre turnos (min)</label>
                        <input type="number" value={h.espacio_entre_turnos_min} onChange={e => handleActualizarHorario(idx, 'espacio_entre_turnos_min', parseInt(e.target.value) || 0)}
                          min="0" step="5" className="input-field" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TAB: BLOQUEOS ═══ */}
      {tab === 'bloques' && (
        <div className="animate-fade-up">
          <p className="text-sm text-[#A89585] mb-4">Bloqueá días específicos (feriados, vacaciones, etc.)</p>

          <div className="card mb-6">
            <h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Nuevo bloqueo</h3>
            <form onSubmit={handleCrearBloque} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[#A89585] mb-1 block">Fecha</label>
                <input type="date" value={nuevoBloque.fecha} onChange={e => setNuevoBloque({ ...nuevoBloque, fecha: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="text-xs text-[#A89585] mb-1 block">Motivo (opcional)</label>
                <input type="text" value={nuevoBloque.motivo} onChange={e => setNuevoBloque({ ...nuevoBloque, motivo: e.target.value })}
                  placeholder="Ej: Feriado" className="input-field" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn-primary w-full">Bloquear día</button>
              </div>
            </form>
          </div>

          {bloques.length === 0 ? (
            <p className="text-center text-[#A89585] py-8">No hay días bloqueados</p>
          ) : (
            <div className="space-y-3">
              {bloques.map(b => (
                <div key={b.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{format(new Date(b.fecha), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
                    {b.motivo && <p className="text-sm text-[#A89585]">{b.motivo}</p>}
                  </div>
                  <button onClick={() => handleEliminarBloque(b.id)} className="text-sm text-[#C47070] hover:underline cursor-pointer">Eliminar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
