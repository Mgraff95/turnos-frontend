'use client';
import { useState, useEffect, useCallback } from 'react';
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
const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', duracion_minutos: 30, precio_pesos: '', intercalable: false, intercalar_desde_min: 30, servicios_compatibles: [], max_simultaneos: 2 });  const [editandoServicio, setEditandoServicio] = useState(null);
  const [nuevoBloque, setNuevoBloque] = useState({ fecha: '', motivo: '' });
  const [nuevoRango, setNuevoRango] = useState({ dia_semana: 0, hora_inicio: '09:00', hora_fin: '13:00', espacio_entre_turnos_min: 10 });
  const [mostrarFormTurno, setMostrarFormTurno] = useState(false);
  const [turnoManual, setTurnoManual] = useState({ nombre: '', apellido: '', telefono: '', servicio_id: '', fecha: '', hora_inicio: '' });
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [periodoMetricas, setPeriodoMetricas] = useState('mes');
  const [clientes, setClientes] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [ordenClientes, setOrdenClientes] = useState('frecuencia');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [fichaCliente, setFichaCliente] = useState(null);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [nuevaNota, setNuevaNota] = useState('');
  // Waitlist admin
  const [waitlistEntries, setWaitlistEntries] = useState([]);

  useEffect(() => { const saved = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null; if (saved) setToken(saved); }, []);
  useEffect(() => { if (token) loadAll(); }, [token]);
  useEffect(() => { if (!turnoManual.fecha || !turnoManual.servicio_id) { setHorariosDisponibles([]); return; } api.get(`/api/turnos/disponibilidad/${turnoManual.fecha}/${turnoManual.servicio_id}`).then(res => setHorariosDisponibles(res.data.horarios || [])).catch(() => setHorariosDisponibles([])); }, [turnoManual.fecha, turnoManual.servicio_id]);
  useEffect(() => { if (tab === 'clientes' && token) loadClientes(); }, [tab, token]);
  useEffect(() => { if (tab === 'waitlist' && token) loadWaitlist(); }, [tab, token]);

  const headers = () => ({ headers: { Authorization: `Bearer ${token}` } });
  const loadAll = () => { loadTurnos(); loadServicios(); loadHorarios(); loadBloques(); };
  const loadTurnos = async () => { try { const res = await api.get('/api/admin/turnos', headers()); setTurnos(res.data); } catch (err) { if (err.response?.status === 401) handleLogout(); } };
  const loadServicios = async () => { try { const res = await api.get('/api/servicios'); setServicios(res.data); } catch (e) {} };
  const loadHorarios = async () => { try { const res = await api.get('/api/horarios'); setHorarios(res.data); } catch (e) {} };
  const loadBloques = async () => { try { const res = await api.get('/api/horarios/bloques-cerrados'); setBloques(res.data); } catch (e) {} };
  const loadClientes = async () => { try { const res = await api.get('/api/admin/clientes', headers()); setClientes(res.data); } catch (e) {} };
  const loadWaitlist = async () => { try { const res = await api.get('/api/waitlist/admin', headers()); setWaitlistEntries(res.data); } catch (e) {} };

  const loadFichaCliente = async (telefono) => { setLoadingFicha(true); try { const res = await api.get(`/api/admin/clientes/${telefono}`, headers()); setFichaCliente(res.data); setClienteSeleccionado(telefono); } catch (e) { showErr('Error cargando ficha'); } finally { setLoadingFicha(false); } };
  const handleAgregarNota = async () => { if (!nuevaNota.trim() || !clienteSeleccionado) return; try { await api.post(`/api/admin/clientes/${clienteSeleccionado}/notas`, { texto: nuevaNota }, headers()); setNuevaNota(''); loadFichaCliente(clienteSeleccionado); showMsg('Nota agregada'); } catch (e) { showErr('Error al agregar nota'); } };
  const handleEliminarNota = async (notaId) => { if (!confirm('¿Eliminar esta nota?')) return; try { await api.delete(`/api/admin/clientes/${clienteSeleccionado}/notas/${notaId}`, headers()); loadFichaCliente(clienteSeleccionado); showMsg('Nota eliminada'); } catch (e) { showErr('Error'); } };
  const handleEliminarWaitlist = async (id) => { if (!confirm('¿Eliminar de la lista de espera?')) return; try { await api.delete(`/api/waitlist/${id}`, headers()); showMsg('Eliminado de waitlist'); loadWaitlist(); } catch (e) { showErr('Error'); } };

  const showMsg = (msg) => { setMensaje(msg); setError(''); setTimeout(() => setMensaje(''), 3000); };
  const showErr = (msg) => { setError(msg); setMensaje(''); setTimeout(() => setError(''), 5000); };

  const handleLogin = async (e) => { e.preventDefault(); setLoginError(''); setLoading(true); try { const res = await api.post('/api/admin/login', { email, password }); setToken(res.data.token); sessionStorage.setItem('admin_token', res.data.token); } catch (err) { setLoginError(err.response?.data?.error || 'Error al iniciar sesión'); } finally { setLoading(false); } };
  const handleLogout = () => { setToken(null); sessionStorage.removeItem('admin_token'); };

  const handleCrearServicio = async (e) => { e.preventDefault(); try { await api.post('/api/servicios', nuevoServicio, headers()); setNuevoServicio({ nombre: '', duracion_minutos: 30, precio_pesos: '' }); showMsg('Servicio creado'); loadServicios(); } catch (err) { showErr(err.response?.data?.error || 'Error'); } };
  const handleEditarServicio = async (e) => { e.preventDefault(); try { await api.patch(`/api/servicios/${editandoServicio.id}`, { nombre: editandoServicio.nombre, duracion_minutos: parseInt(editandoServicio.duracion_minutos), precio_pesos: parseFloat(editandoServicio.precio_pesos), intercalable: !!editandoServicio.intercalable, intercalar_desde_min: parseInt(editandoServicio.intercalar_desde_min) || 0, servicios_compatibles: Array.isArray(editandoServicio.servicios_compatibles) ? editandoServicio.servicios_compatibles.map(n => parseInt(n)) : [], max_simultaneos: parseInt(editandoServicio.max_simultaneos) || 2 }, headers()); setEditandoServicio(null); showMsg('Servicio actualizado'); loadServicios(); } catch (err) { showErr('Error al actualizar'); } };

  const handleCrearRango = async (e) => { e.preventDefault(); try { await api.post('/api/horarios', nuevoRango, headers()); showMsg(`Rango agregado a ${DIAS[nuevoRango.dia_semana]}`); loadHorarios(); } catch (err) { showErr('Error'); } };
  const handleEditarRango = async (id, campo, valor) => { try { await api.patch(`/api/horarios/${id}`, { [campo]: valor }, headers()); showMsg('Actualizado'); loadHorarios(); } catch (err) { showErr('Error'); } };
  const handleEliminarRango = async (id) => { if (!confirm('¿Eliminar?')) return; try { await api.delete(`/api/horarios/${id}`, headers()); showMsg('Eliminado'); loadHorarios(); } catch (err) { showErr('Error'); } };

  const handleCrearBloque = async (e) => { e.preventDefault(); try { await api.post('/api/horarios/bloques-cerrados', nuevoBloque, headers()); setNuevoBloque({ fecha: '', motivo: '' }); showMsg('Bloqueo agregado'); loadBloques(); } catch (err) { showErr('Error'); } };
  const handleEliminarBloque = async (id) => { try { await api.delete(`/api/horarios/bloques-cerrados/${id}`, headers()); showMsg('Eliminado'); loadBloques(); } catch (err) { showErr('Error'); } };

  const handleCrearTurnoManual = async (e) => { e.preventDefault(); try { await api.post('/api/admin/turnos', turnoManual, headers()); setTurnoManual({ nombre: '', apellido: '', telefono: '', servicio_id: '', fecha: '', hora_inicio: '' }); setMostrarFormTurno(false); showMsg('Turno creado'); loadTurnos(); } catch (err) { showErr(err.response?.data?.error || 'Error'); } };

  // Métricas
  const filtrarPorPeriodo = useCallback((items) => { const ahora = new Date(); return items.filter(t => { const fecha = new Date(t.fecha); if (periodoMetricas === 'semana') { const hace7 = new Date(ahora); hace7.setDate(hace7.getDate() - 7); return fecha >= hace7; } if (periodoMetricas === 'mes') { return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear(); } return true; }); }, [periodoMetricas]);
  const turnosFiltrados = filtrarPorPeriodo(turnos);
  const confirmadosFiltrados = turnosFiltrados.filter(t => t.estado === 'confirmado');
  const canceladosFiltrados = turnosFiltrados.filter(t => t.estado === 'cancelado');
  const tasaCancelacion = turnosFiltrados.length > 0 ? ((canceladosFiltrados.length / turnosFiltrados.length) * 100).toFixed(1) : 0;
  const ingresoEstimado = confirmadosFiltrados.reduce((sum, t) => { const s = servicios.find(s => s.id === t.servicio_id); return sum + (s ? parseFloat(s.precio_pesos) : 0); }, 0);
  const servicioCount = {}; confirmadosFiltrados.forEach(t => { const s = servicios.find(s => s.id === t.servicio_id); servicioCount[s ? s.nombre : '?'] = (servicioCount[s ? s.nombre : '?'] || 0) + 1; });
  const topServicios = Object.entries(servicioCount).sort((a, b) => b[1] - a[1]).slice(0, 5); const maxServicio = topServicios[0]?.[1] || 1;
  const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; const turnosPorDia = Array(7).fill(0); confirmadosFiltrados.forEach(t => { turnosPorDia[new Date(t.fecha).getDay()]++; }); const maxDia = Math.max(...turnosPorDia, 1);
  const turnosPorHora = {}; confirmadosFiltrados.forEach(t => { const h = t.hora_inicio.split(':')[0]; turnosPorHora[h] = (turnosPorHora[h] || 0) + 1; }); const horasOrdenadas = Object.entries(turnosPorHora).sort((a, b) => b[1] - a[1]).slice(0, 5); const maxHora = horasOrdenadas[0]?.[1] || 1;
  const clienteMapM = {}; confirmadosFiltrados.forEach(t => { const k = t.cliente_telefono; if (!clienteMapM[k]) clienteMapM[k] = { nombre: `${t.cliente_nombre} ${t.cliente_apellido}`, telefono: k, visitas: 0 }; clienteMapM[k].visitas++; }); const topClientesM = Object.values(clienteMapM).sort((a, b) => b.visitas - a.visitas).slice(0, 5);

  // Clientes
  const clientesFiltrados = clientes.filter(c => { if (!busquedaCliente) return true; const q = busquedaCliente.toLowerCase(); return c.nombre.toLowerCase().includes(q) || c.apellido.toLowerCase().includes(q) || c.telefono.includes(q); }).sort((a, b) => { if (ordenClientes === 'frecuencia') return b.totalConfirmados - a.totalConfirmados; if (ordenClientes === 'reciente') return new Date(b.ultimaVisita) - new Date(a.ultimaVisita); if (ordenClientes === 'gasto') return b.gastoTotal - a.gastoTotal; return 0; });

  // Waitlist agrupado por fecha
  const waitlistPorFecha = {};
  waitlistEntries.forEach(w => {
    const fechaKey = w.fecha.split('T')[0];
    if (!waitlistPorFecha[fechaKey]) waitlistPorFecha[fechaKey] = [];
    waitlistPorFecha[fechaKey].push(w);
  });

  // LOGIN
  if (!token) { return ( <div className="max-w-sm mx-auto mt-16"><div className="text-center mb-8"><span className="text-4xl">🔐</span><h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#8B6F5E] mt-3">Admin</h2></div><form onSubmit={handleLogin} className="card animate-fade-up">{loginError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{loginError}</div>}<div className="space-y-4"><div><label className="text-sm text-[#A89585] mb-1 block">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required /></div><div><label className="text-sm text-[#A89585] mb-1 block">Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required /></div><button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Entrando...' : 'Entrar'}</button></div></form></div> ); }

  const turnosProximos = turnos.filter(t => new Date(t.fecha) >= new Date() && t.estado === 'confirmado').sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
  const turnosHoy = turnos.filter(t => { const hoy = format(new Date(), 'yyyy-MM-dd'); return t.fecha.split('T')[0] === hoy && t.estado === 'confirmado'; });
  const horariosPorDia2 = {}; DIAS.forEach((_, idx) => { horariosPorDia2[idx] = horarios.filter(h => h.dia_semana === idx); });

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

      <div className="flex gap-1 bg-[#F5F0EB] rounded-lg p-1 mb-6 flex-wrap">
        {[{id:'turnos',label:'📋 Turnos'},{id:'servicios',label:'💅 Servicios'},{id:'horarios',label:'🕐 Horarios'},{id:'bloques',label:'🚫 Bloqueos'},{id:'metricas',label:'📊 Métricas'},{id:'clientes',label:'👤 Clientes'},{id:'waitlist',label:'🔔 Waitlist'}].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setClienteSeleccionado(null); setFichaCliente(null); }}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === t.id ? 'bg-white text-[#8B6F5E] shadow-sm' : 'text-[#A89585]'}`}>{t.label}</button>
        ))}
      </div>

      {/* TURNOS */}
      {tab === 'turnos' && (<div className="animate-fade-up">
        <div className="mb-6"><button onClick={() => setMostrarFormTurno(!mostrarFormTurno)} className={`btn-primary ${mostrarFormTurno ? 'opacity-70' : ''}`}>{mostrarFormTurno ? '✕ Cancelar' : '➕ Agregar turno manual'}</button></div>
        {mostrarFormTurno && (<div className="card mb-6"><h3 className="font-semibold mb-4 text-[#8B6F5E]">Nuevo turno manual</h3><form onSubmit={handleCrearTurnoManual} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="text-xs text-[#A89585] mb-1 block">Nombre</label><input type="text" value={turnoManual.nombre} onChange={e => setTurnoManual({...turnoManual, nombre: e.target.value})} className="input-field" required /></div><div><label className="text-xs text-[#A89585] mb-1 block">Apellido</label><input type="text" value={turnoManual.apellido} onChange={e => setTurnoManual({...turnoManual, apellido: e.target.value})} className="input-field" required /></div><div><label className="text-xs text-[#A89585] mb-1 block">Teléfono</label><input type="tel" value={turnoManual.telefono} onChange={e => setTurnoManual({...turnoManual, telefono: e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="1123456789" className="input-field" maxLength={10} required /></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="text-xs text-[#A89585] mb-1 block">Servicio</label><select value={turnoManual.servicio_id} onChange={e => setTurnoManual({...turnoManual, servicio_id: e.target.value, hora_inicio: ''})} className="input-field" required><option value="">Seleccionar...</option>{servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.duracion_minutos}min - ${s.precio_pesos})</option>)}</select></div><div><label className="text-xs text-[#A89585] mb-1 block">Fecha</label><input type="date" value={turnoManual.fecha} onChange={e => setTurnoManual({...turnoManual, fecha: e.target.value, hora_inicio: ''})} className="input-field" required /></div><div><label className="text-xs text-[#A89585] mb-1 block">Hora</label><select value={turnoManual.hora_inicio} onChange={e => setTurnoManual({...turnoManual, hora_inicio: e.target.value})} className="input-field" required><option value="">Seleccionar...</option>{horariosDisponibles.map(h => <option key={h.hora_inicio} value={h.hora_inicio}>{h.hora_inicio} - {h.hora_fin}</option>)}</select>{turnoManual.fecha && turnoManual.servicio_id && horariosDisponibles.length === 0 && <p className="text-xs text-[#C47070] mt-1">Sin horarios</p>}</div></div><button type="submit" disabled={!turnoManual.hora_inicio} className="btn-primary">Crear turno</button></form></div>)}
        {turnosProximos.length === 0 ? <p className="text-center text-[#A89585] py-8">No hay turnos próximos</p> : (<div className="space-y-3">{turnosProximos.map(turno => (<div key={turno.id} className="card flex items-center justify-between"><div><p className="font-semibold">{turno.cliente_nombre} {turno.cliente_apellido}</p><p className="text-sm text-[#8B6F5E]">{format(new Date(turno.fecha), "EEE d MMM", {locale: es})} · {turno.hora_inicio} hs</p><p className="text-xs text-[#A89585]">{turno.servicio?.nombre}</p></div><div className="text-right"><p className="text-xs text-[#A89585]">{turno.cliente_telefono}</p><div className="flex gap-2 mt-1"><span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5E8] text-[#6B8F6B]">confirmado</span>{turno.origen === 'manual' && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#A89585]">manual</span>}</div></div></div>))}</div>)}
      </div>)}

{/* SERVICIOS */}
      {tab === 'servicios' && (<div className="animate-fade-up">
        <div className="card mb-6">
          <h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Nuevo servicio</h3>
          <form onSubmit={handleCrearServicio} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div><label className="text-xs text-[#A89585] mb-1 block">Nombre</label><input type="text" value={nuevoServicio.nombre} onChange={e => setNuevoServicio({...nuevoServicio, nombre: e.target.value})} placeholder="Ej: Manicura gel" className="input-field" required /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Duración (min)</label><input type="number" value={nuevoServicio.duracion_minutos} onChange={e => setNuevoServicio({...nuevoServicio, duracion_minutos: parseInt(e.target.value)||0})} min="15" step="15" className="input-field" required /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Precio ($)</label><input type="number" value={nuevoServicio.precio_pesos} onChange={e => setNuevoServicio({...nuevoServicio, precio_pesos: e.target.value})} placeholder="500" className="input-field" required /></div>
              <div className="flex items-end"><button type="submit" className="btn-primary w-full">Crear</button></div>
            </div>
            <div className="border-t border-[#F5F0EB] pt-4">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" checked={nuevoServicio.intercalable} onChange={e => setNuevoServicio({...nuevoServicio, intercalable: e.target.checked})} className="w-4 h-4 accent-[#8B6F5E]" />
                <span className="text-sm font-medium text-[#8B6F5E]">Permitir intercalar con otros servicios</span>
              </label>
              {nuevoServicio.intercalable && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                  <div><label className="text-xs text-[#A89585] mb-1 block">Intercalar desde el minuto</label><input type="number" value={nuevoServicio.intercalar_desde_min} onChange={e => setNuevoServicio({...nuevoServicio, intercalar_desde_min: parseInt(e.target.value)||0})} min="0" step="5" className="input-field" /></div>
                  <div><label className="text-xs text-[#A89585] mb-1 block">Máximo simultáneos</label><input type="number" value={nuevoServicio.max_simultaneos} onChange={e => setNuevoServicio({...nuevoServicio, max_simultaneos: parseInt(e.target.value)||1})} min="1" step="1" className="input-field" /></div>
                  {servicios.length > 0 && (
                    <div className="sm:col-span-2">
                      <label className="text-xs text-[#A89585] mb-2 block">Servicios compatibles</label>
                      <div className="flex flex-wrap gap-2">
                        {servicios.map(sc => {
                          const checked = nuevoServicio.servicios_compatibles.includes(sc.id);
                          return (
                            <label key={sc.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer border ${checked ? 'bg-[#8B6F5E] text-white border-[#8B6F5E]' : 'bg-white text-[#8B6F5E] border-[#E8DDD3]'}`}>
                              <input type="checkbox" checked={checked} onChange={e => { const next = e.target.checked ? [...nuevoServicio.servicios_compatibles, sc.id] : nuevoServicio.servicios_compatibles.filter(id => id !== sc.id); setNuevoServicio({...nuevoServicio, servicios_compatibles: next}); }} className="hidden" />
                              {sc.nombre}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="space-y-3">{servicios.map(s => (
          <div key={s.id} className="card">{editandoServicio?.id === s.id ? (
            <form onSubmit={handleEditarServicio} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div><label className="text-xs text-[#A89585] mb-1 block">Nombre</label><input type="text" value={editandoServicio.nombre} onChange={e => setEditandoServicio({...editandoServicio, nombre: e.target.value})} className="input-field" /></div>
                <div><label className="text-xs text-[#A89585] mb-1 block">Duración</label><input type="number" value={editandoServicio.duracion_minutos} onChange={e => setEditandoServicio({...editandoServicio, duracion_minutos: e.target.value})} className="input-field" /></div>
                <div><label className="text-xs text-[#A89585] mb-1 block">Precio</label><input type="number" value={editandoServicio.precio_pesos} onChange={e => setEditandoServicio({...editandoServicio, precio_pesos: e.target.value})} className="input-field" /></div>
                <div className="flex gap-2"><button type="submit" className="btn-primary flex-1">Guardar</button><button type="button" onClick={() => setEditandoServicio(null)} className="px-3 py-2 border border-[#E8DDD3] rounded-lg text-sm cursor-pointer">✕</button></div>
              </div>
              <div className="border-t border-[#F5F0EB] pt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={!!editandoServicio.intercalable} onChange={e => setEditandoServicio({...editandoServicio, intercalable: e.target.checked})} className="w-4 h-4 accent-[#8B6F5E]" />
                  <span className="text-sm font-medium text-[#8B6F5E]">Permitir intercalar con otros servicios</span>
                </label>
                {editandoServicio.intercalable && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                    <div><label className="text-xs text-[#A89585] mb-1 block">Intercalar desde el minuto</label><input type="number" value={editandoServicio.intercalar_desde_min ?? 0} onChange={e => setEditandoServicio({...editandoServicio, intercalar_desde_min: parseInt(e.target.value)||0})} min="0" step="5" className="input-field" /></div>
                    <div><label className="text-xs text-[#A89585] mb-1 block">Máximo simultáneos</label><input type="number" value={editandoServicio.max_simultaneos ?? 2} onChange={e => setEditandoServicio({...editandoServicio, max_simultaneos: parseInt(e.target.value)||1})} min="1" step="1" className="input-field" /></div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-[#A89585] mb-2 block">Servicios compatibles</label>
                      <div className="flex flex-wrap gap-2">
                        {servicios.filter(sc => sc.id !== editandoServicio.id).map(sc => {
                          const actuales = Array.isArray(editandoServicio.servicios_compatibles) ? editandoServicio.servicios_compatibles : [];
                          const checked = actuales.includes(sc.id);
                          return (
                            <label key={sc.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer border ${checked ? 'bg-[#8B6F5E] text-white border-[#8B6F5E]' : 'bg-white text-[#8B6F5E] border-[#E8DDD3]'}`}>
                              <input type="checkbox" checked={checked} onChange={e => { const next = e.target.checked ? [...actuales, sc.id] : actuales.filter(id => id !== sc.id); setEditandoServicio({...editandoServicio, servicios_compatibles: next}); }} className="hidden" />
                              {sc.nombre}
                            </label>
                          );
                        })}
                        {servicios.filter(sc => sc.id !== editandoServicio.id).length === 0 && <p className="text-xs text-[#A89585]">No hay otros servicios para seleccionar</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{s.nombre}</p>
                <p className="text-sm text-[#A89585]">{s.duracion_minutos} min</p>
                {s.intercalable && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">🔀 Intercalable desde min {s.intercalar_desde_min ?? 0}</span>
                    {Array.isArray(s.servicios_compatibles) && s.servicios_compatibles.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">
                        Con: {s.servicios_compatibles.map(id => servicios.find(x => x.id === id)?.nombre).filter(Boolean).join(', ')}
                      </span>
                    )}
                    {s.max_simultaneos > 1 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">Máx {s.max_simultaneos} a la vez</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <p className="text-lg font-bold text-[#8B6F5E]">${s.precio_pesos}</p>
                <button onClick={() => setEditandoServicio({...s, servicios_compatibles: Array.isArray(s.servicios_compatibles) ? [...s.servicios_compatibles] : [], intercalar_desde_min: s.intercalar_desde_min ?? 0, max_simultaneos: s.max_simultaneos ?? 2, intercalable: !!s.intercalable})} className="text-sm text-[#8B6F5E] hover:underline cursor-pointer">Editar</button>
                <button onClick={() => handleDesactivarServicio(s.id)} className="text-sm text-[#C47070] hover:underline cursor-pointer">Desactivar</button>
              </div>
            </div>
          )}</div>
        ))}</div>
      </div>)}

      {/* HORARIOS */}
      {tab === 'horarios' && (<div className="animate-fade-up"><p className="text-sm text-[#A89585] mb-4">Configurá múltiples rangos horarios por día.</p><div className="card mb-6"><h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Agregar rango horario</h3><form onSubmit={handleCrearRango} className="grid grid-cols-2 sm:grid-cols-5 gap-3"><div><label className="text-xs text-[#A89585] mb-1 block">Día</label><select value={nuevoRango.dia_semana} onChange={e => setNuevoRango({...nuevoRango, dia_semana: parseInt(e.target.value)})} className="input-field">{DIAS.map((d,i) => <option key={i} value={i}>{d}</option>)}</select></div><div><label className="text-xs text-[#A89585] mb-1 block">Desde</label><input type="time" value={nuevoRango.hora_inicio} onChange={e => setNuevoRango({...nuevoRango, hora_inicio: e.target.value})} className="input-field" required /></div><div><label className="text-xs text-[#A89585] mb-1 block">Hasta</label><input type="time" value={nuevoRango.hora_fin} onChange={e => setNuevoRango({...nuevoRango, hora_fin: e.target.value})} className="input-field" required /></div><div><label className="text-xs text-[#A89585] mb-1 block">Espacio (min)</label><input type="number" value={nuevoRango.espacio_entre_turnos_min} onChange={e => setNuevoRango({...nuevoRango, espacio_entre_turnos_min: parseInt(e.target.value)||0})} min="0" step="5" className="input-field" /></div><div className="flex items-end"><button type="submit" className="btn-primary w-full">Agregar</button></div></form></div><div className="space-y-4">{DIAS.map((dia, idx) => { const rangos = horariosPorDia2[idx] || []; return (<div key={idx} className="card"><div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-[#2D2A26]">{dia}</h4>{rangos.length === 0 && <span className="text-sm text-[#C47070]">Cerrado</span>}</div>{rangos.length > 0 && (<div className="space-y-2">{rangos.map(r => (<div key={r.id} className="flex items-center gap-3 bg-[#F5F0EB] rounded-lg p-3"><input type="time" value={r.hora_inicio} onChange={e => handleEditarRango(r.id,'hora_inicio',e.target.value)} className="input-field w-28" /><span className="text-[#A89585]">a</span><input type="time" value={r.hora_fin} onChange={e => handleEditarRango(r.id,'hora_fin',e.target.value)} className="input-field w-28" /><span className="text-xs text-[#A89585] hidden sm:inline">espacio:</span><input type="number" value={r.espacio_entre_turnos_min} onChange={e => handleEditarRango(r.id,'espacio_entre_turnos_min',parseInt(e.target.value)||0)} className="input-field w-16" min="0" /><span className="text-xs text-[#A89585] hidden sm:inline">min</span><button onClick={() => handleEliminarRango(r.id)} className="text-[#C47070] hover:text-red-700 text-sm cursor-pointer ml-auto">✕</button></div>))}</div>)}</div>); })}</div></div>)}

      {/* BLOQUEOS */}
      {tab === 'bloques' && (<div className="animate-fade-up"><p className="text-sm text-[#A89585] mb-4">Bloqueá días específicos (feriados, vacaciones, etc.)</p><div className="card mb-6"><h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Nuevo bloqueo</h3><form onSubmit={handleCrearBloque} className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="text-xs text-[#A89585] mb-1 block">Fecha</label><input type="date" value={nuevoBloque.fecha} onChange={e => setNuevoBloque({...nuevoBloque, fecha: e.target.value})} className="input-field" required /></div><div><label className="text-xs text-[#A89585] mb-1 block">Motivo</label><input type="text" value={nuevoBloque.motivo} onChange={e => setNuevoBloque({...nuevoBloque, motivo: e.target.value})} placeholder="Ej: Feriado" className="input-field" /></div><div className="flex items-end"><button type="submit" className="btn-primary w-full">Bloquear</button></div></form></div>{bloques.length === 0 ? <p className="text-center text-[#A89585] py-8">No hay días bloqueados</p> : (<div className="space-y-3">{bloques.map(b => (<div key={b.id} className="card flex items-center justify-between"><div><p className="font-semibold">{format(new Date(b.fecha), "EEEE d 'de' MMMM yyyy", {locale: es})}</p>{b.motivo && <p className="text-sm text-[#A89585]">{b.motivo}</p>}</div><button onClick={() => handleEliminarBloque(b.id)} className="text-sm text-[#C47070] hover:underline cursor-pointer">Eliminar</button></div>))}</div>)}</div>)}

      {/* MÉTRICAS */}
      {tab === 'metricas' && (<div className="animate-fade-up"><div className="flex items-center justify-between mb-6"><p className="text-sm text-[#A89585]">Estadísticas del negocio</p><div className="flex gap-1 bg-[#F5F0EB] rounded-lg p-1">{[{key:'semana',label:'7 días'},{key:'mes',label:'Este mes'},{key:'todo',label:'Todo'}].map(p => (<button key={p.key} onClick={() => setPeriodoMetricas(p.key)} className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${periodoMetricas === p.key ? 'bg-white text-[#8B6F5E] shadow-sm' : 'text-[#A89585]'}`}>{p.label}</button>))}</div></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"><div className="card text-center"><p className="text-2xl font-bold text-[#8B6F5E]">{confirmadosFiltrados.length}</p><p className="text-xs text-[#A89585]">Confirmados</p><p className="text-xs text-[#C47070] mt-1">{canceladosFiltrados.length} cancelados</p></div><div className="card text-center"><p className="text-2xl font-bold text-[#6B8F6B]">${ingresoEstimado.toLocaleString('es-AR')}</p><p className="text-xs text-[#A89585]">Ingreso est.</p></div><div className="card text-center"><p className={`text-2xl font-bold ${parseFloat(tasaCancelacion) > 20 ? 'text-[#C47070]' : 'text-[#D4A843]'}`}>{tasaCancelacion}%</p><p className="text-xs text-[#A89585]">Cancel.</p></div><div className="card text-center"><p className="text-2xl font-bold text-[#8B6F5E]">{Object.keys(clienteMapM).length}</p><p className="text-xs text-[#A89585]">Clientes</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"><div className="card"><h3 className="font-semibold mb-4 text-[#8B6F5E]">💅 Servicios top</h3>{topServicios.length === 0 ? <p className="text-sm text-[#A89585]">Sin datos</p> : <div className="space-y-3">{topServicios.map(([n,c]) => (<div key={n}><div className="flex justify-between text-sm mb-1"><span>{n}</span><span className="text-[#A89585]">{c}</span></div><div className="h-2 bg-[#F5F0EB] rounded-full overflow-hidden"><div className="h-full bg-[#8B6F5E] rounded-full" style={{width:`${(c/maxServicio)*100}%`}}/></div></div>))}</div>}</div><div className="card"><h3 className="font-semibold mb-4 text-[#8B6F5E]">📅 Por día</h3><div className="flex items-end gap-2 h-32">{turnosPorDia.map((c,i) => (<div key={i} className="flex-1 text-center"><div className="mx-auto rounded-t" style={{height:`${(c/maxDia)*100}px`,minHeight:c>0?8:2,backgroundColor:c>0?'#8B6F5E':'#E8DDD3',width:'100%',maxWidth:32}}/><p className="text-xs text-[#A89585] mt-1">{diasNombres[i]}</p>{c>0&&<p className="text-xs font-semibold text-[#8B6F5E]">{c}</p>}</div>))}</div></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="card"><h3 className="font-semibold mb-4 text-[#8B6F5E]">🕐 Horas pico</h3>{horasOrdenadas.length===0?<p className="text-sm text-[#A89585]">Sin datos</p>:<div className="space-y-3">{horasOrdenadas.map(([h,c]) => (<div key={h}><div className="flex justify-between text-sm mb-1"><span>{h}:00</span><span className="text-[#A89585]">{c}</span></div><div className="h-2 bg-[#F5F0EB] rounded-full overflow-hidden"><div className="h-full bg-[#6B8F6B] rounded-full" style={{width:`${(c/maxHora)*100}%`}}/></div></div>))}</div>}</div><div className="card"><h3 className="font-semibold mb-4 text-[#8B6F5E]">⭐ Top clientes</h3>{topClientesM.length===0?<p className="text-sm text-[#A89585]">Sin datos</p>:<div className="space-y-3">{topClientesM.map((c,i) => (<div key={c.telefono} className={`flex items-center justify-between py-2 ${i<topClientesM.length-1?'border-b border-[#F5F0EB]':''}`}><div><p className="text-sm font-medium">{c.nombre}</p><p className="text-xs text-[#A89585]">{c.telefono}</p></div><span className="text-xs px-2 py-1 rounded-full bg-[#F5F0EB] text-[#8B6F5E] font-semibold">{c.visitas} visitas</span></div>))}</div>}</div></div>
      </div>)}

      {/* CLIENTES */}
      {tab === 'clientes' && (<div className="animate-fade-up">
        {clienteSeleccionado && fichaCliente ? (<div>
          <button onClick={() => {setClienteSeleccionado(null);setFichaCliente(null);}} className="text-sm text-[#8B6F5E] hover:underline cursor-pointer mb-4 inline-block">← Volver</button>
          <div className="card mb-4"><div className="flex items-center justify-between"><div><h3 className="text-xl font-semibold text-[#2D2A26]">{fichaCliente.turnos[0]?.cliente_nombre} {fichaCliente.turnos[0]?.cliente_apellido}</h3><p className="text-sm text-[#A89585]">📱 {clienteSeleccionado}</p></div><div className="text-right"><p className="text-2xl font-bold text-[#8B6F5E]">{fichaCliente.turnos.filter(t=>t.estado==='confirmado').length}</p><p className="text-xs text-[#A89585]">visitas</p></div></div><div className="grid grid-cols-3 gap-3 mt-4"><div className="bg-[#F5F0EB] rounded-lg p-3 text-center"><p className="text-sm font-bold text-[#6B8F6B]">${fichaCliente.turnos.filter(t=>t.estado==='confirmado').reduce((s,t) => s+(t.servicio?parseFloat(t.servicio.precio_pesos):0),0).toLocaleString('es-AR')}</p><p className="text-xs text-[#A89585]">Gasto total</p></div><div className="bg-[#F5F0EB] rounded-lg p-3 text-center"><p className="text-sm font-bold text-[#8B6F5E]">{format(new Date(fichaCliente.turnos[fichaCliente.turnos.length-1]?.fecha),"d/M/yy")}</p><p className="text-xs text-[#A89585]">Primera</p></div><div className="bg-[#F5F0EB] rounded-lg p-3 text-center"><p className="text-sm font-bold text-[#8B6F5E]">{format(new Date(fichaCliente.turnos[0]?.fecha),"d/M/yy")}</p><p className="text-xs text-[#A89585]">Última</p></div></div></div>
          <div className="card mb-4"><h4 className="font-semibold text-[#8B6F5E] mb-3">📝 Notas</h4><div className="flex gap-2 mb-3"><input type="text" value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleAgregarNota()} placeholder="Ej: Prefiere semipermanente..." className="input-field flex-1" /><button onClick={handleAgregarNota} disabled={!nuevaNota.trim()} className="btn-primary">Agregar</button></div>{fichaCliente.notas.length===0?<p className="text-sm text-[#A89585]">Sin notas</p>:<div className="space-y-2">{fichaCliente.notas.map(nota => (<div key={nota.id} className="flex items-start justify-between bg-[#FFFBF0] border border-[#F5EDD6] rounded-lg p-3"><div><p className="text-sm">{nota.texto}</p><p className="text-xs text-[#A89585] mt-1">{format(new Date(nota.created_at),"d MMM yyyy, HH:mm",{locale:es})}</p></div><button onClick={() => handleEliminarNota(nota.id)} className="text-xs text-[#C47070] hover:underline cursor-pointer ml-2">✕</button></div>))}</div>}</div>
          <div className="card"><h4 className="font-semibold text-[#8B6F5E] mb-3">📋 Historial</h4><div className="space-y-2">{fichaCliente.turnos.map(t => (<div key={t.id} className="flex items-center justify-between py-2 border-b border-[#F5F0EB] last:border-0"><div><p className="text-sm font-medium">{format(new Date(t.fecha),"EEE d MMM yyyy",{locale:es})} · {t.hora_inicio} hs</p><p className="text-xs text-[#A89585]">{t.servicio?.nombre}</p></div><span className={`text-xs px-2 py-0.5 rounded-full ${t.estado==='confirmado'?'bg-[#E8F5E8] text-[#6B8F6B]':'bg-red-50 text-[#C47070]'}`}>{t.estado}</span></div>))}</div></div>
        </div>) : (<div>
          <div className="flex flex-col sm:flex-row gap-3 mb-6"><input type="text" value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} placeholder="🔍 Buscar por nombre o teléfono..." className="input-field flex-1" /><select value={ordenClientes} onChange={e => setOrdenClientes(e.target.value)} className="input-field w-auto"><option value="frecuencia">Más frecuentes</option><option value="reciente">Más recientes</option><option value="gasto">Mayor gasto</option></select></div>
          {clientesFiltrados.length===0?<p className="text-center text-[#A89585] py-8">{busquedaCliente?'No se encontraron':'Sin clientes'}</p>:(<div className="space-y-3">{clientesFiltrados.map(c => (<div key={c.telefono} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadFichaCliente(c.telefono)}><div className="flex items-center justify-between"><div><p className="font-semibold">{c.nombre} {c.apellido}</p><p className="text-xs text-[#A89585]">📱 {c.telefono}</p><div className="flex gap-2 mt-1"><span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">💅 {c.servicioFavorito}</span>{parseFloat(c.tasaCancelacion)>30&&<span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-[#C47070]">⚠️ {c.tasaCancelacion}%</span>}</div></div><div className="text-right"><p className="text-lg font-bold text-[#8B6F5E]">{c.totalConfirmados}</p><p className="text-xs text-[#A89585]">visitas</p><p className="text-xs text-[#6B8F6B] font-semibold">${c.gastoTotal.toLocaleString('es-AR')}</p></div></div></div>))}</div>)}
        </div>)}
      </div>)}

      {/* WAITLIST */}
      {tab === 'waitlist' && (<div className="animate-fade-up">
        <p className="text-sm text-[#A89585] mb-4">Personas esperando que se liberen turnos. Si desbloqueas un día, podés contactarlas.</p>

        {waitlistEntries.length === 0 ? (
          <p className="text-center text-[#A89585] py-8">No hay nadie en lista de espera</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(waitlistPorFecha).sort((a,b) => a[0].localeCompare(b[0])).map(([fecha, entries]) => (
              <div key={fecha}>
                <h3 className="font-semibold text-[#8B6F5E] mb-3">
                  📅 {format(new Date(fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                  <span className="text-xs font-normal text-[#A89585] ml-2">({entries.length} {entries.length === 1 ? 'persona' : 'personas'})</span>
                </h3>
                <div className="space-y-2">
                  {entries.map(w => (
                    <div key={w.id} className="card flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{w.cliente_nombre} {w.cliente_apellido}</p>
                        <p className="text-xs text-[#A89585]">📱 {w.cliente_telefono}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">
                            {w.franja === 'manana' ? '☀️ Mañana' : '🌙 Tarde'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">
                            💅 {w.servicio?.nombre}
                          </span>
                          {w.notificado && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5E8] text-[#6B8F6B]">
                              ✅ Notificado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`https://wa.me/549${w.cliente_telefono}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#25D366] text-white font-medium hover:opacity-90">
                          WhatsApp
                        </a>
                        <button onClick={() => handleEliminarWaitlist(w.id)}
                          className="text-xs text-[#C47070] hover:underline cursor-pointer">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>)}
    </div>
  );
}
