'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Convierte una fecha date-only ("2026-06-20" o "2026-06-20T00:00:00.000Z")
// en un Date anclado al MEDIODÍA local, para que nunca se corra de día por la zona horaria (UTC-3).
const fechaLocal = (f) => new Date(String(f).split('T')[0] + 'T12:00:00');

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
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: '', duracion_minutos: 30, precio_pesos: '', intercalable: false, intercalar_desde_min: 30, servicios_compatibles: [], max_simultaneos: 2 });
  const [editandoServicio, setEditandoServicio] = useState(null);
  const [nuevoBloque, setNuevoBloque] = useState({ fecha: '', motivo: '' });
  const [nuevoRango, setNuevoRango] = useState({ dia_semana: 0, hora_inicio: '09:00', hora_fin: '13:00', espacio_entre_turnos_min: 10 });
  const [mostrarFormTurno, setMostrarFormTurno] = useState(false);
  const [turnoManual, setTurnoManual] = useState({ nombre: '', apellido: '', telefono: '', servicio_id: '', fecha: '', hora_inicio: '', notificar: true });
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [editandoTurno, setEditandoTurno] = useState(null);
  const [horariosEditTurno, setHorariosEditTurno] = useState([]);
  // Calendario de turnos
  const [mesCalendario, setMesCalendario] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d; });
  const [diaSeleccionadoCal, setDiaSeleccionadoCal] = useState(null);
  const [periodoMetricas, setPeriodoMetricas] = useState('mes');
  const [clientes, setClientes] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [ordenClientes, setOrdenClientes] = useState('frecuencia');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [fichaCliente, setFichaCliente] = useState(null);
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [nuevaNota, setNuevaNota] = useState('');
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [extras, setExtras] = useState([]);
  const [nuevoExtra, setNuevoExtra] = useState({ nombre: '', descripcion: '', precio_pesos: '', minutos_adicionales: 0, servicios_ids: [], destacado: false, precio_variable: false });
  const [editandoExtra, setEditandoExtra] = useState(null);

  useEffect(() => { const saved = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null; if (saved) setToken(saved); }, []);
  useEffect(() => { if (token) loadAll(); }, [token]);
  useEffect(() => { if (!turnoManual.fecha || !turnoManual.servicio_id) { setHorariosDisponibles([]); return; } api.get(`/api/turnos/disponibilidad/${turnoManual.fecha}/${turnoManual.servicio_id}`).then(res => setHorariosDisponibles(res.data.horarios || [])).catch(() => setHorariosDisponibles([])); }, [turnoManual.fecha, turnoManual.servicio_id]);
  useEffect(() => { if (!editandoTurno?.fecha || !editandoTurno?.servicio_id) { setHorariosEditTurno([]); return; } api.get(`/api/turnos/disponibilidad/${editandoTurno.fecha}/${editandoTurno.servicio_id}`).then(res => setHorariosEditTurno(res.data.horarios || [])).catch(() => setHorariosEditTurno([])); }, [editandoTurno?.fecha, editandoTurno?.servicio_id]);
  useEffect(() => { if (tab === 'clientes' && token) loadClientes(); }, [tab, token]);
  useEffect(() => { if (tab === 'waitlist' && token) loadWaitlist(); }, [tab, token]);
  useEffect(() => { if (tab === 'extras' && token) { loadExtras(); loadServicios(); } }, [tab, token]);

  const headers = () => ({ headers: { Authorization: `Bearer ${token}` } });
  const loadAll = () => { loadTurnos(); loadServicios(); loadHorarios(); loadBloques(); };
  const loadTurnos = async () => { try { const res = await api.get('/api/admin/turnos', headers()); setTurnos(res.data); } catch (err) { if (err.response?.status === 401) handleLogout(); } };
  const loadServicios = async () => { try { const res = await api.get('/api/servicios'); setServicios(res.data); } catch (e) {} };
  const loadHorarios = async () => { try { const res = await api.get('/api/horarios'); setHorarios(res.data); } catch (e) {} };
  const loadBloques = async () => { try { const res = await api.get('/api/horarios/bloques-cerrados'); setBloques(res.data); } catch (e) {} };
  const loadClientes = async () => { try { const res = await api.get('/api/admin/clientes', headers()); setClientes(res.data); } catch (e) {} };
  const loadWaitlist = async () => { try { const res = await api.get('/api/waitlist/admin', headers()); setWaitlistEntries(res.data); } catch (e) {} };
  const loadExtras = async () => { try { const res = await api.get('/api/extras', headers()); setExtras(res.data); } catch (e) {} };

  const loadFichaCliente = async (telefono) => { setLoadingFicha(true); try { const res = await api.get(`/api/admin/clientes/${telefono}`, headers()); setFichaCliente(res.data); setClienteSeleccionado(telefono); } catch (e) { showErr('Error cargando ficha'); } finally { setLoadingFicha(false); } };
  const handleAgregarNota = async () => { if (!nuevaNota.trim() || !clienteSeleccionado) return; try { await api.post(`/api/admin/clientes/${clienteSeleccionado}/notas`, { texto: nuevaNota }, headers()); setNuevaNota(''); loadFichaCliente(clienteSeleccionado); showMsg('Nota agregada'); } catch (e) { showErr('Error al agregar nota'); } };
  const handleEliminarNota = async (notaId) => { if (!confirm('¿Eliminar esta nota?')) return; try { await api.delete(`/api/admin/clientes/${clienteSeleccionado}/notas/${notaId}`, headers()); loadFichaCliente(clienteSeleccionado); showMsg('Nota eliminada'); } catch (e) { showErr('Error'); } };
  const handleCancelarTurno = async (turno) => {
    if (!confirm(`¿Cancelar el turno de ${turno.cliente_nombre} ${turno.cliente_apellido}?\n\nSe le enviará un WhatsApp avisándole.`)) return;
    try { await api.delete(`/api/admin/turnos/${turno.id}`, headers()); showMsg(`Turno de ${turno.cliente_nombre} cancelado`); loadTurnos(); } catch (err) { showErr(err.response?.data?.error || 'Error al cancelar'); }
  };
  const handleEliminarWaitlist = async (id) => { if (!confirm('¿Eliminar de la lista de espera?')) return; try { await api.delete(`/api/waitlist/${id}`, headers()); showMsg('Eliminado de waitlist'); loadWaitlist(); } catch (e) { showErr('Error'); } };

  const handleCrearExtra = async (e) => {
    e.preventDefault();
    if (!nuevoExtra.nombre || nuevoExtra.precio_pesos === '') { showErr('Completá nombre y precio'); return; }
    try {
      await api.post('/api/extras', { nombre: nuevoExtra.nombre, descripcion: nuevoExtra.descripcion, precio_pesos: parseFloat(nuevoExtra.precio_pesos), minutos_adicionales: parseInt(nuevoExtra.minutos_adicionales) || 0, servicios_ids: nuevoExtra.servicios_ids, destacado: !!nuevoExtra.destacado, precio_variable: !!nuevoExtra.precio_variable }, headers());
      setNuevoExtra({ nombre: '', descripcion: '', precio_pesos: '', minutos_adicionales: 0, servicios_ids: [], destacado: false, precio_variable: false });
      showMsg('Extra creado'); loadExtras();
    } catch (err) { showErr(err.response?.data?.error || 'Error al crear extra'); }
  };
  const handleEditarExtra = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/extras/${editandoExtra.id}`, { nombre: editandoExtra.nombre, descripcion: editandoExtra.descripcion, precio_pesos: parseFloat(editandoExtra.precio_pesos), minutos_adicionales: parseInt(editandoExtra.minutos_adicionales) || 0, servicios_ids: Array.isArray(editandoExtra.servicios_ids) ? editandoExtra.servicios_ids.map(n => parseInt(n)) : [], destacado: !!editandoExtra.destacado, precio_variable: !!editandoExtra.precio_variable }, headers());
      setEditandoExtra(null); showMsg('Extra actualizado'); loadExtras();
    } catch (err) { showErr('Error al actualizar'); }
  };
  const handleToggleDestacado = async (extra) => { try { await api.patch(`/api/extras/${extra.id}`, { destacado: !extra.destacado }, headers()); loadExtras(); } catch (e) { showErr('Error'); } };
  const handleDesactivarExtra = async (id) => { if (!confirm('¿Desactivar este extra? Ya no aparecerá para las clientas.')) return; try { await api.delete(`/api/extras/${id}`, headers()); showMsg('Extra desactivado'); loadExtras(); } catch (e) { showErr('Error'); } };
  const handleActivarExtra = async (id) => { try { await api.patch(`/api/extras/${id}`, { activo: true }, headers()); showMsg('Extra activado'); loadExtras(); } catch (e) { showErr('Error'); } };

  const showMsg = (msg) => { setMensaje(msg); setError(''); setTimeout(() => setMensaje(''), 3000); };
  const showErr = (msg) => { setError(msg); setMensaje(''); setTimeout(() => setError(''), 5000); };

  const handleLogin = async (e) => { e.preventDefault(); setLoginError(''); setLoading(true); try { const res = await api.post('/api/admin/login', { email, password }); setToken(res.data.token); sessionStorage.setItem('admin_token', res.data.token); } catch (err) { setLoginError(err.response?.data?.error || 'Error al iniciar sesión'); } finally { setLoading(false); } };
  const handleLogout = () => { setToken(null); sessionStorage.removeItem('admin_token'); };

  const handleCrearServicio = async (e) => { e.preventDefault(); try { await api.post('/api/servicios', nuevoServicio, headers()); setNuevoServicio({ nombre: '', duracion_minutos: 30, precio_pesos: '' }); showMsg('Servicio creado'); loadServicios(); } catch (err) { showErr(err.response?.data?.error || 'Error'); } };
  const handleDesactivarServicio = async (id) => { if (!confirm('¿Desactivar este servicio? Ya no aparecerá para reservas.')) return; try { await api.patch(`/api/servicios/${id}`, { activo: false }, headers()); showMsg('Servicio desactivado'); loadServicios(); } catch (err) { showErr('Error al desactivar'); } };
  const handleEditarServicio = async (e) => { e.preventDefault(); try { await api.patch(`/api/servicios/${editandoServicio.id}`, { nombre: editandoServicio.nombre, duracion_minutos: parseInt(editandoServicio.duracion_minutos), precio_pesos: parseFloat(editandoServicio.precio_pesos), intercalable: !!editandoServicio.intercalable, intercalar_desde_min: parseInt(editandoServicio.intercalar_desde_min) || 0, servicios_compatibles: Array.isArray(editandoServicio.servicios_compatibles) ? editandoServicio.servicios_compatibles.map(n => parseInt(n)) : [], max_simultaneos: parseInt(editandoServicio.max_simultaneos) || 2 }, headers()); setEditandoServicio(null); showMsg('Servicio actualizado'); loadServicios(); } catch (err) { showErr('Error al actualizar'); } };

  const handleCrearRango = async (e) => { e.preventDefault(); try { await api.post('/api/horarios', nuevoRango, headers()); showMsg(`Rango agregado a ${DIAS[nuevoRango.dia_semana]}`); loadHorarios(); } catch (err) { showErr('Error'); } };
  const handleEditarRango = async (id, campo, valor) => { try { await api.patch(`/api/horarios/${id}`, { [campo]: valor }, headers()); showMsg('Actualizado'); loadHorarios(); } catch (err) { showErr('Error'); } };
  const handleEliminarRango = async (id) => { if (!confirm('¿Eliminar?')) return; try { await api.delete(`/api/horarios/${id}`, headers()); showMsg('Eliminado'); loadHorarios(); } catch (err) { showErr('Error'); } };

  const handleCrearBloque = async (e) => { e.preventDefault(); try { await api.post('/api/horarios/bloques-cerrados', nuevoBloque, headers()); setNuevoBloque({ fecha: '', motivo: '' }); showMsg('Bloqueo agregado'); loadBloques(); } catch (err) { showErr('Error'); } };
  const handleEliminarBloque = async (id) => { try { await api.delete(`/api/horarios/bloques-cerrados/${id}`, headers()); showMsg('Eliminado'); loadBloques(); } catch (err) { showErr('Error'); } };

  const handleCrearTurnoManual = async (e) => { e.preventDefault(); try { const res = await api.post('/api/admin/turnos', turnoManual, headers()); setTurnoManual({ nombre: '', apellido: '', telefono: '', servicio_id: '', fecha: '', hora_inicio: '', notificar: true }); setMostrarFormTurno(false); showMsg(res.data.notificado === false ? 'Turno creado (sin avisar por WhatsApp)' : 'Turno creado'); loadTurnos(); } catch (err) { showErr(err.response?.data?.error || 'Error'); } };

  const handleAbrirEdicion = (turno) => {
    const fechaStr = turno.fecha.split('T')[0];
    setEditandoTurno({ id: turno.id, nombre: turno.cliente_nombre, apellido: turno.cliente_apellido, telefono: turno.cliente_telefono, servicio_id: String(turno.servicio_id), fecha: fechaStr, hora_inicio: turno.hora_inicio, _origFecha: fechaStr, _origServicio: String(turno.servicio_id), _origHora: turno.hora_inicio });
  };
  const handleEditarTurno = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/admin/turnos/${editandoTurno.id}`, { nombre: editandoTurno.nombre, apellido: editandoTurno.apellido, telefono: editandoTurno.telefono, servicio_id: editandoTurno.servicio_id, fecha: editandoTurno.fecha, hora_inicio: editandoTurno.hora_inicio }, headers());
      setEditandoTurno(null); showMsg('Turno actualizado'); loadTurnos();
    } catch (err) { showErr(err.response?.data?.error || 'Error al actualizar'); }
  };

  const filtrarPorPeriodo = useCallback((items) => { const ahora = new Date(); return items.filter(t => { const fecha = fechaLocal(t.fecha); if (periodoMetricas === 'semana') { const hace7 = new Date(ahora); hace7.setDate(hace7.getDate() - 7); return fecha >= hace7; } if (periodoMetricas === 'mes') { return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear(); } return true; }); }, [periodoMetricas]);
  const turnosFiltrados = filtrarPorPeriodo(turnos);
  const confirmadosFiltrados = turnosFiltrados.filter(t => t.estado === 'confirmado');
  const canceladosFiltrados = turnosFiltrados.filter(t => t.estado === 'cancelado');
  const tasaCancelacion = turnosFiltrados.length > 0 ? ((canceladosFiltrados.length / turnosFiltrados.length) * 100).toFixed(1) : 0;
  const ingresoEstimado = confirmadosFiltrados.reduce((sum, t) => { const s = servicios.find(s => s.id === t.servicio_id); return sum + (s ? parseFloat(s.precio_pesos) : 0); }, 0);
  const servicioCount = {}; confirmadosFiltrados.forEach(t => { const s = servicios.find(s => s.id === t.servicio_id); servicioCount[s ? s.nombre : '?'] = (servicioCount[s ? s.nombre : '?'] || 0) + 1; });
  const topServicios = Object.entries(servicioCount).sort((a, b) => b[1] - a[1]).slice(0, 5); const maxServicio = topServicios[0]?.[1] || 1;
  const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; const turnosPorDia = Array(7).fill(0); confirmadosFiltrados.forEach(t => { turnosPorDia[fechaLocal(t.fecha).getDay()]++; }); const maxDia = Math.max(...turnosPorDia, 1);
  const turnosPorHora = {}; confirmadosFiltrados.forEach(t => { const h = t.hora_inicio.split(':')[0]; turnosPorHora[h] = (turnosPorHora[h] || 0) + 1; }); const horasOrdenadas = Object.entries(turnosPorHora).sort((a, b) => b[1] - a[1]).slice(0, 5); const maxHora = horasOrdenadas[0]?.[1] || 1;
  const clienteMapM = {}; confirmadosFiltrados.forEach(t => { const k = t.cliente_telefono; if (!clienteMapM[k]) clienteMapM[k] = { nombre: `${t.cliente_nombre} ${t.cliente_apellido}`, telefono: k, visitas: 0 }; clienteMapM[k].visitas++; }); const topClientesM = Object.values(clienteMapM).sort((a, b) => b.visitas - a.visitas).slice(0, 5);

  const clientesFiltrados = clientes.filter(c => { if (!busquedaCliente) return true; const q = busquedaCliente.toLowerCase(); return c.nombre.toLowerCase().includes(q) || c.apellido.toLowerCase().includes(q) || c.telefono.includes(q); }).sort((a, b) => { if (ordenClientes === 'frecuencia') return b.totalConfirmados - a.totalConfirmados; if (ordenClientes === 'reciente') return new Date(b.ultimaVisita) - new Date(a.ultimaVisita); if (ordenClientes === 'gasto') return b.gastoTotal - a.gastoTotal; return 0; });

  const waitlistPorFecha = {};
  waitlistEntries.forEach(w => { const fechaKey = w.fecha.split('T')[0]; if (!waitlistPorFecha[fechaKey]) waitlistPorFecha[fechaKey] = []; waitlistPorFecha[fechaKey].push(w); });

  // LOGIN
  if (!token) { return ( <div className="max-w-sm mx-auto mt-16"><div className="text-center mb-8"><span className="text-4xl">🔐</span><h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#8B6F5E] mt-3">Admin</h2></div><form onSubmit={handleLogin} className="card animate-fade-up">{loginError && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{loginError}</div>}<div className="space-y-4"><div><label className="text-sm text-[#A89585] mb-1 block">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required /></div><div><label className="text-sm text-[#A89585] mb-1 block">Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required /></div><button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Entrando...' : 'Entrar'}</button></div></form></div> ); }

  const hoyStr = format(new Date(), 'yyyy-MM-dd');
  const turnosProximos = turnos.filter(t => t.fecha.split('T')[0] >= hoyStr && t.estado === 'confirmado').sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
  const turnosHoy = turnos.filter(t => t.fecha.split('T')[0] === hoyStr && t.estado === 'confirmado');
  const horariosPorDia2 = {}; DIAS.forEach((_, idx) => { horariosPorDia2[idx] = horarios.filter(h => h.dia_semana === idx); });

  const opcionesHoraEdit = (() => {
    if (!editandoTurno) return [];
    const lista = [...horariosEditTurno];
    const mismoContexto = editandoTurno._origFecha === editandoTurno.fecha && editandoTurno._origServicio === editandoTurno.servicio_id;
    if (mismoContexto && editandoTurno._origHora && !lista.some(h => h.hora_inicio === editandoTurno._origHora)) {
      lista.unshift({ hora_inicio: editandoTurno._origHora, hora_fin: '' });
    }
    return lista;
  })();

  const totalTurno = (turno) => {
    const base = parseFloat(turno.servicio?.precio_pesos || 0);
    const ex = (turno.extras || []).reduce((s, e) => s + parseFloat(e.precio_pesos || 0), 0);
    return base + ex;
  };

  // ── Calendario de turnos ───────────────────
  const turnosPorFechaCal = {};
  turnos.filter(t => t.estado === 'confirmado').forEach(t => { const key = t.fecha.split('T')[0]; (turnosPorFechaCal[key] = turnosPorFechaCal[key] || []).push(t); });
  Object.values(turnosPorFechaCal).forEach(arr => arr.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)));

  const franjaDia = (arr) => {
    if (!arr || arr.length === 0) return '';
    const inicio = arr.reduce((m, t) => t.hora_inicio < m ? t.hora_inicio : m, arr[0].hora_inicio);
    const fin = arr.reduce((m, t) => { const f = t.hora_fin || t.hora_inicio; return f > m ? f : m; }, arr[0].hora_fin || arr[0].hora_inicio);
    return `${inicio}–${fin}`;
  };

  const primerDiaMes = startOfMonth(mesCalendario);
  const diasDelMes = eachDayOfInterval({ start: primerDiaMes, end: endOfMonth(mesCalendario) });
  const offsetInicio = (primerDiaMes.getDay() + 6) % 7;
  const turnosDiaSel = diaSeleccionadoCal ? (turnosPorFechaCal[diaSeleccionadoCal] || []) : [];

  // Tarjeta de turno reutilizable (con edición inline, extras y total)
  const renderTurnoCard = (turno) => (
    <div key={turno.id} className="card">{editandoTurno?.id === turno.id ? (
      <form onSubmit={handleEditarTurno} className="space-y-4">
        <div className="flex items-center justify-between"><h3 className="font-semibold text-[#8B6F5E]">Editar turno</h3><button type="button" onClick={() => setEditandoTurno(null)} className="text-xs text-[#A89585] hover:text-[#8B6F5E] cursor-pointer">✕ Cerrar</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="text-xs text-[#A89585] mb-1 block">Nombre</label><input type="text" value={editandoTurno.nombre} onChange={e => setEditandoTurno({...editandoTurno, nombre: e.target.value})} className="input-field" required /></div>
          <div><label className="text-xs text-[#A89585] mb-1 block">Apellido</label><input type="text" value={editandoTurno.apellido} onChange={e => setEditandoTurno({...editandoTurno, apellido: e.target.value})} className="input-field" required /></div>
          <div><label className="text-xs text-[#A89585] mb-1 block">Teléfono</label><input type="tel" value={editandoTurno.telefono} onChange={e => setEditandoTurno({...editandoTurno, telefono: e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="1123456789" className="input-field" maxLength={10} required /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="text-xs text-[#A89585] mb-1 block">Servicio</label><select value={editandoTurno.servicio_id} onChange={e => setEditandoTurno({...editandoTurno, servicio_id: e.target.value, hora_inicio: ''})} className="input-field" required><option value="">Seleccionar...</option>{servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.duracion_minutos}min - ${s.precio_pesos})</option>)}</select></div>
          <div><label className="text-xs text-[#A89585] mb-1 block">Fecha</label><input type="date" value={editandoTurno.fecha} onChange={e => setEditandoTurno({...editandoTurno, fecha: e.target.value, hora_inicio: ''})} className="input-field" required /></div>
          <div><label className="text-xs text-[#A89585] mb-1 block">Hora</label><select value={editandoTurno.hora_inicio} onChange={e => setEditandoTurno({...editandoTurno, hora_inicio: e.target.value})} className="input-field" required><option value="">Seleccionar...</option>{opcionesHoraEdit.map(h => <option key={h.hora_inicio} value={h.hora_inicio}>{h.hora_inicio}{h.hora_fin ? ` - ${h.hora_fin}` : ''}</option>)}</select>{editandoTurno.fecha && editandoTurno.servicio_id && opcionesHoraEdit.length === 0 && <p className="text-xs text-[#C47070] mt-1">Sin horarios</p>}</div>
        </div>
        <div className="flex gap-2"><button type="submit" disabled={!editandoTurno.hora_inicio} className="btn-primary">Guardar cambios</button><button type="button" onClick={() => setEditandoTurno(null)} className="px-3 py-2 border border-[#E8DDD3] rounded-lg text-sm text-[#8B6F5E] cursor-pointer">Cancelar</button></div>
      </form>
    ) : (
      <div className="flex items-center justify-between"><div><p className="font-semibold">{turno.cliente_nombre} {turno.cliente_apellido}</p><p className="text-sm text-[#8B6F5E]">{format(fechaLocal(turno.fecha), "EEE d MMM", {locale: es})} · {turno.hora_inicio} hs</p><p className="text-xs text-[#A89585]">{turno.servicio?.nombre}</p>{turno.extras && turno.extras.length > 0 && (<p className="text-xs text-[#6B8F6B] font-medium mt-0.5">✨ {turno.extras.map(e => e.nombre).join(', ')} · Total ${totalTurno(turno).toLocaleString('es-AR')}</p>)}</div><div className="text-right"><p className="text-xs text-[#A89585]">{turno.cliente_telefono}</p><div className="flex gap-2 mt-1 justify-end"><span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5E8] text-[#6B8F6B]">confirmado</span>{turno.origen === 'manual' && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#A89585]">manual</span>}</div><div className="flex gap-3 justify-end mt-2"><button onClick={() => handleAbrirEdicion(turno)} className="text-xs text-[#8B6F5E] hover:underline cursor-pointer">Editar</button><button onClick={() => handleCancelarTurno(turno)} className="text-xs text-[#C47070] hover:underline cursor-pointer">Cancelar turno</button></div></div></div>
    )}</div>
  );

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
        {[{id:'turnos',label:'📋 Turnos'},{id:'servicios',label:'💅 Servicios'},{id:'extras',label:'✨ Extras'},{id:'horarios',label:'🕐 Horarios'},{id:'bloques',label:'🚫 Bloqueos'},{id:'metricas',label:'📊 Métricas'},{id:'clientes',label:'👤 Clientes'},{id:'waitlist',label:'🔔 Waitlist'}].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setClienteSeleccionado(null); setFichaCliente(null); }} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === t.id ? 'bg-white text-[#8B6F5E] shadow-sm' : 'text-[#A89585]'}`}>{t.label}</button>
        ))}
      </div>

      {/* TURNOS */}
      {tab === 'turnos' && (<div className="animate-fade-up">
        <div className="mb-6"><button onClick={() => setMostrarFormTurno(!mostrarFormTurno)} className={`btn-primary ${mostrarFormTurno ? 'opacity-70' : ''}`}>{mostrarFormTurno ? '✕ Cancelar' : '➕ Agregar turno manual'}</button></div>
        {mostrarFormTurno && (<div className="card mb-6"><h3 className="font-semibold mb-4 text-[#8B6F5E]">Nuevo turno manual</h3><form onSubmit={handleCrearTurnoManual} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="text-xs text-[#A89585] mb-1 block">Nombre</label><input type="text" value={turnoManual.nombre} onChange={e => setTurnoManual({...turnoManual, nombre: e.target.value})} className="input-field" required /></div><div><label className="text-xs text-[#A89585] mb-1 block">Apellido</label><input type="text" value={turnoManual.apellido} onChange={e => setTurnoManual({...turnoManual, apellido: e.target.value})} className="input-field" required /></div><div><label className="text-xs text-[#A89585] mb-1 block">Teléfono</label><input type="tel" value={turnoManual.telefono} onChange={e => setTurnoManual({...turnoManual, telefono: e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="1123456789" className="input-field" maxLength={10} required /></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="text-xs text-[#A89585] mb-1 block">Servicio</label><select value={turnoManual.servicio_id} onChange={e => setTurnoManual({...turnoManual, servicio_id: e.target.value, hora_inicio: ''})} className="input-field" required><option value="">Seleccionar...</option>{servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.duracion_minutos}min - ${s.precio_pesos})</option>)}</select></div><div><label className="text-xs text-[#A89585] mb-1 block">Fecha</label><input type="date" value={turnoManual.fecha} onChange={e => setTurnoManual({...turnoManual, fecha: e.target.value, hora_inicio: ''})} className="input-field" required /></div><div><label className="text-xs text-[#A89585] mb-1 block">Hora</label><select value={turnoManual.hora_inicio} onChange={e => setTurnoManual({...turnoManual, hora_inicio: e.target.value})} className="input-field" required><option value="">Seleccionar...</option>{horariosDisponibles.map(h => <option key={h.hora_inicio} value={h.hora_inicio}>{h.hora_inicio} - {h.hora_fin}</option>)}</select>{turnoManual.fecha && turnoManual.servicio_id && horariosDisponibles.length === 0 && <p className="text-xs text-[#C47070] mt-1">Sin horarios</p>}</div></div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={turnoManual.notificar} onChange={e => setTurnoManual({...turnoManual, notificar: e.target.checked})} className="w-4 h-4 accent-[#8B6F5E]" /><span className="text-sm text-[#8B6F5E]">📲 Avisar por WhatsApp a la clienta</span></label><button type="submit" disabled={!turnoManual.hora_inicio} className="btn-primary">Crear turno</button></form></div>)}

        {/* Calendario mensual */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMesCalendario(m => addMonths(m, -1))} className="w-9 h-9 rounded-lg border border-[#E8DDD3] text-[#8B6F5E] text-lg flex items-center justify-center hover:border-[#8B6F5E] cursor-pointer">‹</button>
            <h3 className="font-semibold text-[#8B6F5E] capitalize">{format(mesCalendario, "MMMM yyyy", { locale: es })}</h3>
            <button onClick={() => setMesCalendario(m => addMonths(m, 1))} className="w-9 h-9 rounded-lg border border-[#E8DDD3] text-[#8B6F5E] text-lg flex items-center justify-center hover:border-[#8B6F5E] cursor-pointer">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => <div key={d} className="text-center text-xs text-[#A89585] font-medium py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offsetInicio }).map((_, i) => <div key={'e'+i} />)}
            {diasDelMes.map(dia => {
              const key = format(dia, 'yyyy-MM-dd');
              const arr = turnosPorFechaCal[key] || [];
              const count = arr.length;
              const esHoy = key === hoyStr;
              const esSeleccionado = key === diaSeleccionadoCal;
              return (
                <button key={key} onClick={() => setDiaSeleccionadoCal(esSeleccionado ? null : key)}
                  className={`min-h-[56px] sm:min-h-[68px] rounded-lg border p-1 text-left transition-colors cursor-pointer flex flex-col ${esSeleccionado ? 'border-[#8B6F5E] bg-[#FFFBF5] ring-1 ring-[#8B6F5E]' : count > 0 ? 'bg-[#FFFBF5] border-[#E8DDD3] hover:border-[#8B6F5E]' : 'bg-white border-[#F0E9E1] hover:border-[#E8DDD3]'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${esHoy ? 'text-white bg-[#8B6F5E] rounded-full w-6 h-6 flex items-center justify-center' : count > 0 ? 'text-[#2D2A26]' : 'text-[#C9BCAD]'}`}>{format(dia, 'd')}</span>
                    {count > 0 && <span className="text-[10px] font-bold text-white bg-[#8B6F5E] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{count}</span>}
                  </div>
                  {count > 0 && <span className="hidden sm:block text-[9px] text-[#8B6F5E] font-medium mt-auto leading-tight">{franjaDia(arr)}</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[#A89585] mt-3 text-center">Tocá un día para ver sus turnos</p>
        </div>

        {/* Detalle del día seleccionado */}
        {diaSeleccionadoCal && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#8B6F5E] capitalize">{format(fechaLocal(diaSeleccionadoCal), "EEEE d 'de' MMMM", { locale: es })}{turnosDiaSel.length > 0 && <span className="text-xs font-normal text-[#A89585] ml-2 normal-case">({turnosDiaSel.length} {turnosDiaSel.length === 1 ? 'turno' : 'turnos'} · {franjaDia(turnosDiaSel)})</span>}</h3>
              <button onClick={() => setDiaSeleccionadoCal(null)} className="text-sm text-[#8B6F5E] hover:underline cursor-pointer whitespace-nowrap ml-3">Cerrar</button>
            </div>
            {turnosDiaSel.length === 0 ? (
              <p className="text-center text-[#A89585] py-6">No hay turnos para este día</p>
            ) : (
              <div className="space-y-3">{turnosDiaSel.map(turno => renderTurnoCard(turno))}</div>
            )}
          </div>
        )}
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
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">Con: {s.servicios_compatibles.map(id => servicios.find(x => x.id === id)?.nombre).filter(Boolean).join(', ')}</span>
                    )}
                    {s.max_simultaneos > 1 && (<span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">Máx {s.max_simultaneos} a la vez</span>)}
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

      {/* EXTRAS */}
      {tab === 'extras' && (<div className="animate-fade-up">
        <p className="text-sm text-[#A89585] mb-4">Adicionales que la clienta puede sumar a un servicio (suman precio y tiempo). Asigná cada extra a los servicios donde se ofrece.</p>
        <div className="card mb-6">
          <h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Nuevo extra</h3>
          <form onSubmit={handleCrearExtra} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2"><label className="text-xs text-[#A89585] mb-1 block">Nombre</label><input type="text" value={nuevoExtra.nombre} onChange={e => setNuevoExtra({...nuevoExtra, nombre: e.target.value})} placeholder="Ej: Nail art" className="input-field" required /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Precio ($)</label><input type="number" value={nuevoExtra.precio_pesos} onChange={e => setNuevoExtra({...nuevoExtra, precio_pesos: e.target.value})} placeholder="2000" className="input-field" required /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">+ Minutos</label><input type="number" value={nuevoExtra.minutos_adicionales} onChange={e => setNuevoExtra({...nuevoExtra, minutos_adicionales: parseInt(e.target.value)||0})} min="0" step="5" className="input-field" /></div>
            </div>
            <div><label className="text-xs text-[#A89585] mb-1 block">Descripción (opcional)</label><input type="text" value={nuevoExtra.descripcion} onChange={e => setNuevoExtra({...nuevoExtra, descripcion: e.target.value})} placeholder="Una frase corta y atractiva para la clienta" className="input-field" /></div>
            <div>
              <label className="text-xs text-[#A89585] mb-2 block">¿En qué servicios se ofrece?</label>
              <div className="flex flex-wrap gap-2">
                {servicios.map(sc => {
                  const checked = nuevoExtra.servicios_ids.includes(sc.id);
                  return (
                    <label key={sc.id} className={`px-3 py-1.5 rounded-full text-xs cursor-pointer border ${checked ? 'bg-[#8B6F5E] text-white border-[#8B6F5E]' : 'bg-white text-[#8B6F5E] border-[#E8DDD3]'}`}>
                      <input type="checkbox" checked={checked} onChange={e => { const next = e.target.checked ? [...nuevoExtra.servicios_ids, sc.id] : nuevoExtra.servicios_ids.filter(id => id !== sc.id); setNuevoExtra({...nuevoExtra, servicios_ids: next}); }} className="hidden" />
                      {sc.nombre}
                    </label>
                  );
                })}
                {servicios.length === 0 && <p className="text-xs text-[#A89585]">Primero creá servicios</p>}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={nuevoExtra.precio_variable} onChange={e => setNuevoExtra({...nuevoExtra, precio_variable: e.target.checked})} className="w-4 h-4 accent-[#8B6F5E]" /><span className="text-sm text-[#8B6F5E]">💡 Precio variable (se muestra como "desde $X", puede variar según diseño)</span></label>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={nuevoExtra.destacado} onChange={e => setNuevoExtra({...nuevoExtra, destacado: e.target.checked})} className="w-4 h-4 accent-[#D4A843]" /><span className="text-sm text-[#8B6F5E]">⭐ Destacar (sello "más pedido")</span></label>
              <button type="submit" className="btn-primary">Crear extra</button>
            </div>
          </form>
        </div>
        {extras.length === 0 ? <p className="text-center text-[#A89585] py-8">Todavía no hay extras</p> : (<div className="space-y-3">{extras.map(ex => (
          <div key={ex.id} className={`card ${!ex.activo ? 'opacity-60' : ''}`}>{editandoExtra?.id === ex.id ? (
            <form onSubmit={handleEditarExtra} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2"><label className="text-xs text-[#A89585] mb-1 block">Nombre</label><input type="text" value={editandoExtra.nombre} onChange={e => setEditandoExtra({...editandoExtra, nombre: e.target.value})} className="input-field" /></div>
                <div><label className="text-xs text-[#A89585] mb-1 block">Precio ($)</label><input type="number" value={editandoExtra.precio_pesos} onChange={e => setEditandoExtra({...editandoExtra, precio_pesos: e.target.value})} className="input-field" /></div>
                <div><label className="text-xs text-[#A89585] mb-1 block">+ Minutos</label><input type="number" value={editandoExtra.minutos_adicionales} onChange={e => setEditandoExtra({...editandoExtra, minutos_adicionales: parseInt(e.target.value)||0})} min="0" step="5" className="input-field" /></div>
              </div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Descripción</label><input type="text" value={editandoExtra.descripcion || ''} onChange={e => setEditandoExtra({...editandoExtra, descripcion: e.target.value})} className="input-field" /></div>
              <div>
                <label className="text-xs text-[#A89585] mb-2 block">¿En qué servicios se ofrece?</label>
                <div className="flex flex-wrap gap-2">
                  {servicios.map(sc => {
                    const actuales = Array.isArray(editandoExtra.servicios_ids) ? editandoExtra.servicios_ids : [];
                    const checked = actuales.includes(sc.id);
                    return (
                      <label key={sc.id} className={`px-3 py-1.5 rounded-full text-xs cursor-pointer border ${checked ? 'bg-[#8B6F5E] text-white border-[#8B6F5E]' : 'bg-white text-[#8B6F5E] border-[#E8DDD3]'}`}>
                        <input type="checkbox" checked={checked} onChange={e => { const next = e.target.checked ? [...actuales, sc.id] : actuales.filter(id => id !== sc.id); setEditandoExtra({...editandoExtra, servicios_ids: next}); }} className="hidden" />
                        {sc.nombre}
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!editandoExtra.precio_variable} onChange={e => setEditandoExtra({...editandoExtra, precio_variable: e.target.checked})} className="w-4 h-4 accent-[#8B6F5E]" /><span className="text-sm text-[#8B6F5E]">💡 Precio variable (se muestra como "desde $X")</span></label>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!editandoExtra.destacado} onChange={e => setEditandoExtra({...editandoExtra, destacado: e.target.checked})} className="w-4 h-4 accent-[#D4A843]" /><span className="text-sm text-[#8B6F5E]">⭐ Destacar</span></label>
                <div className="flex gap-2"><button type="submit" className="btn-primary">Guardar</button><button type="button" onClick={() => setEditandoExtra(null)} className="px-3 py-2 border border-[#E8DDD3] rounded-lg text-sm cursor-pointer">✕</button></div>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{ex.destacado && '⭐ '}{ex.nombre}{!ex.activo && <span className="text-xs text-[#A89585] ml-2">(inactivo)</span>}</p>
                {ex.descripcion && <p className="text-sm text-[#A89585]">{ex.descripcion}</p>}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5E8] text-[#6B8F6B]">{ex.precio_variable ? `desde $${ex.precio_pesos}` : `+$${ex.precio_pesos}`}</span>
                  {ex.minutos_adicionales > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">+{ex.minutos_adicionales} min</span>}
                  {Array.isArray(ex.servicios_ids) && ex.servicios_ids.length > 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">En: {ex.servicios_ids.map(id => servicios.find(x => x.id === id)?.nombre).filter(Boolean).join(', ')}</span>
                  ) : <span className="text-xs px-2 py-0.5 rounded-full bg-[#FBEAEA] text-[#C47070]">Sin servicios asignados</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleToggleDestacado(ex)} className="text-sm text-[#D4A843] hover:underline cursor-pointer">{ex.destacado ? 'Quitar ⭐' : 'Destacar'}</button>
                <button onClick={() => setEditandoExtra({...ex, servicios_ids: Array.isArray(ex.servicios_ids) ? [...ex.servicios_ids] : []})} className="text-sm text-[#8B6F5E] hover:underline cursor-pointer">Editar</button>
                {ex.activo ? <button onClick={() => handleDesactivarExtra(ex.id)} className="text-sm text-[#C47070] hover:underline cursor-pointer">Desactivar</button> : <button onClick={() => handleActivarExtra(ex.id)} className="text-sm text-[#6B8F6B] hover:underline cursor-pointer">Activar</button>}
              </div>
            </div>
          )}</div>
        ))}</div>)}
      </div>)}

      {/* HORARIOS */}
      {tab === 'horarios' && (<div className="animate-fade-up">
        <div className="card mb-6">
          <h3 className="font-semibold mb-4 text-[#8B6F5E]">➕ Agregar rango horario</h3>
          <form onSubmit={handleCrearRango} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div><label className="text-xs text-[#A89585] mb-1 block">Día</label><select value={nuevoRango.dia_semana} onChange={e => setNuevoRango({...nuevoRango, dia_semana: parseInt(e.target.value)})} className="input-field">{DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div>
            <div><label className="text-xs text-[#A89585] mb-1 block">Desde</label><input type="time" value={nuevoRango.hora_inicio} onChange={e => setNuevoRango({...nuevoRango, hora_inicio: e.target.value})} className="input-field" /></div>
            <div><label className="text-xs text-[#A89585] mb-1 block">Hasta</label><input type="time" value={nuevoRango.hora_fin} onChange={e => setNuevoRango({...nuevoRango, hora_fin: e.target.value})} className="input-field" /></div>
            <div><label className="text-xs text-[#A89585] mb-1 block">Espacio (min)</label><input type="number" value={nuevoRango.espacio_entre_turnos_min} onChange={e => setNuevoRango({...nuevoRango, espacio_entre_turnos_min: parseInt(e.target.value)||0})} min="0" step="5" className="input-field" /></div>
            <button type="submit" className="btn-primary">Agregar</button>
          </form>
        </div>
        <div className="space-y-4">{DIAS.map((dia, idx) => (
          <div key={idx} className="card">
            <h4 className="font-semibold text-[#8B6F5E] mb-3">{dia}</h4>
            {horariosPorDia2[idx]?.length > 0 ? (
              <div className="space-y-2">{horariosPorDia2[idx].map(h => (
                <div key={h.id} className="flex items-center gap-3 bg-[#F5F0EB] rounded-lg p-3">
                  <input type="time" defaultValue={h.hora_inicio} onBlur={e => e.target.value !== h.hora_inicio && handleEditarRango(h.id, 'hora_inicio', e.target.value)} className="bg-white border border-[#E8DDD3] rounded px-2 py-1 text-sm" />
                  <span className="text-[#A89585]">→</span>
                  <input type="time" defaultValue={h.hora_fin} onBlur={e => e.target.value !== h.hora_fin && handleEditarRango(h.id, 'hora_fin', e.target.value)} className="bg-white border border-[#E8DDD3] rounded px-2 py-1 text-sm" />
                  <span className="text-xs text-[#A89585] ml-2">Espacio:</span>
                  <input type="number" defaultValue={h.espacio_entre_turnos_min} onBlur={e => parseInt(e.target.value) !== h.espacio_entre_turnos_min && handleEditarRango(h.id, 'espacio_entre_turnos_min', parseInt(e.target.value))} min="0" step="5" className="bg-white border border-[#E8DDD3] rounded px-2 py-1 text-sm w-16" />
                  <span className="text-xs text-[#A89585]">min</span>
                  <button onClick={() => handleEliminarRango(h.id)} className="ml-auto text-sm text-[#C47070] hover:underline cursor-pointer">Eliminar</button>
                </div>
              ))}</div>
            ) : <p className="text-sm text-[#A89585]">Cerrado</p>}
          </div>
        ))}</div>
      </div>)}

      {/* BLOQUEOS */}
      {tab === 'bloques' && (<div className="animate-fade-up">
        <div className="card mb-6">
          <h3 className="font-semibold mb-4 text-[#8B6F5E]">🚫 Bloquear un día</h3>
          <form onSubmit={handleCrearBloque} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div><label className="text-xs text-[#A89585] mb-1 block">Fecha</label><input type="date" value={nuevoBloque.fecha} onChange={e => setNuevoBloque({...nuevoBloque, fecha: e.target.value})} className="input-field" required /></div>
            <div><label className="text-xs text-[#A89585] mb-1 block">Motivo</label><input type="text" value={nuevoBloque.motivo} onChange={e => setNuevoBloque({...nuevoBloque, motivo: e.target.value})} placeholder="Ej: Feriado" className="input-field" /></div>
            <button type="submit" className="btn-primary">Bloquear</button>
          </form>
        </div>
        <div className="space-y-3">{bloques.length === 0 ? <p className="text-center text-[#A89585] py-8">No hay días bloqueados</p> : bloques.map(b => (
          <div key={b.id} className="card flex items-center justify-between">
            <div><p className="font-semibold">{format(fechaLocal(b.fecha), "EEEE d 'de' MMMM yyyy", {locale: es})}</p>{b.motivo && <p className="text-sm text-[#A89585]">{b.motivo}</p>}</div>
            <button onClick={() => handleEliminarBloque(b.id)} className="text-sm text-[#C47070] hover:underline cursor-pointer">Eliminar</button>
          </div>
        ))}</div>
      </div>)}

      {/* MÉTRICAS */}
      {tab === 'metricas' && (<div className="animate-fade-up">
        <div className="flex gap-2 mb-6">
          {[{id:'semana',label:'Última semana'},{id:'mes',label:'Este mes'},{id:'todo',label:'Todo'}].map(p => (
            <button key={p.id} onClick={() => setPeriodoMetricas(p.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${periodoMetricas === p.id ? 'bg-[#8B6F5E] text-white' : 'bg-[#F5F0EB] text-[#8B6F5E]'}`}>{p.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="card text-center"><p className="text-2xl font-bold text-[#6B8F6B]">{confirmadosFiltrados.length}</p><p className="text-xs text-[#A89585]">Confirmados</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-[#C47070]">{canceladosFiltrados.length}</p><p className="text-xs text-[#A89585]">Cancelados</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-[#8B6F5E]">{tasaCancelacion}%</p><p className="text-xs text-[#A89585]">Tasa cancelación</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-[#8B6F5E]">${ingresoEstimado.toLocaleString('es-AR')}</p><p className="text-xs text-[#A89585]">Ingreso estimado</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="card">
            <h4 className="font-semibold text-[#8B6F5E] mb-4">💅 Servicios más pedidos</h4>
            {topServicios.length === 0 ? <p className="text-sm text-[#A89585]">Sin datos</p> : <div className="space-y-3">{topServicios.map(([nombre, count]) => (
              <div key={nombre}><div className="flex justify-between text-sm mb-1"><span>{nombre}</span><span className="text-[#A89585]">{count}</span></div><div className="h-2 bg-[#F5F0EB] rounded-full overflow-hidden"><div className="h-full bg-[#8B6F5E] rounded-full" style={{width: `${(count/maxServicio)*100}%`}} /></div></div>
            ))}</div>}
          </div>
          <div className="card">
            <h4 className="font-semibold text-[#8B6F5E] mb-4">📅 Por día de semana</h4>
            <div className="space-y-3">{turnosPorDia.map((count, i) => (
              <div key={i}><div className="flex justify-between text-sm mb-1"><span>{diasNombres[i]}</span><span className="text-[#A89585]">{count}</span></div><div className="h-2 bg-[#F5F0EB] rounded-full overflow-hidden"><div className="h-full bg-[#6B8F6B] rounded-full" style={{width: `${(count/maxDia)*100}%`}} /></div></div>
            ))}</div>
          </div>
          <div className="card">
            <h4 className="font-semibold text-[#8B6F5E] mb-4">🕐 Horarios más pedidos</h4>
            {horasOrdenadas.length === 0 ? <p className="text-sm text-[#A89585]">Sin datos</p> : <div className="space-y-3">{horasOrdenadas.map(([hora, count]) => (
              <div key={hora}><div className="flex justify-between text-sm mb-1"><span>{hora}:00 hs</span><span className="text-[#A89585]">{count}</span></div><div className="h-2 bg-[#F5F0EB] rounded-full overflow-hidden"><div className="h-full bg-[#D4A843] rounded-full" style={{width: `${(count/maxHora)*100}%`}} /></div></div>
            ))}</div>}
          </div>
          <div className="card">
            <h4 className="font-semibold text-[#8B6F5E] mb-4">👤 Clientes frecuentes</h4>
            {topClientesM.length === 0 ? <p className="text-sm text-[#A89585]">Sin datos</p> : <div className="space-y-2">{topClientesM.map(c => (
              <div key={c.telefono} className="flex justify-between items-center bg-[#F5F0EB] rounded-lg p-2"><span className="text-sm font-medium">{c.nombre}</span><span className="text-xs text-[#A89585]">{c.visitas} visita{c.visitas > 1 ? 's' : ''}</span></div>
            ))}</div>}
          </div>
        </div>
      </div>)}

      {/* CLIENTES */}
      {tab === 'clientes' && (<div className="animate-fade-up">
        {!clienteSeleccionado ? (<>
          <div className="card mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-[#A89585] mb-1 block">Buscar</label><input type="text" value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} placeholder="Nombre, apellido o teléfono" className="input-field" /></div>
              <div><label className="text-xs text-[#A89585] mb-1 block">Ordenar por</label><select value={ordenClientes} onChange={e => setOrdenClientes(e.target.value)} className="input-field"><option value="frecuencia">Más turnos</option><option value="reciente">Visita más reciente</option><option value="gasto">Mayor gasto</option></select></div>
            </div>
          </div>
          {clientesFiltrados.length === 0 ? <p className="text-center text-[#A89585] py-8">No hay clientes</p> : (<div className="space-y-3">{clientesFiltrados.map(c => (
            <button key={c.telefono} onClick={() => loadFichaCliente(c.telefono)} className="card w-full text-left hover:border-[#8B6F5E] transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.nombre} {c.apellido}</p>
                  <p className="text-sm text-[#A89585]">{c.telefono}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5E8] text-[#6B8F6B]">{c.totalConfirmados} confirmado{c.totalConfirmados !== 1 ? 's' : ''}</span>
                    {c.totalCancelados > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-[#FBEAEA] text-[#C47070]">{c.totalCancelados} cancelado{c.totalCancelados !== 1 ? 's' : ''}</span>}
                    {c.tieneNotas && <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">📝 Con notas</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#8B6F5E]">${(c.gastoTotal || 0).toLocaleString('es-AR')}</p>
                  <p className="text-xs text-[#A89585]">Última: {c.ultimaVisita ? format(fechaLocal(c.ultimaVisita), "d MMM", {locale: es}) : '-'}</p>
                </div>
              </div>
            </button>
          ))}</div>)}
        </>) : loadingFicha ? <p className="text-center text-[#A89585] py-8">Cargando ficha...</p> : fichaCliente ? (<>
          <button onClick={() => { setClienteSeleccionado(null); setFichaCliente(null); }} className="text-sm text-[#8B6F5E] hover:underline mb-4 cursor-pointer">← Volver a clientes</button>
          <div className="card mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#8B6F5E]">{fichaCliente.cliente.nombre} {fichaCliente.cliente.apellido}</h3>
                <p className="text-[#A89585]">{fichaCliente.cliente.telefono}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#8B6F5E]">${(fichaCliente.stats.gastoTotal || 0).toLocaleString('es-AR')}</p>
                <p className="text-xs text-[#A89585]">gastado en total</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-[#F5F0EB] rounded-lg p-3 text-center"><p className="text-lg font-bold text-[#6B8F6B]">{fichaCliente.stats.totalConfirmados}</p><p className="text-xs text-[#A89585]">Confirmados</p></div>
              <div className="bg-[#F5F0EB] rounded-lg p-3 text-center"><p className="text-lg font-bold text-[#C47070]">{fichaCliente.stats.totalCancelados}</p><p className="text-xs text-[#A89585]">Cancelados</p></div>
              <div className="bg-[#F5F0EB] rounded-lg p-3 text-center"><p className="text-lg font-bold text-[#8B6F5E]">{fichaCliente.stats.primeraVisita ? format(fechaLocal(fichaCliente.stats.primeraVisita), "MMM yy", {locale: es}) : '-'}</p><p className="text-xs text-[#A89585]">Cliente desde</p></div>
            </div>
          </div>
          <div className="card mb-4">
            <h4 className="font-semibold text-[#8B6F5E] mb-3">📝 Notas privadas</h4>
            <div className="flex gap-2 mb-4">
              <input type="text" value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAgregarNota()} placeholder="Ej: Alérgica al esmalte X, prefiere tonos nude..." className="input-field flex-1" />
              <button onClick={handleAgregarNota} className="btn-primary">Agregar</button>
            </div>
            {fichaCliente.notas.length === 0 ? <p className="text-sm text-[#A89585]">Sin notas todavía</p> : (<div className="space-y-2">{fichaCliente.notas.map(n => (
              <div key={n.id} className="flex items-start justify-between bg-[#F5F0EB] rounded-lg p-3">
                <div><p className="text-sm">{n.texto}</p><p className="text-xs text-[#A89585] mt-1">{format(new Date(n.created_at), "d MMM yyyy", {locale: es})}</p></div>
                <button onClick={() => handleEliminarNota(n.id)} className="text-xs text-[#C47070] hover:underline ml-3 cursor-pointer">Eliminar</button>
              </div>
            ))}</div>)}
          </div>
          <div className="card">
            <h4 className="font-semibold text-[#8B6F5E] mb-3">📅 Historial de turnos</h4>
            {fichaCliente.historial.length === 0 ? <p className="text-sm text-[#A89585]">Sin turnos</p> : (<div className="space-y-2">{fichaCliente.historial.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-[#F5F0EB] rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">{t.servicio?.nombre}</p>
                  <p className="text-xs text-[#A89585]">{format(fechaLocal(t.fecha), "EEE d MMM yyyy", {locale: es})} · {t.hora_inicio} hs</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.estado === 'confirmado' ? 'bg-[#E8F5E8] text-[#6B8F6B]' : 'bg-[#FBEAEA] text-[#C47070]'}`}>{t.estado}</span>
              </div>
            ))}</div>)}
          </div>
        </>) : null}
      </div>)}

      {/* WAITLIST */}
      {tab === 'waitlist' && (<div className="animate-fade-up">
        <p className="text-sm text-[#A89585] mb-4">Clientas anotadas esperando que se libere un turno. Cuando canceles uno, podés avisarles.</p>
        {Object.keys(waitlistPorFecha).length === 0 ? <p className="text-center text-[#A89585] py-8">No hay nadie en lista de espera</p> : (<div className="space-y-6">{Object.entries(waitlistPorFecha).sort((a, b) => a[0].localeCompare(b[0])).map(([fecha, entries]) => (
          <div key={fecha}>
            <h4 className="font-semibold text-[#8B6F5E] mb-2 capitalize">{format(fechaLocal(fecha), "EEEE d 'de' MMMM", {locale: es})}</h4>
            <div className="space-y-2">{entries.map(w => (
              <div key={w.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold">{w.cliente_nombre} {w.cliente_apellido}</p>
                  <p className="text-sm text-[#A89585]">{w.cliente_telefono}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">{w.servicio?.nombre || 'Servicio'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#8B6F5E]">{w.franja === 'manana' ? '☀️ Mañana' : '🌙 Tarde'}</span>
                  </div>
                </div>
                <a href={`https://wa.me/549${w.cliente_telefono}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#6B8F6B] hover:underline cursor-pointer">WhatsApp →</a>
              </div>
            ))}</div>
          </div>
        ))}</div>)}
      </div>)}

    </div>
  );
}
