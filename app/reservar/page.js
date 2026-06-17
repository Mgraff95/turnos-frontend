'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format, addDays, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ReservarPage() {
  const [step, setStep] = useState(1);
  const [servicios, setServicios] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [extrasServicio, setExtrasServicio] = useState([]);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [horariosDisponibles, setHorariosDisponibles] = useState([]);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnoConfirmado, setTurnoConfirmado] = useState(null);
  const [horariosLoaded, setHorariosLoaded] = useState(false);

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

  useEffect(() => {
    if (!fechaSeleccionada || !servicioSeleccionado) return;
    setHoraSeleccionada('');
    setLoading(true);
    setHorariosLoaded(false);
    setMostrarWaitlist(false);
    setWaitlistEnviado(false);
    const extrasParam = extrasSeleccionados.length > 0
      ? `?extras=${extrasSeleccionados.map(e => e.id).join(',')}`
      : '';
    api.get(`/api/turnos/disponibilidad/${fechaSeleccionada}/${servicioSeleccionado.id}${extrasParam}`)
      .then(res => setHorariosDisponibles(res.data.horarios || []))
      .catch(() => setHorariosDisponibles([]))
      .finally(() => { setLoading(false); setHorariosLoaded(true); });
  }, [fechaSeleccionada, servicioSeleccionado, extrasSeleccionados]);

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

  // Detectar si faltan franjas
  const tieneMañana = horariosDisponibles.some(h => parseInt(h.hora_inicio.split(':')[0]) < 14);
  const tieneTarde = horariosDisponibles.some(h => parseInt(h.hora_inicio.split(':')[0]) >= 14);
  const sinHorarios = horariosLoaded && horariosDisponibles.length === 0;
  const faltaFranja = horariosLoaded && horariosDisponibles.length > 0 && (!tieneMañana || !tieneTarde);

  // ── Extras: helpers y totales ───────────────
  const toggleExtra = (ex) => {
    setExtrasSeleccionados(prev =>
      prev.some(e => e.id === ex.id)
        ? prev.filter(e => e.id !== ex.id)
        : [...prev, ex]
    );
  };
  const formatDuracion = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m} min`;
  };
  const precioServicio = servicioSeleccionado ? parseFloat(servicioSeleccionado.precio_pesos) : 0;
  const precioExtras = extrasSeleccionados.reduce((s, e) => s + parseFloat(e.precio_pesos), 0);
  const totalPrecio = precioServicio + precioExtras;
  const minutosTotal = (servicioSeleccionado?.duracion_minutos || 0) + extrasSeleccionados.reduce((s, e) => s + (e.minutos_adicionales || 0), 0);
  const duracionTotalTexto = formatDuracion(minutosTotal);

  // ── Elegir servicio → cargar extras y decidir paso ──
  const handleElegirServicio = async (s) => {
    setServicioSeleccionado(s);
    setExtrasSeleccionados([]);
    setExtrasServicio([]);
    setFechaSeleccionada('');
    setHoraSeleccionada('');
    try {
      const res = await api.get(`/api/extras/servicio/${s.id}`);
      const lista = res.data || [];
      setExtrasServicio(lista);
      setStep(lista.length > 0 ? 2 : 3);
    } catch {
      setExtrasServicio([]);
      setStep(3);
    }
  };

  // Pasos visibles (el paso de extras solo existe si el servicio tiene extras)
  const tieneExtras = extrasServicio.length > 0;
  const ordenPasos = tieneExtras ? [1, 2, 3, 4] : [1, 3, 4];
  const idxPaso = Math.max(0, ordenPasos.indexOf(step));
  const totalPasos = ordenPasos.length;

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/turnos', {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
        servicio_id: servicioSeleccionado.id,
        fecha: fechaSeleccionada,
        hora_inicio: horaSeleccionada,
        extras: extrasSeleccionados.map(e => e.id),
      });
      setTurnoConfirmado(res.data.turno);
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
        servicio_id: servicioSeleccionado.id,
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
                ? 'border-2 border-dashed border-[#D4A843] bg-[#FFFBF0] text-[#8B6F5E] hover:border-[#8B6F5E]'
                : 'border border-[#E8DDD3] bg-white text-[#A89585] hover:border-[#8B6F5E] hover:text-[#8B6F5E]'
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
        <h3 className="font-semibold text-[#8B6F5E] mb-3">🔔 Lista de espera</h3>
        <p className="text-sm text-[#A89585] mb-4">
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
            <label className="text-xs text-[#A89585] mb-1 block">¿En qué franja preferís?</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setWaitlistFranja('manana')}
                className={`p-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  waitlistFranja === 'manana'
                    ? 'bg-[#8B6F5E] text-white'
                    : 'bg-white border border-[#E8DDD3] hover:border-[#8B6F5E]'
                }`}>
                ☀️ Mañana (9-13h)
              </button>
              <button onClick={() => setWaitlistFranja('tarde')}
                className={`p-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  waitlistFranja === 'tarde'
                    ? 'bg-[#8B6F5E] text-white'
                    : 'bg-white border border-[#E8DDD3] hover:border-[#8B6F5E]'
                }`}>
                🌙 Tarde (14-18h)
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#A89585] mb-1 block">Nombre</label>
            <input type="text" value={waitlistNombre} onChange={e => setWaitlistNombre(e.target.value)}
              placeholder="Tu nombre" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-[#A89585] mb-1 block">Apellido</label>
            <input type="text" value={waitlistApellido} onChange={e => setWaitlistApellido(e.target.value)}
              placeholder="Tu apellido" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-[#A89585] mb-1 block">Teléfono (10 dígitos)</label>
            <input type="tel" value={waitlistTelefono}
              onChange={e => setWaitlistTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="1123456789" className="input-field" maxLength={10} />
            <p className="text-xs text-[#A89585] mt-1">Sin 0 ni 15. Te avisamos por WhatsApp.</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={handleWaitlist} disabled={waitlistLoading}
            className="btn-primary flex-1">
            {waitlistLoading ? 'Registrando...' : 'Avisame'}
          </button>
          <button onClick={() => setMostrarWaitlist(false)}
            className="px-4 py-2 border border-[#E8DDD3] rounded-lg text-sm text-[#A89585] cursor-pointer">
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  // STEP 5: Confirmación
  if (step === 5 && turnoConfirmado) {
    return (
      <div className="card text-center animate-fade-up max-w-lg mx-auto">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#6B8F6B] mb-2">
          ¡Turno confirmado!
        </h2>
        <div className="bg-[#F5F0EB] rounded-lg p-4 my-6 text-left space-y-2">
          <p><span className="text-[#A89585]">Servicio:</span> <strong>{turnoConfirmado.servicio?.nombre}</strong></p>
          {extrasSeleccionados.length > 0 && (
            <p><span className="text-[#A89585]">Extras:</span> <strong>{extrasSeleccionados.map(e => e.nombre).join(', ')}</strong></p>
          )}
          <p><span className="text-[#A89585]">Fecha:</span> <strong>{format(new Date(fechaSeleccionada + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}</strong></p>
          <p><span className="text-[#A89585]">Hora:</span> <strong>{turnoConfirmado.hora_inicio} hs</strong></p>
          <p><span className="text-[#A89585]">Cliente:</span> <strong>{turnoConfirmado.cliente_nombre} {turnoConfirmado.cliente_apellido}</strong></p>
          <p className="pt-2 border-t border-[#E8DDD3]"><span className="text-[#A89585]">Total:</span> <strong className="text-[#6B8F6B]">${totalPrecio.toLocaleString('es-AR')}</strong></p>
        </div>
        <p className="text-sm text-[#A89585] mb-6">
          Vas a recibir una confirmación por WhatsApp 📱
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/mistura" className="text-[#8B6F5E] hover:underline text-sm">Ver mis turnos</a>
          <span className="text-[#E8DDD3]">|</span>
          <a href="/reservar" className="text-[#8B6F5E] hover:underline text-sm" onClick={() => window.location.reload()}>Reservar otro</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#8B6F5E] mb-2">
        Reservá tu turno
      </h2>
      <p className="text-[#A89585] mb-8">Paso {idxPaso + 1} de {totalPasos}</p>

      <div className="flex gap-1 mb-8">
        {ordenPasos.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= idxPaso ? 'bg-[#8B6F5E]' : 'bg-[#E8DDD3]'}`} />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* STEP 1: Elegir servicio */}
      {step === 1 && (
        <div className="space-y-3 animate-fade-up">
          <p className="font-medium mb-4">¿Qué servicio querés?</p>
          {servicios.map(s => (
            <button key={s.id} onClick={() => handleElegirServicio(s)}
              className="card w-full text-left hover:border-[#8B6F5E] transition-colors cursor-pointer flex justify-between items-center">
              <div>
                <p className="font-semibold text-[#2D2A26]">{s.nombre}</p>
                <p className="text-sm text-[#A89585]">{s.duracion_minutos} minutos</p>
              </div>
              <p className="text-lg font-bold text-[#8B6F5E]">${s.precio_pesos}</p>
            </button>
          ))}
        </div>
      )}

      {/* STEP 2: Extras */}
      {step === 2 && (
        <div className="animate-fade-up">
          <div className="card mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A89585]">Servicio elegido</p>
              <p className="font-semibold">{servicioSeleccionado?.nombre}</p>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-[#8B6F5E] hover:underline cursor-pointer">Cambiar</button>
          </div>

          <p className="font-medium mb-1">✨ Dale tu toque</p>
          <p className="text-sm text-[#A89585] mb-5">Personalizá tu {servicioSeleccionado?.nombre} con uno o más extras. Es opcional, ¡pero quedan increíbles!</p>

          <div className="space-y-3">
            {extrasServicio.map(ex => {
              const sel = extrasSeleccionados.some(e => e.id === ex.id);
              return (
                <button key={ex.id} onClick={() => toggleExtra(ex)}
                  className={`w-full text-left card transition-all cursor-pointer relative ${sel ? 'border-2 border-[#8B6F5E] bg-[#FFFBF5]' : 'border border-[#E8DDD3] hover:border-[#8B6F5E]'}`}>
                  {ex.destacado && <span className="absolute -top-2 left-4 text-xs px-2 py-0.5 rounded-full bg-[#D4A843] text-white font-medium shadow-sm">⭐ Más pedido</span>}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold ${sel ? 'bg-[#8B6F5E] border-[#8B6F5E] text-white' : 'border-[#D8CABA] text-transparent'}`}>✓</div>
                      <div>
                        <p className="font-semibold text-[#2D2A26]">{ex.nombre}</p>
                        {ex.descripcion && <p className="text-sm text-[#A89585]">{ex.descripcion}</p>}
                        {ex.minutos_adicionales > 0 && <p className="text-xs text-[#A89585] mt-0.5">+{ex.minutos_adicionales} min</p>}
                      </div>
                    </div>
                    <p className="font-bold text-[#8B6F5E] whitespace-nowrap">+${ex.precio_pesos}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Total en vivo */}
          <div className="card mt-5 bg-[#F5F0EB] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#A89585]">Total</p>
              <p className="font-bold text-[#8B6F5E] text-xl">${totalPrecio.toLocaleString('es-AR')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#A89585]">Duración</p>
              <p className="font-medium text-[#8B6F5E]">{duracionTotalTexto}</p>
            </div>
          </div>

          <button onClick={() => setStep(3)} className="btn-primary w-full mt-4">
            {extrasSeleccionados.length > 0 ? `Continuar con ${extrasSeleccionados.length} extra${extrasSeleccionados.length > 1 ? 's' : ''}` : 'Continuar sin extras'}
          </button>
        </div>
      )}

      {/* STEP 3: Elegir fecha y hora */}
      {step === 3 && (
        <div className="animate-fade-up">
          <div className="card mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A89585]">Servicio elegido</p>
              <p className="font-semibold">{servicioSeleccionado?.nombre}</p>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-[#8B6F5E] hover:underline cursor-pointer">Cambiar</button>
          </div>

          {extrasSeleccionados.length > 0 && (
            <div className="card mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A89585]">Extras</p>
                <p className="font-medium text-sm">✨ {extrasSeleccionados.map(e => e.nombre).join(' · ')}</p>
              </div>
              <button onClick={() => setStep(2)} className="text-sm text-[#8B6F5E] hover:underline cursor-pointer">Editar</button>
            </div>
          )}

          <p className="font-medium mb-3">Elegí una fecha</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-6">
            {proxDias.map(dia => {
              const fechaStr = format(dia, 'yyyy-MM-dd');
              const isSelected = fechaSeleccionada === fechaStr;
              return (
                <button key={fechaStr} onClick={() => setFechaSeleccionada(fechaStr)}
                  className={`p-2 rounded-lg text-center text-sm transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#8B6F5E] text-white' : 'bg-white border border-[#E8DDD3] hover:border-[#8B6F5E] text-[#2D2A26]'
                  }`}>
                  <p className="text-xs opacity-70">{format(dia, 'EEE', { locale: es })}</p>
                  <p className="font-bold">{format(dia, 'd')}</p>
                  <p className="text-xs opacity-70">{format(dia, 'MMM', { locale: es })}</p>
                </button>
              );
            })}
          </div>

          {fechaSeleccionada && (
            <>
              <p className="font-medium mb-3">Horarios disponibles</p>
              {loading ? (
                <p className="text-[#A89585] text-sm">Cargando horarios...</p>
              ) : sinHorarios ? (
                <div>
                  <p className="text-[#C47070] text-sm">No hay horarios disponibles para este día.</p>
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
                            isSelected ? 'bg-[#8B6F5E] text-white' : 'bg-white border border-[#E8DDD3] hover:border-[#8B6F5E]'
                          }`}>
                          {h.hora_inicio}
                        </button>
                      );
                    })}
                  </div>
                  {/* Waitlist sutil cuando hay horarios pero falta alguna franja */}
                  <WaitlistSection prominente={false} />
                </div>
              )}
            </>
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
            <p className="text-sm text-[#A89585]">Tu turno</p>
            <p className="font-semibold">
              {servicioSeleccionado?.nombre} · {format(new Date(fechaSeleccionada + 'T12:00:00'), "EEE d MMM", { locale: es })} · {horaSeleccionada} hs
            </p>
            {extrasSeleccionados.length > 0 && (
              <p className="text-sm text-[#8B6F5E] mt-1">✨ {extrasSeleccionados.map(e => e.nombre).join(', ')}</p>
            )}
            <p className="text-sm font-semibold text-[#6B8F6B] mt-1">Total: ${totalPrecio.toLocaleString('es-AR')} · {duracionTotalTexto}</p>
            <button onClick={() => setStep(3)} className="text-sm text-[#8B6F5E] hover:underline mt-2 cursor-pointer">Cambiar</button>
          </div>

          <p className="font-medium mb-4">Tus datos</p>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#A89585] mb-1 block">Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre" className="input-field" />
            </div>
            <div>
              <label className="text-sm text-[#A89585] mb-1 block">Apellido</label>
              <input type="text" value={apellido} onChange={e => setApellido(e.target.value)}
                placeholder="Tu apellido" className="input-field" />
            </div>
            <div>
              <label className="text-sm text-[#A89585] mb-1 block">Teléfono (10 dígitos)</label>
              <input type="tel" value={telefono}
                onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="1123456789" className="input-field" maxLength={10} />
              <p className="text-xs text-[#A89585] mt-1">Sin 0 ni 15. Ej: 1123456789</p>
            </div>
          </div>

          <button onClick={handleSubmit}
            disabled={!nombre || !apellido || telefono.length !== 10 || loading}
            className="btn-primary w-full mt-6">
            {loading ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </div>
      )}
    </div>
  );
}
