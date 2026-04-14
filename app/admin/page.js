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

  // Estado formularios
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', duracion_minutos: 30, precio_pesos: '' });
  const [editandoServicio, setEditandoServicio] = useState(null);
  const [nuevoBloque, setNuevoBloque] = useState({ fecha: '', motivo: '' });
  const [nuevoRango, setNuevoRango] = useState({ dia_semana: 0, hora_inicio: '09:00', hora_fin: '13:00', espacio_entre_turnos_min: 10 });
  const [mostrarFormTurno, setMostrarFormTurno] = useState(false);
  const [turnoManual, setTurnoManual] = useState({ nombre: '', apellido: '', telefono: '', servicio_id: '', fecha: '', hora_inicio: '' });
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
    if (saved) setToken(saved);
  }, []);

  useEffect(() => { if (token) loadAll(); }, [token]);

  // Cargar horarios disponibles cuando cambia fecha o servicio en turno manual
  useEffect(() => {
    if (!turnoManual.fecha || !turnoManual.servicio_id) { setHorariosDisponibles([]); return; }
    api.get(`/api/turnos/disponibilidad/${turnoManual.fecha}/${turnoManual.servicio_id}`)
      .then(res => setHorariosDisponibles(res.data.horarios || []))
      .catch(() => setHorariosDisponibles([]));
  }, [turnoManual.fecha, turnoManual.servicio_id]);

  const headers = () => ({ headers: { Authorization: `Bearer ${token}` } });
  const loadAll = () => { loadTurnos(); loadServicios(); loadHorarios(); loadBloques(); };

  const loadTurnos = async () => {
    try { const res = await api.get('/api/admin/turnos', headers()); setTurnos(res.data); }
    catch (err) { if (err.response?.status === 401) handleLogout(); }
  };
  const loadServicios = async () => { try { const res = await api.get('/api/servicios'); setServicios(res.data); } catch (e) {} };
  const loadHorarios = async () => { try { const res = await api.get('/api/horarios'); setHorarios(res.data); } catch (e) {} };
  const loadBloques = async () => { try { const res = await api.get('/api/horarios/bloques-cerrados'); setBloques(res.data); } catch (e) {} };

  const showMsg = (msg) => { setMensaje(msg); setError(''); setTimeout(() => setMensaje(''), 3000); };
  const showErr = (msg) => { setError(msg); setMensaje(''); setTimeout(() => setError(''), 5000); };

  // ── LOGIN ────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault(); setLoginError(''); setLoading(true);
    try {
      const res = await api.post('/api/admin/login', { email, password });
      setToken(res.data.token); sessionStorage.setItem('admin_token', res.data.token);
    } catch (err) { setLoginError(err.response?.data?.error || 'Error al iniciar sesión'); }
    finally { setLoading(false); }
  };
  const handleLogout = () => { setToken(null); sessionStorage.removeItem('admin_token'); };

  // ── SERVICIOS ────────────────────────────────
  const handleCrearServicio = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/servicios', nuevoServicio, headers());
      setNuevoServicio({ nombre: '', duracion_minutos: 30, precio_pesos: '' });
      showMsg('Servicio creado'); loadServicios();
    } catch (err) { showErr(err.response?.data?.error || 'Error al crear servicio'); }
  };

  const handleEditarServicio = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/servicios/${editandoServicio.id}`, {
        nombre: editandoServicio.nombre,
        duracion_minutos: parseInt(editandoServicio.duracion_minutos),
        precio_pesos: parseFloat(editandoServicio.precio_pesos)
      }, headers());
      setEditandoServicio(null); showMsg('Servicio actualizado'); loadServicios();
    } catch (err) { showErr('Error al actualizar'); }
  };

  const handleDesactivarServicio = async (id) => {
    if (!confirm('¿Desactivar este servicio?')) return;
    try { await api.delete(`/api/servicios/${id}`, headers()); showMsg('Servicio desactivado'); loadServicios(); }
    catch (err) { showErr('Error'); }
  };

  // ── HORARIOS (múltiples rangos) ──────────────
  const handleCrearRango = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/horarios', nuevoRango, headers());
      showMsg(`Rango agregado a ${DIAS[nuevoRango.dia_semana]}`);
      loadHorarios();
    } catch (err) { showErr('Error al crear rango'); }
  };

  const handleEditarRango = async (id, campo, valor) => {
    try {
      await api.patch(`/api/horarios/${id}`, { [campo]: valor }, headers());
      showMsg('Rango actualizado'); loadHorarios();
    } catch (err) { showErr('Error al actualizar'); }
  };

  const handleEliminarRango = async (id) => {
    if (!confirm('¿Eliminar este rango horario?')) return;
    try { await api.delete(`/api/horarios/${id}`, headers()); showMsg('Rango eliminado'); loadHorarios(); }
    catch (err) { showErr('Error'); }
  };

  // ── BLOQUES ──────────────────────────────────
  const handleCrearBloque = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/horarios/bloques-cerrados', nuevoBloque, headers());
      setNuevoBloque({ fecha: '', motivo: '' }); showMsg('Bloqueo agregado'); loadBloques();
    } catch (err) { showErr('Error'); }
  };
  const handleEliminarBloque = async (id) => {
    try { await api.delete(`/api/horarios/bloques-cerrados/${id}`, headers()); showMsg('Eliminado'); loadBloques(); }
    catch (err) { showErr('Error'); }
  };

  // ── TURNO MANUAL ─────────────────────────────
  const handleCrearTurnoManual = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/turnos', turnoManual, headers());
      setTurnoManual({ nombre: '', apellido: '', telefono: '', servicio_id: '', fecha: '', hora_inicio: '' });
      setMostrarFormTurno(false);
      showMsg('Turno creado manualmente'); loadTurnos();
    } catch (err) { showErr(err.response?.data?.error || 'Error al crear turno'); }
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
            <div><label className="text-sm text-[#A89585] mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required /></div>
            <div><label className="text-sm text-[#A89585] mb-1 block">Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Entrando...' : 'Entrar'}</button>
          </div>
        </form>
      </div>
    );
  }

  // ═══════════════ DASHBOARD ═══════════════
  const turnosProximos = turnos.filter(t => new Date(t.fecha) >= new Date() && t.estado === 'confirmado')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
  const turnosHoy = turnos.filter(t => { const hoy = format(new Date(), 'yyyy-MM-dd'); return t.fecha.split('T')[0] === hoy && t.estado === 'confirmado'; });

  // Agrupar horarios por día
  const horariosPorDia = {};
  DIAS.forEach((_, idx) => { horariosPorDia[idx] = horarios.filter(h => h.dia_semana === idx); });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#8B6F5E]">Dashboard</h2>
        <button onClick={handleLogout} className="text-sm text-[#A89585] hover:text-[#8B6F5E] cursor-pointer">Cerrar sesión</button>
      </div>

      {mensaje && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4 text-sm animate-fade-up">{mensaje}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm animate-fade-up">{error}</div>}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center"><p className="text-2xl font-bold text-[#8B6F5E]">{turnosHoy.length}</p><p className="text-xs text-[#A89585]">Turnos hoy</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-[#8B6F5E]">{turnosProximos.length}</p><p className="text-xs text-[#A89585]">Próximos</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-[#8B6F5E]">{servicios.length}</p><p className="text-xs text-[#A89585]">Servicios</p></div>
      </div>

      <div className="flex gap-1 bg-[#F5F0EB] rounded-lg p-1 mb-6">
        {[{ id: 'turnos', label: '📋 Turnos' }, { id: 'servicios', label: '💅 Servicios' }, { id: 'horarios', label: '🕐 Horarios' }, { id: 'bloques', label: '🚫 Bloqueos' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === t.id ? 'bg-white text-[#8B6F5E] shadow-sm' : 'text-[#A89585]'}`}>{t.label}</button>
        ))}
      </div>

      {/* ═══ TURNOS ═══ */}
      {tab === 'turnos' && (
        <div className="animate-fade-up">
          {/* Botón agregar turno manual */}
          <div className="mb-6">
            <button onClick={() => setMostrarFormTurno(!mostrarFormTurno)}
              className={`btn-primary ${mostrarFormTurno ? 'opacity-70' : ''}`}>
              {mostrarFormTurno ? '✕ Cancelar' : '➕ Agregar turno manual'}
            </button>
          </div>

          {/* Formulario turno manual */}
          {mostrarFormTurno && (
            <div className="card mb-6">
              <h3 className="font-semibold mb-4 text-[#8B6F5E]">Nuevo turno manual</h3>
              <form onSubmit={handleCrearTurnoManual} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className="text-xs text-[#A89585] mb-1 block">Nombre</label>
                    <input type="text" value={turnoManual.nombre} onChange={e => setTurnoManual({ ...turnoManual, nombre: e.target.value })} className="input-field" required /></div>
                  <div><label className="text-xs text-[#A89585] mb-1 block">Apellido</label>
                    <input type="text" value={turnoManual.apellido} onChange={e => setTurnoManual({ ...turnoManual, apellido: e.target.value })} className="input-field" required /></div>
                  <div><label className="text-xs text-[#A89585] mb-1 block">Teléfono</label>
                    <input type="tel" value={turnoManual.telefono} onChange={e => setTurnoManual({ ...turnoManual, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="1123456789" className="input-field" maxLength={10} required /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className="text-xs text-[#A89585] mb-1 block">Servicio</label>
                    <select value={turnoManual.servicio_id} onChange={e => setTurnoManual({ ...turnoManual, servicio_id: e.target.value, hora_inicio: '' })} className="input-field" required>
                      <option value="">Seleccionar...</option>
                      {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.duracion_minutos}min - ${s.precio_pesos})</option>)}
                    </select></div>
                  <div><label className="text-xs text-[#A89585] mb-1 block">Fecha</label>
                    <input type="date" value={turnoManual.fecha} onChange={e => setTurnoManual({ ...turnoManual, fecha: e.target.value, hora_inicio: '' })} className="input-field" required /></div>
                  <div><label className="text-xs text-[#A89585] mb-1 block">Hora</label>
                    <select value={turnoManual.hora_inicio} onChange={e => setTurnoManual({ ...turnoManual, hora_inicio: e.target.value })} className="input-field" required>
                      <option value="">Seleccionar...</option>
                      {horariosDisponibles.map(h => <option key={h.hora_inicio} value={h.hora_inicio}>{h.hora_inicio} - {h.hora_fin}</option>)}
                    </select>
                    {turnoManual.fecha && turnoManual.servicio_id && horariosDisponibles.length === 0 && (
                      <p className="text-xs text-[#C47070] mt-1">Sin horarios disponibles</p>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={!turnoManual.hora_inicio} className="btn-primary">Crear turno</button>
              </form>
            </div>
          )}

          {turnosProximos.length === 0 ? (
            <p className="text-center text-[#A89585] py-8">No hay turnos próximos</p>
          ) : (
            <div className="space-y-3">
              {turnosProximos.map(turno => (
                <div key={turno.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{turno.cliente_nombre} {turno.cliente_apellido}</p>
                    <p className="text-sm text-[#8B6F5E]">{format(new Date(turno.fecha), "EEE d MMM", { locale: es })} · {turno.hora_inicio} hs</p>
                    <p className="text-xs text-[#A89585]">{turno.servicio?.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#A89585]">{turno.cliente_telefono}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5E8] text-[#6B8F6B]">confirmado</span>
                      {turno.origen === 'manual' && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#A89585]">manual</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ SERVICIOS ═══ */}
      {tab === 'servicios' && (
        <div className="animate-fade-up">
          <div className="card mb-6">
            <h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Nuevo servicio</h3>
            <form onSubmit={handleCrearServicio} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div><label className="text-xs text-[#A89585] mb-1 block">Nombre</label>
                <input type="text" value={nuevoServicio.nombre} onChange={e => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })} placeholder="Ej: Manicura gel" className="input-field" required /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Duración (min)</label>
                <input type="number" value={nuevoServicio.duracion_minutos} onChange={e => setNuevoServicio({ ...nuevoServicio, duracion_minutos: parseInt(e.target.value) || 0 })} min="15" step="15" className="input-field" required /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Precio ($)</label>
                <input type="number" value={nuevoServicio.precio_pesos} onChange={e => setNuevoServicio({ ...nuevoServicio, precio_pesos: e.target.value })} placeholder="500" className="input-field" required /></div>
              <div className="flex items-end"><button type="submit" className="btn-primary w-full">Crear</button></div>
            </form>
          </div>
          <div className="space-y-3">
            {servicios.map(s => (
              <div key={s.id} className="card">
                {editandoServicio?.id === s.id ? (
                  <form onSubmit={handleEditarServicio} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div><label className="text-xs text-[#A89585] mb-1 block">Nombre</label><input type="text" value={editandoServicio.nombre} onChange={e => setEditandoServicio({ ...editandoServicio, nombre: e.target.value })} className="input-field" /></div>
                    <div><label className="text-xs text-[#A89585] mb-1 block">Duración</label><input type="number" value={editandoServicio.duracion_minutos} onChange={e => setEditandoServicio({ ...editandoServicio, duracion_minutos: e.target.value })} className="input-field" /></div>
                    <div><label className="text-xs text-[#A89585] mb-1 block">Precio</label><input type="number" value={editandoServicio.precio_pesos} onChange={e => setEditandoServicio({ ...editandoServicio, precio_pesos: e.target.value })} className="input-field" /></div>
                    <div className="flex gap-2"><button type="submit" className="btn-primary flex-1">Guardar</button><button type="button" onClick={() => setEditandoServicio(null)} className="px-3 py-2 border border-[#E8DDD3] rounded-lg text-sm cursor-pointer">✕</button></div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div><p className="font-semibold">{s.nombre}</p><p className="text-sm text-[#A89585]">{s.duracion_minutos} min</p></div>
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

      {/* ═══ HORARIOS (múltiples rangos) ═══ */}
      {tab === 'horarios' && (
        <div className="animate-fade-up">
          <p className="text-sm text-[#A89585] mb-4">Configurá múltiples rangos horarios por día. Ej: Lunes 9:00-13:00 y 15:00-19:00.</p>

          {/* Formulario agregar rango */}
          <div className="card mb-6">
            <h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Agregar rango horario</h3>
            <form onSubmit={handleCrearRango} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div><label className="text-xs text-[#A89585] mb-1 block">Día</label>
                <select value={nuevoRango.dia_semana} onChange={e => setNuevoRango({ ...nuevoRango, dia_semana: parseInt(e.target.value) })} className="input-field">
                  {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Desde</label>
                <input type="time" value={nuevoRango.hora_inicio} onChange={e => setNuevoRango({ ...nuevoRango, hora_inicio: e.target.value })} className="input-field" required /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Hasta</label>
                <input type="time" value={nuevoRango.hora_fin} onChange={e => setNuevoRango({ ...nuevoRango, hora_fin: e.target.value })} className="input-field" required /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Espacio (min)</label>
                <input type="number" value={nuevoRango.espacio_entre_turnos_min} onChange={e => setNuevoRango({ ...nuevoRango, espacio_entre_turnos_min: parseInt(e.target.value) || 0 })} min="0" step="5" className="input-field" /></div>
              <div className="flex items-end"><button type="submit" className="btn-primary w-full">Agregar</button></div>
            </form>
          </div>

          {/* Rangos por día */}
          <div className="space-y-4">
            {DIAS.map((dia, idx) => {
              const rangos = horariosPorDia[idx] || [];
              return (
                <div key={idx} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-[#2D2A26]">{dia}</h4>
                    {rangos.length === 0 && <span className="text-sm text-[#C47070]">Cerrado (sin rangos)</span>}
                  </div>
                  {rangos.length > 0 && (
                    <div className="space-y-2">
                      {rangos.map(r => (
                        <div key={r.id} className="flex items-center gap-3 bg-[#F5F0EB] rounded-lg p-3">
                          <input type="time" value={r.hora_inicio} onChange={e => handleEditarRango(r.id, 'hora_inicio', e.target.value)} className="input-field w-28" />
                          <span className="text-[#A89585]">a</span>
                          <input type="time" value={r.hora_fin} onChange={e => handleEditarRango(r.id, 'hora_fin', e.target.value)} className="input-field w-28" />
                          <span className="text-xs text-[#A89585] hidden sm:inline">espacio:</span>
                          <input type="number" value={r.espacio_entre_turnos_min} onChange={e => handleEditarRango(r.id, 'espacio_entre_turnos_min', parseInt(e.target.value) || 0)}
                            className="input-field w-16" min="0" />
                          <span className="text-xs text-[#A89585] hidden sm:inline">min</span>
                          <button onClick={() => handleEliminarRango(r.id)} className="text-[#C47070] hover:text-red-700 text-sm cursor-pointer ml-auto">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ BLOQUEOS ═══ */}
      {tab === 'bloques' && (
        <div className="animate-fade-up">
          <p className="text-sm text-[#A89585] mb-4">Bloqueá días específicos (feriados, vacaciones, etc.)</p>
          <div className="card mb-6">
            <h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Nuevo bloqueo</h3>
            <form onSubmit={handleCrearBloque} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="text-xs text-[#A89585] mb-1 block">Fecha</label>
                <input type="date" value={nuevoBloque.fecha} onChange={e => setNuevoBloque({ ...nuevoBloque, fecha: e.target.value })} className="input-field" required /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Motivo (opcional)</label>
                <input type="text" value={nuevoBloque.motivo} onChange={e => setNuevoBloque({ ...nuevoBloque, motivo: e.target.value })} placeholder="Ej: Feriado" className="input-field" /></div>
              <div className="flex items-end"><button type="submit" className="btn-primary w-full">Bloquear día</button></div>
            </form>
          </div>
          {bloques.length === 0 ? (
            <p className="text-center text-[#A89585] py-8">No hay días bloqueados</p>
          ) : (
            <div className="space-y-3">
              {bloques.map(b => (
                <div key={b.id} className="card flex items-center justify-between">
                  <div><p className="font-semibold">{format(new Date(b.fecha), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
                    {b.motivo && <p className="text-sm text-[#A89585]">{b.motivo}</p>}</div>
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
