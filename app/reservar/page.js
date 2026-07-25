'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format, addDays, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
 
export default function ReservarPage() {
  const [step, setStep] = useState(1);
  const [servicios, setServicios] = useState([]);
  // Reserva múltiple: array de servicios elegidos (1 o más)
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);
  // Extras disponibles por servicio: { [servicioId]: [extra,...] }
  const [extrasPorServicio, setExtrasPorServicio] = useState({});
  // Extras elegidos por servicio: { [servicioId]: [extra,...] }
  const [extrasElegidos, setExtrasElegidos] = useState({});
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [paginaFecha, setPaginaFecha] = useState(0);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnoConfirmado, setTurnoConfirmado] = useState(null);
  const [reservaMultiple, setReservaMultiple] = useState(null);
  const [horariosLoaded, setHorariosLoaded] = useState(false);
  // Marca si en algún momento se mostró la pantalla de "aprovechá el rato" (para el progreso)
  const [pasoCompatiblesVisitado, setPasoCompatiblesVisitado] = useState(false);
  // "Foto" de los compatibles a ofrecer, tomada UNA sola vez al salir del Step 1.
  // No se recalcula al sumar servicios desde esta pantalla, para que no se encadene
  // (ej. sumar Pies no debe empezar a ofrecer los compatibles propios de Pies).
  const [compatiblesOfrecidosSnapshot, setCompatiblesOfrecidosSnapshot] = useState([]);
  const [anclaNombresSnapshot, setAnclaNombresSnapshot] = useState('');
 
  // Waitlist
  const [mostrarWaitlist, setMostrarWaitlist] = useState(false);
  const [waitlistNombre, setWaitlistNombre] = useState('');
  const [waitlistApellido, setWaitlistApellido] = useState('');
  const [waitlistTelefono, setWaitlistTelefono] = useState('');
  const [waitlistFranja, setWaitlistFranja] = useState('manana');
  const [waitlistEnviado, setWaitlistEnviado] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
 
  useEffect(() => {
    api.get('/api/servicios')
      .then(res => setServicios(res.data))
      .catch(() => setError('No se pudieron cargar los servicios'));
  }, []);
 
  const esMulti = serviciosSeleccionados.length >= 2;
 
  // Payload de servicios+extras para los endpoints multi
  const buildServiciosPayload = () =>
    serviciosSeleccionados.map(s => ({
      servicio_id: s.id,
      extras: (extrasElegidos[s.id] || []).map(e => e.id),
    }));
 
  // Disponibilidad: 1 servicio usa el endpoint clásico; 2+ usa el de bloque
  useEffect(() => {
    if (!fechaSeleccionada || serviciosSeleccionados.length === 0) return;
    setHoraSeleccionada('');
    setLoading(true);
    setHorariosLoaded(false);
    setMostrarWaitlist(false);
    setWaitlistEnviado(false);
 
    const finalizar = () => { setLoading(false); setHorariosLoaded(true); };
 
    if (serviciosSeleccionados.length === 1) {
      const s = serviciosSeleccionados[0];
      const exIds = (extrasElegidos[s.id] || []).map(e => e.id);
      const extrasParam = exIds.length > 0 ? `?extras=${exIds.join(',')}` : '';
      api.get(`/api/turnos/disponibilidad/${fechaSeleccionada}/${s.id}${extrasParam}`)
        .then(res => setHorariosDisponibles(res.data.horarios || []))
        .catch(() => setHorariosDisponibles([]))
        .finally(finalizar);
    } else {
      api.post('/api/turnos/disponibilidad-multi', {
        fecha: fechaSeleccionada,
        servicios: buildServiciosPayload(),
      })
        .then(res => setHorariosDisponibles(res.data.horarios || []))
        .catch(() => setHorariosDisponibles([]))
        .finally(finalizar);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSeleccionada, serviciosSeleccionados, extrasElegidos]);
 
  const [diasHabilitados, setDiasHabilitados] = useState([]);
 
  useEffect(() => {
    api.get('/api/horarios')
      .then(res => {
        const dias = [...new Set(res.data.map(h => h.dia_semana))];
        setDiasHabilitados(dias);
      })
      .catch(() => {});
  }, []);
 
  // dia_semana en DB: 0=Lunes ... 6=Domingo
  // getDay() de JS: 0=Domingo, 1=Lunes ... 6=Sábado
  const diaJsToDB = (jsDay) => jsDay === 0 ? 6 : jsDay - 1;
 
  const hoy = startOfToday();
  const proxDias = Array.from({ length: 60 }, (_, i) => addDays(hoy, i + 1))
    .filter(dia => diasHabilitados.includes(diaJsToDB(dia.getDay())));
 
  // Paginación de fechas (5 por página, con flechas)
  const diasPorPagina = 5;
  const totalPaginas = Math.max(1, Math.ceil(proxDias.length / diasPorPagina));
  const paginaSegura = Math.min(paginaFecha, totalPaginas - 1);
  const diasPagina = proxDias.slice(paginaSegura * diasPorPagina, paginaSegura * diasPorPagina + diasPorPagina);
 
  // Detectar si faltan franjas
  const tieneMañana = horariosDisponibles.some(h => parseInt(h.hora_inicio.split(':')[0]) < 14);
  const tieneTarde = horariosDisponibles.some(h => parseInt(h.hora_inicio.split(':')[0]) >= 14);
  const sinHorarios = horariosLoaded && horariosDisponibles.length === 0;
  const faltaFranja = horariosLoaded && horariosDisponibles.length > 0 && (!tieneMañana || !tieneTarde);
 
  // ── Helpers de formato / totales ───────────────
  const formatDuracion = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m} min`;
  };
 
  const sumarMinutos = (hhmm, mins) => {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };
 
  // Calcula la duración real del bloque teniendo en cuenta servicios intercalados
  // (ej. PRP + Pies): un servicio compatible con un servicio "ancla" elegido en el
  // mismo bloque NO suma tiempo, comparte el horario del ancla. Espeja la misma
  // lógica que usa el backend (resolverBloqueConIntercalados en availability.js).
  const calcularDuracionTotalBloque = (serviciosSel, extrasEleg) => {
    const items = serviciosSel.map(s => {
      const exs = extrasEleg[s.id] || [];
      const duracion = s.duracion_minutos + exs.reduce((a, e) => a + (e.minutos_adicionales || 0), 0);
      return { servicio: s, duracion };
    });
 
    const porServicioId = {};
    items.forEach(it => { porServicioId[it.servicio.id] = it; });
 
    const anclaDe = {};
    // Nota: acá NO se limita por `max_simultaneos` — ese campo se usa para el caso de
    // dos turnos de CLIENTAS DISTINTAS compartiendo horario. En este flujo (una sola
    // clienta eligiendo servicios juntos) la propia pantalla "Aprovechá el rato" ya
    // garantiza que como máximo se elija un compatible por ancla.
    items.forEach(it => {
      if (!it.servicio.intercalable) return;
      const compatibles = it.servicio.servicios_compatibles || [];
      items.forEach(otro => {
        if (otro.servicio.id === it.servicio.id) return;
        if (anclaDe[otro.servicio.id]) return;
        if (!compatibles.includes(otro.servicio.id)) return;
        anclaDe[otro.servicio.id] = it.servicio.id;
      });
    });
 
    const secuenciales = items.filter(it => !anclaDe[it.servicio.id]);
    const intercalados = items.filter(it => anclaDe[it.servicio.id]);
 
    const duracionEfectivaPorId = {};
    secuenciales.forEach(it => { duracionEfectivaPorId[it.servicio.id] = it.duracion; });
    intercalados.forEach(it => {
      const anclaId = anclaDe[it.servicio.id];
      const ancla = porServicioId[anclaId];
      const offset = ancla.servicio.intercalar_desde_min || 0;
      const necesaria = offset + it.duracion;
      if (necesaria > duracionEfectivaPorId[anclaId]) duracionEfectivaPorId[anclaId] = necesaria;
    });
 
    return secuenciales.reduce((s, it) => s + duracionEfectivaPorId[it.servicio.id], 0);
  };
 
  // Total de precio sobre TODOS los servicios + sus extras elegidos (el precio no cambia
  // aunque el tiempo se comparta: cada servicio sigue costando lo suyo)
  const totalPrecio = serviciosSeleccionados.reduce((tot, s) => {
    const exs = extrasElegidos[s.id] || [];
    return tot + parseFloat(s.precio_pesos) + exs.reduce((a, e) => a + parseFloat(e.precio_pesos), 0);
  }, 0);
 
  const minutosTotal = calcularDuracionTotalBloque(serviciosSeleccionados, extrasElegidos);
 
  const duracionTotalTexto = formatDuracion(minutosTotal);
  const horaFinEstimada = horaSeleccionada ? sumarMinutos(horaSeleccionada, minutosTotal) : '';
 
  // ¿Hay algún extra con precio variable entre los disponibles / elegidos? (para mostrar la leyenda)
  const hayExtraVariableDisponible = Object.values(extrasPorServicio).flat().some(e => e.precio_variable);
  const hayExtraVariableElegido = Object.values(extrasElegidos).flat().some(e => e.precio_variable);
 
  // ── Servicios compatibles ("aprovechá el rato") ─
  // Selección ÚNICA: se muestran todas las opciones de la foto congelada; el cliente
  // puede elegir como máximo una.
  const compatibleElegidoId = compatiblesOfrecidosSnapshot.find(
    s => serviciosSeleccionados.some(x => x.id === s.id)
  )?.id;
 
  // Elegir (o cambiar) el compatible: si había otro elegido, lo saca antes de sumar el nuevo.
  // Si se toca el mismo que ya está elegido, lo deselecciona.
  const elegirCompatible = (s) => {
    const yaElegido = serviciosSeleccionados.some(x => x.id === s.id);
    if (yaElegido) {
      toggleServicio(s);
      return;
    }
    const otro = compatiblesOfrecidosSnapshot.find(c => c.id !== s.id && serviciosSeleccionados.some(x => x.id === c.id));
    if (otro) toggleServicio(otro);
    toggleServicio(s);
  };
 
  // ── Selección de servicios (multi) ─────────────
  const isServicioSel = (s) => serviciosSeleccionados.some(x => x.id === s.id);
 
  // Ícono de línea (manual de marca) según palabras clave en el nombre del servicio.
  // Si el nombre no matchea ninguna keyword, no se muestra ícono (evita mostrar uno incorrecto).
  const getServicioIcono = (nombre = '') => {
    const n = nombre.toLowerCase();
    if (n.includes('uñ')) return '/icons/icon-unas.png';
    if (n.includes('ceja')) return '/icons/icon-cejas.png';
    if (n.includes('pestañ')) return '/icons/icon-pestanas.png';
    if (n.includes('facial')) return '/icons/icon-faciales.png';
    if (n.includes('prp')) return '/icons/icon-amor.png';
    return null;
  };
 
  const toggleServicio = (s) => {
    setFechaSeleccionada('');
    setHoraSeleccionada('');
    setPaginaFecha(0);
    setServiciosSeleccionados(prev =>
      prev.some(x => x.id === s.id)
        ? prev.filter(x => x.id !== s.id)
        : [...prev, s]
    );
    // Si se deselecciona, limpiar sus extras elegidos
    setExtrasElegidos(prev => {
      if (serviciosSeleccionados.some(x => x.id === s.id)) {
        const copia = { ...prev };
        delete copia[s.id];
        return copia;
      }
      return prev;
    });
  };
 
  // Desde el Step 1: si hay servicios compatibles para ofrecer, mostramos esa pantalla
  // primero (una "foto" fija de lo que hay en ese momento); si no, vamos directo a
  // cargar extras (comportamiento de siempre).
  const handleContinuarDesdeServicios = () => {
    if (serviciosSeleccionados.length === 0) return;
 
    const idsSeleccionados = new Set(serviciosSeleccionados.map(s => s.id));
    const anclas = serviciosSeleccionados.filter(
      s => s.intercalable && Array.isArray(s.servicios_compatibles) && s.servicios_compatibles.length > 0
    );
    const idsCompatibles = new Set();
    anclas.forEach(a => a.servicios_compatibles.forEach(id => { if (!idsSeleccionados.has(id)) idsCompatibles.add(id); }));
    const compatiblesOfrecidos = servicios.filter(s => idsCompatibles.has(s.id));
 
    if (compatiblesOfrecidos.length > 0) {
      setCompatiblesOfrecidosSnapshot(compatiblesOfrecidos);
      setAnclaNombresSnapshot(anclas.map(a => a.nombre).join(' y '));
      setPasoCompatiblesVisitado(true);
      setStep(6);
    } else {
      handleConfirmarServicios();
    }
  };
 
  // Al confirmar los servicios, cargar los extras de cada uno
  const handleConfirmarServicios = async () => {
    if (serviciosSeleccionados.length === 0) return;
    setError('');
    setLoading(true);
    const mapa = {};
    for (const s of serviciosSeleccionados) {
      try {
        const res = await api.get(`/api/extras/servicio/${s.id}`);
        mapa[s.id] = res.data || [];
      } catch {
        mapa[s.id] = [];
      }
    }
    setExtrasPorServicio(mapa);
    setLoading(false);
    const hayExtras = Object.values(mapa).some(arr => arr.length > 0);
    setStep(hayExtras ? 2 : 3);
  };
 
  // Toggle de un extra para un servicio puntual
  const toggleExtra = (servicioId, ex) => {
    setExtrasElegidos(prev => {
      const actuales = prev[servicioId] || [];
      const nuevos = actuales.some(e => e.id === ex.id)
        ? actuales.filter(e => e.id !== ex.id)
        : [...actuales, ex];
      return { ...prev, [servicioId]: nuevos };
    });
  };
 
  const cantExtrasElegidos = Object.values(extrasElegidos).reduce((a, arr) => a + arr.length, 0);
 
  // Pasos visibles: 1 servicios, 6 compatibles (si corresponde), 2 extras (si corresponde), 3 fecha/hora, 4 datos
  const tieneExtras = Object.values(extrasPorServicio).some(arr => arr.length > 0);
  const mostrarPasoCompatibles = compatiblesOfrecidosSnapshot.length > 0 || pasoCompatiblesVisitado;
  const ordenPasos = [
    1,
    ...(mostrarPasoCompatibles ? [6] : []),
    ...(tieneExtras ? [2] : []),
    3,
    4,
  ];
  const idxPaso = Math.max(0, ordenPasos.indexOf(step));
  const totalPasos = ordenPasos.length;
 
  const volverAServicios = () => {
    setStep(1);
    setFechaSeleccionada('');
    setHoraSeleccionada('');
    setPasoCompatiblesVisitado(false);
    setCompatiblesOfrecidosSnapshot([]);
    setAnclaNombresSnapshot('');
  };
 
  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (serviciosSeleccionados.length === 1) {
        const s = serviciosSeleccionados[0];
        const res = await api.post('/api/turnos', {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim(),
          servicio_id: s.id,
          fecha: fechaSeleccionada,
          hora_inicio: horaSeleccionada,
          extras: (extrasElegidos[s.id] || []).map(e => e.id),
        });
        setTurnoConfirmado(res.data.turno);
      } else {
        const res = await api.post('/api/turnos/multi', {
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim(),
          fecha: fechaSeleccionada,
          hora_inicio: horaSeleccionada,
          servicios: buildServiciosPayload(),
        });
        setReservaMultiple(res.data);
      }
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reservar. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };
 
  const handleWaitlist = async () => {
    setWaitlistError('');
    if (!waitlistNombre || !waitlistApellido || waitlistTelefono.length !== 10) {
      setWaitlistError('Completá todos los campos correctamente');
      return;
    }
    setWaitlistLoading(true);
    try {
      await api.post('/api/waitlist', {
        nombre: waitlistNombre.trim(),
        apellido: waitlistApellido.trim(),
        telefono: waitlistTelefono.trim(),
        servicio_id: serviciosSeleccionados[0]?.id,
        fecha: fechaSeleccionada,
        franja: waitlistFranja
      });
      setWaitlistEnviado(true);
    } catch (err) {
      setWaitlistError(err.response?.data?.error || 'Error al registrarte. Intentá de nuevo.');
    } finally {
      setWaitlistLoading(false);
    }
  };
 
  // ── Componente Waitlist (reutilizable) ───────
  const WaitlistSection = ({ prominente }) => {
    if (waitlistEnviado) {
      return (
        <div className="card bg-[#E8F5E8] border-[#C8E6C8] text-center mt-4">
          <p className="text-[#6B8F6B] font-medium">✅ ¡Listo!</p>
          <p className="text-sm text-[#6B8F6B] mt-1">Te vamos a avisar por WhatsApp si se libera un turno.</p>
        </div>
      );
    }
 
    if (!mostrarWaitlist) {
      return (
        <div className="mt-4">
          <button onClick={() => setMostrarWaitlist(true)}
            className={`w-full p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              prominente
                ? 'border-2 border-dashed border-[#D94F8A] bg-[#FDEFF5] text-[#E6005C] hover:border-[#E6005C]'
                : 'border border-[#F5D9E4] bg-white text-[#8A8580] hover:border-[#E6005C] hover:text-[#E6005C]'
            }`}>
            {prominente
              ? '🔔 Avisame si se libera un turno'
              : '🔔 ¿No encontrás el horario que buscás? Unite a la lista de espera'
            }
          </button>
        </div>
      );
    }
 
    return (
      <div className="card mt-4 animate-fade-up">
        <h3 className="font-semibold text-[#E6005C] mb-3">🔔 Lista de espera</h3>
        <p className="text-sm text-[#8A8580] mb-4">
          Te avisamos por WhatsApp si se libera un turno para el{' '}
          {format(new Date(fechaSeleccionada + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}.
        </p>
 
        {waitlistError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-3 text-sm">
            {waitlistError}
          </div>
        )}
 
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#8A8580] mb-1 block">¿En qué franja preferís?</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setWaitlistFranja('manana')}
                className={`p-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  waitlistFranja === 'manana'
                    ? 'bg-[#E6005C] text-white'
                    : 'bg-white border border-[#F5D9E4] hover:border-[#E6005C]'
                }`}>
                ☀️ Mañana (9-13h)
              </button>
              <button onClick={() => setWaitlistFranja('tarde')}
                className={`p-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  waitlistFranja === 'tarde'
                    ? 'bg-[#E6005C] text-white'
                    : 'bg-white border border-[#F5D9E4] hover:border-[#E6005C]'
                }`}>
                🌙 Tarde (14-18h)
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8A8580] mb-1 block">Nombre</label>
            <input type="text" value={waitlistNombre} onChange={e => setWaitlistNombre(e.target.value)}
              placeholder="Tu nombre" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-[#8A8580] mb-1 block">Apellido</label>
            <input type="text" value={waitlistApellido} onChange={e => setWaitlistApellido(e.target.value)}
              placeholder="Tu apellido" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-[#8A8580] mb-1 block">Teléfono (10 dígitos)</label>
            <input type="tel" value={waitlistTelefono}
              onChange={e => setWaitlistTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="1123456789" className="input-field" maxLength={10} />
            <p className="text-xs text-[#8A8580] mt-1">Sin 0 ni 15. Te avisamos por WhatsApp.</p>
          </div>
        </div>
 
        <div className="flex gap-2 mt-4">
          <button onClick={handleWaitlist} disabled={waitlistLoading}
            className="btn-primary flex-1">
            {waitlistLoading ? 'Registrando...' : 'Avisame'}
          </button>
          <button onClick={() => setMostrarWaitlist(false)}
            className="px-4 py-2 border border-[#F5D9E4] rounded-lg text-sm text-[#8A8580] cursor-pointer">
            Cancelar
          </button>
        </div>
      </div>
    );
  };
 
  // STEP 5: Confirmación (turno simple o reserva múltiple)
  if (step === 5 && (turnoConfirmado || reservaMultiple)) {
    const turnos = reservaMultiple?.turnos || [];
    const horaInicioFinal = reservaMultiple ? reservaMultiple.hora_inicio : turnoConfirmado?.hora_inicio;
    const horaFinFinal = reservaMultiple ? reservaMultiple.hora_fin : null;
    return (
      <div className="card text-center animate-fade-up max-w-lg mx-auto">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#6B8F6B] mb-2">
          {esMulti ? '¡Turnos confirmados!' : '¡Turno confirmado!'}
        </h2>
        <div className="bg-[#FCE9F0] rounded-lg p-4 my-6 text-left space-y-3">
          {serviciosSeleccionados.map((s, idx) => {
            const exs = extrasElegidos[s.id] || [];
            const turnoDeEsteServicio = reservaMultiple
              ? turnos.find(t => t.servicio_id === s.id)
              : turnoConfirmado;
            const horaServ = turnoDeEsteServicio?.hora_inicio;
            return (
              <div key={s.id} className={idx > 0 ? 'pt-3 border-t border-[#F5D9E4]' : ''}>
                <p className="font-semibold text-[#3A3A3A]">
                  {esMulti && horaServ ? `${horaServ} · ` : ''}{s.nombre}
                </p>
                {s.incluye_nota && s.nota && (
                  <p className="text-sm text-[#6B8F6B]">✨ {s.nota}</p>
                )}
                {exs.length > 0 && (
                  <p className="text-sm text-[#E6005C]">✨ {exs.map(e => e.nombre).join(', ')}</p>
                )}
              </div>
            );
          })}
          <div className="pt-3 border-t border-[#F5D9E4] space-y-1">
            <p><span className="text-[#8A8580]">Fecha:</span> <strong>{format(new Date(fechaSeleccionada + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}</strong></p>
            <p>
              <span className="text-[#8A8580]">Horario:</span>{' '}
              <strong>{esMulti ? `${horaInicioFinal} a ${horaFinFinal} hs` : `${horaInicioFinal} hs`}</strong>
            </p>
            <p><span className="text-[#8A8580]">Cliente:</span> <strong>{nombre} {apellido}</strong></p>
            <p className="pt-2 border-t border-[#F5D9E4]"><span className="text-[#8A8580]">Total{hayExtraVariableElegido ? ' (desde)' : ''}:</span> <strong className="text-[#6B8F6B]">${totalPrecio.toLocaleString('es-AR')}</strong></p>
            {hayExtraVariableElegido && (
              <p className="text-xs text-[#8A8580]">💡 El precio de los extras "desde" es de referencia y puede variar según el diseño.</p>
            )}
          </div>
        </div>
        <p className="text-sm text-[#8A8580] mb-6">
          {esMulti ? 'Vas a recibir la confirmación por WhatsApp 📱' : 'Vas a recibir una confirmación por WhatsApp 📱'}
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/mistura" className="text-[#E6005C] hover:underline text-sm">Ver mis turnos</a>
          <span className="text-[#F5D9E4]">|</span>
          <a href="/reservar" className="text-[#E6005C] hover:underline text-sm" onClick={() => window.location.reload()}>Reservar otro</a>
        </div>
      </div>
    );
  }
 
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#E6005C] mb-2">
        Reservá tu turno
      </h2>
      <p className="text-[#8A8580] mb-8">Paso {idxPaso + 1} de {totalPasos}</p>
 
      <div className="flex gap-1 mb-8">
        {ordenPasos.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= idxPaso ? 'bg-[#E6005C]' : 'bg-[#F5D9E4]'}`} />
        ))}
      </div>
 
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}
 
      {/* STEP 1: Elegir servicios (uno o varios) */}
      {step === 1 && (
        <div className="space-y-3 animate-fade-up">
          <p className="font-medium mb-1">¿Qué servicios querés?</p>
          <p className="text-sm text-[#8A8580] mb-4">Podés elegir más de uno y te los agendamos uno detrás del otro. 💆‍♀️</p>
          {servicios.map(s => {
            const sel = isServicioSel(s);
            const icono = getServicioIcono(s.nombre);
            return (
              <button key={s.id} onClick={() => toggleServicio(s)}
                className={`card w-full text-left transition-all cursor-pointer flex justify-between items-center ${sel ? 'border-2 border-[#E6005C] bg-[#FDEFF5]' : 'border border-[#F5D9E4] hover:border-[#E6005C]'}`}>
                <div className="flex items-center gap-3">
                  {icono && (
                    <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${sel ? 'bg-[#F2C4D8]' : 'bg-[#FCE9F0]'}`}>
                      <img src={icono} alt="" className="w-5 h-5" />
                    </div>
                  )}
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold ${sel ? 'bg-[#E6005C] border-[#E6005C] text-white' : 'border-[#F2C4D8] text-transparent'}`}>✓</div>
                  <div>
                    <p className="font-semibold text-[#3A3A3A]">{s.nombre}</p>
                    <p className="text-sm text-[#8A8580]">{s.duracion_minutos} minutos</p>
                    {s.incluye_nota && s.nota && <p className="text-xs text-[#6B8F6B] font-medium mt-0.5">✨ {s.nota}</p>}
                  </div>
                </div>
                <p className="text-lg font-bold text-[#E6005C]">${s.precio_pesos}</p>
              </button>
            );
          })}
 
          {serviciosSeleccionados.length > 0 && (
            <div className="card bg-[#FCE9F0] flex items-center justify-between mt-4">
              <div>
                <p className="text-xs text-[#8A8580]">{serviciosSeleccionados.length} servicio{serviciosSeleccionados.length > 1 ? 's' : ''}</p>
                <p className="font-bold text-[#E6005C] text-xl">${totalPrecio.toLocaleString('es-AR')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#8A8580]">Duración estimada</p>
                <p className="font-medium text-[#E6005C]">{duracionTotalTexto}</p>
              </div>
            </div>
          )}
 
          <button onClick={handleContinuarDesdeServicios}
            disabled={serviciosSeleccionados.length === 0 || loading}
            className="btn-primary w-full mt-2">
            {loading ? 'Cargando...' : (
              serviciosSeleccionados.length === 0
                ? 'Elegí al menos un servicio'
                : `Continuar con ${serviciosSeleccionados.length} servicio${serviciosSeleccionados.length > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}
 
      {/* STEP 6: Aprovechá el rato (servicios compatibles con el/los ancla elegidos, ej. PRP) */}
      {step === 6 && (
        <div className="animate-fade-up">
          <div className="card mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8A8580]">Servicios elegidos</p>
              <p className="font-semibold">{serviciosSeleccionados.map(s => s.nombre).join(' · ')}</p>
            </div>
            <button onClick={volverAServicios} className="text-sm text-[#E6005C] hover:underline cursor-pointer">Cambiar</button>
          </div>
 
          <p className="font-medium mb-1">💆‍♀️ Aprovechá el rato</p>
          <p className="text-sm text-[#8A8580] mb-5">
            Mientras te hacés {anclaNombresSnapshot}, podés sumar <strong>una</strong> de estas opciones sin que tu turno dure más tiempo.
          </p>
 
          {compatiblesOfrecidosSnapshot.length > 0 ? (
            <div className="space-y-3">
              {compatiblesOfrecidosSnapshot.map(s => {
                const sel = compatibleElegidoId === s.id;
                const icono = getServicioIcono(s.nombre);
                return (
                  <button key={s.id} onClick={() => elegirCompatible(s)}
                    className={`w-full text-left card transition-all cursor-pointer flex items-center justify-between ${sel ? 'border-2 border-[#E6005C] bg-[#FDEFF5]' : 'border border-[#F5D9E4] hover:border-[#E6005C]'}`}>
                    <div className="flex items-center gap-3">
                      {icono && (
                        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${sel ? 'bg-[#F2C4D8]' : 'bg-[#FCE9F0]'}`}>
                          <img src={icono} alt="" className="w-5 h-5" />
                        </div>
                      )}
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold ${sel ? 'bg-[#E6005C] border-[#E6005C] text-white' : 'border-[#F2C4D8] text-transparent'}`}>✓</div>
                      <div>
                        <p className="font-semibold text-[#3A3A3A]">{s.nombre}</p>
                        <p className="text-xs text-[#6B8F6B] mt-0.5">✨ No suma tiempo a tu turno</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-[#E6005C]">+${s.precio_pesos}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="card bg-[#E8F5E8] border-[#C8E6C8]">
              <p className="text-sm text-[#6B8F6B]">✅ Ya sumaste todo lo disponible para aprovechar el rato.</p>
            </div>
          )}
 
          {/* Total en vivo */}
          <div className="card mt-4 bg-[#FCE9F0] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#8A8580]">Total</p>
              <p className="font-bold text-[#E6005C] text-xl">${totalPrecio.toLocaleString('es-AR')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8A8580]">Duración</p>
              <p className="font-medium text-[#E6005C]">{duracionTotalTexto}</p>
            </div>
          </div>
 
          <button onClick={handleConfirmarServicios} className="btn-primary w-full mt-4">
            Continuar
          </button>
        </div>
      )}
 
      {/* STEP 2: Extras (una sección por cada servicio que tenga extras) */}
      {step === 2 && (
        <div className="animate-fade-up">
          <div className="card mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8A8580]">{esMulti ? 'Servicios elegidos' : 'Servicio elegido'}</p>
              <p className="font-semibold">{serviciosSeleccionados.map(s => s.nombre).join(' · ')}</p>
            </div>
            <button onClick={volverAServicios} className="text-sm text-[#E6005C] hover:underline cursor-pointer">Cambiar</button>
          </div>
 
          <p className="font-medium mb-1">✨ Dale tu toque</p>
          <p className="text-sm text-[#8A8580] mb-5">Personalizá con extras. Es opcional, ¡pero quedan increíbles!</p>
 
          {serviciosSeleccionados.map(s => {
            const exsDisp = extrasPorServicio[s.id] || [];
            if (exsDisp.length === 0) return null;
            return (
              <div key={s.id} className="mb-6">
                {esMulti && <p className="text-sm font-semibold text-[#E6005C] mb-2">Extras para {s.nombre}</p>}
                <div className="space-y-3">
                  {exsDisp.map(ex => {
                    const sel = (extrasElegidos[s.id] || []).some(e => e.id === ex.id);
                    return (
                      <button key={ex.id} onClick={() => toggleExtra(s.id, ex)}
                        className={`w-full text-left card transition-all cursor-pointer relative ${sel ? 'border-2 border-[#E6005C] bg-[#FDEFF5]' : 'border border-[#F5D9E4] hover:border-[#E6005C]'}`}>
                        {ex.destacado && <span className="absolute -top-2 left-4 text-xs px-2 py-0.5 rounded-full bg-[#D94F8A] text-white font-medium shadow-sm">⭐ Más pedido</span>}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold ${sel ? 'bg-[#E6005C] border-[#E6005C] text-white' : 'border-[#F2C4D8] text-transparent'}`}>✓</div>
                            <div>
                              <p className="font-semibold text-[#3A3A3A]">{ex.nombre}</p>
                              {ex.descripcion && <p className="text-sm text-[#8A8580]">{ex.descripcion}</p>}
                              {ex.minutos_adicionales > 0 && <p className="text-xs text-[#8A8580] mt-0.5">+{ex.minutos_adicionales} min</p>}
                              {ex.precio_variable && <p className="text-xs text-[#8A8580] mt-0.5">💡 Precio de referencia, puede variar según diseño</p>}
                            </div>
                          </div>
                          <p className="font-bold text-[#E6005C] whitespace-nowrap">{ex.precio_variable ? `desde $${ex.precio_pesos}` : `+$${ex.precio_pesos}`}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
 
          {/* Total en vivo */}
          <div className="card mt-1 bg-[#FCE9F0] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#8A8580]">Total{hayExtraVariableElegido ? ' (desde)' : ''}</p>
              <p className="font-bold text-[#E6005C] text-xl">${totalPrecio.toLocaleString('es-AR')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8A8580]">Duración</p>
              <p className="font-medium text-[#E6005C]">{duracionTotalTexto}</p>
            </div>
          </div>
          {hayExtraVariableDisponible && (
            <p className="text-xs text-[#8A8580] mt-2">💡 Los precios marcados como "desde" son de referencia y pueden variar según la complejidad del diseño.</p>
          )}
 
          <button onClick={() => setStep(3)} className="btn-primary w-full mt-4">
            {cantExtrasElegidos > 0 ? `Continuar con ${cantExtrasElegidos} extra${cantExtrasElegidos > 1 ? 's' : ''}` : 'Continuar sin extras'}
          </button>
        </div>
      )}
 
      {/* STEP 3: Elegir fecha y hora */}
      {step === 3 && (
        <div className="animate-fade-up">
          <div className="card mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#8A8580]">{esMulti ? 'Servicios elegidos' : 'Servicio elegido'}</p>
              <p className="font-semibold">{serviciosSeleccionados.map(s => s.nombre).join(' · ')}</p>
              <p className="text-xs text-[#8A8580] mt-0.5">Duración total: {duracionTotalTexto}</p>
            </div>
            <button onClick={volverAServicios} className="text-sm text-[#E6005C] hover:underline cursor-pointer">Cambiar</button>
          </div>
 
          {cantExtrasElegidos > 0 && (
            <div className="card mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8A8580]">Extras</p>
                <p className="font-medium text-sm">✨ {Object.values(extrasElegidos).flat().map(e => e.nombre).join(' · ')}</p>
              </div>
              <button onClick={() => setStep(2)} className="text-sm text-[#E6005C] hover:underline cursor-pointer">Editar</button>
            </div>
          )}
 
          {!fechaSeleccionada ? (
            <div className="animate-fade-up">
              <p className="font-medium mb-3">Elegí una fecha</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPaginaFecha(p => Math.max(0, p - 1))} disabled={paginaSegura === 0}
                  className="shrink-0 w-9 h-10 rounded-lg border border-[#F5D9E4] text-[#E6005C] text-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-default hover:border-[#E6005C] cursor-pointer">‹</button>
                <div className="grid grid-cols-5 gap-2 flex-1">
                  {diasPagina.map(dia => {
                    const fechaStr = format(dia, 'yyyy-MM-dd');
                    return (
                      <button key={fechaStr} onClick={() => setFechaSeleccionada(fechaStr)}
                        className="p-2 rounded-lg text-center text-sm transition-colors cursor-pointer bg-white border border-[#F5D9E4] hover:border-[#E6005C] hover:bg-[#FDEFF5] text-[#3A3A3A]">
                        <p className="text-xs opacity-70">{format(dia, 'EEE', { locale: es })}</p>
                        <p className="font-bold text-base">{format(dia, 'd')}</p>
                        <p className="text-xs opacity-70">{format(dia, 'MMM', { locale: es })}</p>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setPaginaFecha(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaSegura >= totalPaginas - 1}
                  className="shrink-0 w-9 h-10 rounded-lg border border-[#F5D9E4] text-[#E6005C] text-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-default hover:border-[#E6005C] cursor-pointer">›</button>
              </div>
              {totalPaginas > 1 && (
                <p className="text-center text-xs text-[#8A8580] mt-3">Usá las flechas para ver más fechas · {paginaSegura + 1}/{totalPaginas}</p>
              )}
            </div>
          ) : (
            <div className="animate-fade-up">
              <div className="card mb-4 flex items-center justify-between bg-[#FCE9F0]">
                <div>
                  <p className="text-xs text-[#8A8580]">Fecha elegida</p>
                  <p className="font-semibold text-[#E6005C]">📅 {format(new Date(fechaSeleccionada + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}</p>
                </div>
                <button onClick={() => { setFechaSeleccionada(''); setHoraSeleccionada(''); }} className="text-sm text-[#E6005C] hover:underline cursor-pointer whitespace-nowrap ml-3">Cambiar fecha</button>
              </div>
 
              <p className="font-medium mb-1">Elegí un horario {esMulti && <span className="text-sm text-[#8A8580] font-normal">(de inicio)</span>}</p>
              {esMulti && <p className="text-sm text-[#8A8580] mb-3">Te reservamos el bloque completo de {duracionTotalTexto} a partir de la hora que elijas.</p>}
              {loading ? (
                <p className="text-[#8A8580] text-sm">Cargando horarios...</p>
              ) : sinHorarios ? (
                <div>
                  <p className="text-[#C47070] text-sm">
                    {esMulti
                      ? `No hay un bloque libre de ${duracionTotalTexto} este día. Probá otra fecha o reservá los servicios por separado.`
                      : 'No hay horarios disponibles para este día.'}
                  </p>
                  <WaitlistSection prominente={true} />
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-2">
                    {horariosDisponibles.map(h => {
                      const isSelected = horaSeleccionada === h.hora_inicio;
                      return (
                        <button key={h.hora_inicio} onClick={() => setHoraSeleccionada(h.hora_inicio)}
                          className={`p-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#E6005C] text-white' : 'bg-white border border-[#F5D9E4] hover:border-[#E6005C]'
                          }`}>
                          {h.hora_inicio}
                        </button>
                      );
                    })}
                  </div>
 
                  {/* Resumen del bloque elegido: inicio y fin estimado */}
                  {horaSeleccionada && (
                    <div className="card bg-[#FCE9F0] mt-3 animate-fade-up flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#8A8580]">Tu turno</p>
                        <p className="font-semibold text-[#E6005C]">🕐 {horaSeleccionada} a {horaFinEstimada} hs</p>
                      </div>
                      <p className="text-sm text-[#8A8580]">{duracionTotalTexto}</p>
                    </div>
                  )}
 
                  {/* Waitlist sutil cuando hay horarios pero falta alguna franja */}
                  <WaitlistSection prominente={false} />
                </div>
              )}
            </div>
          )}
 
          {horaSeleccionada && (
            <button onClick={() => setStep(4)} className="btn-primary w-full mt-4">
              Continuar
            </button>
          )}
        </div>
      )}
 
      {/* STEP 4: Datos personales */}
      {step === 4 && (
        <div className="animate-fade-up">
          <div className="card mb-4">
            <p className="text-sm text-[#8A8580]">{esMulti ? 'Tus turnos' : 'Tu turno'}</p>
            <p className="font-semibold">
              {serviciosSeleccionados.map(s => s.nombre).join(' · ')}
            </p>
            <p className="text-sm text-[#E6005C] mt-1">
              📅 {format(new Date(fechaSeleccionada + 'T12:00:00'), "EEE d MMM", { locale: es })} · {esMulti ? `${horaSeleccionada} a ${horaFinEstimada} hs` : `${horaSeleccionada} hs`}
            </p>
            {cantExtrasElegidos > 0 && (
              <p className="text-sm text-[#E6005C] mt-1">✨ {Object.values(extrasElegidos).flat().map(e => e.nombre).join(', ')}</p>
            )}
            <p className="text-sm font-semibold text-[#6B8F6B] mt-1">Total{hayExtraVariableElegido ? ' (desde)' : ''}: ${totalPrecio.toLocaleString('es-AR')} · {duracionTotalTexto}</p>
            {hayExtraVariableElegido && (
              <p className="text-xs text-[#8A8580] mt-0.5">💡 El precio de los extras "desde" es de referencia y puede variar según el diseño.</p>
            )}
            <button onClick={() => setStep(3)} className="text-sm text-[#E6005C] hover:underline mt-2 cursor-pointer">Cambiar</button>
          </div>
 
          <p className="font-medium mb-4">Tus datos</p>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8A8580] mb-1 block">Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre" className="input-field" />
            </div>
            <div>
              <label className="text-sm text-[#8A8580] mb-1 block">Apellido</label>
              <input type="text" value={apellido} onChange={e => setApellido(e.target.value)}
                placeholder="Tu apellido" className="input-field" />
            </div>
            <div>
              <label className="text-sm text-[#8A8580] mb-1 block">Teléfono (10 dígitos)</label>
              <input type="tel" value={telefono}
                onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="1123456789" className="input-field" maxLength={10} />
              <p className="text-xs text-[#8A8580] mt-1">Sin 0 ni 15. Ej: 1123456789</p>
            </div>
          </div>
 
          <button onClick={handleSubmit}
            disabled={!nombre || !apellido || telefono.length !== 10 || loading}
            className="btn-primary w-full mt-6">
            {loading ? 'Reservando...' : (esMulti ? 'Confirmar reserva' : 'Confirmar reserva')}
          </button>
        </div>
      )}
    </div>
  );
}
