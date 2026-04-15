'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format, addDays, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ReservarPage() {
  const [step, setStep] = useState(1);
  const [servicios, setServicios] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
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
    api.get(`/api/turnos/disponibilidad/${fechaSeleccionada}/${servicioSeleccionado.id}`)
      .then(res => setHorariosDisponibles(res.data.horarios || []))
      .catch(() => setHorariosDisponibles([]))
      .finally(() => { setLoading(false); setHorariosLoaded(true); });
  }, [fechaSeleccionada, servicioSeleccionado]);

  const hoy = startOfToday();
  const proxDias = Array.from({ length: 30 }, (_, i) => addDays(hoy, i + 1));

  // Detectar si faltan franjas
  const tieneMañana = horariosDisponibles.some(h => parseInt(h.hora_inicio.split(':')[0]) < 14);
  const tieneTarde = horariosDisponibles.some(h => parseInt(h.hora_inicio.split(':')[0]) >= 14);
  const sinHorarios = horariosLoaded && horariosDisponibles.length === 0;
  const faltaFranja = horariosLoaded && horariosDisponibles.length > 0 && (!tieneMañana || !tieneTarde);

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
      });
      setTurnoConfirmado(res.data.turno);
      setStep(4);
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

  // STEP 4: Confirmación
  if (step === 4 && turnoConfirmado) {
    return (
      <div className="card text-center animate-fade-up max-w-lg mx-auto">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#6B8F6B] mb-2">
          ¡Turno confirmado!
        </h2>
        <div className="bg-[#F5F0EB] rounded-lg p-4 my-6 text-left space-y-2">
          <p><span className="text-[#A89585]">Servicio:</span> <strong>{turnoConfirmado.servicio?.nombre}</strong></p>
          <p><span className="text-[#A89585]">Fecha:</span> <strong>{format(new Date(turnoConfirmado.fecha), "EEEE d 'de' MMMM", { locale: es })}</strong></p>
          <p><span className="text-[#A89585]">Hora:</span> <strong>{turnoConfirmado.hora_inicio} hs</strong></p>
          <p><span className="text-[#A89585]">Cliente:</span> <strong>{turnoConfirmado.cliente_nombre} {turnoConfirmado.cliente_apellido}</strong></p>
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
      <p className="text-[#A89585] mb-8">Paso {step} de 3</p>

      <div className="flex gap-1 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-[#8B6F5E]' : 'bg-[#E8DDD3]'}`} />
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
            <button key={s.id} onClick={() => { setServicioSeleccionado(s); setStep(2); }}
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

      {/* STEP 2: Elegir fecha y hora */}
      {step === 2 && (
        <div className="animate-fade-up">
          <div className="card mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#A89585]">Servicio elegido</p>
              <p className="font-semibold">{servicioSeleccionado?.nombre}</p>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-[#8B6F5E] hover:underline cursor-pointer">Cambiar</button>
          </div>

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
            <button onClick={() => setStep(3)} className="btn-primary w-full mt-4">
              Continuar
            </button>
          )}
        </div>
      )}

      {/* STEP 3: Datos personales */}
      {step === 3 && (
        <div className="animate-fade-up">
          <div className="card mb-4">
            <p className="text-sm text-[#A89585]">Tu turno</p>
            <p className="font-semibold">
              {servicioSeleccionado?.nombre} · {format(new Date(fechaSeleccionada + 'T12:00:00'), "EEE d MMM", { locale: es })} · {horaSeleccionada} hs
            </p>
            <button onClick={() => setStep(2)} className="text-sm text-[#8B6F5E] hover:underline mt-1 cursor-pointer">Cambiar</button>
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
