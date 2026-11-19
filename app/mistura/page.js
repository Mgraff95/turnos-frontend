
'use client';
 
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CalendarioFechas from '../components/CalendarioFechas';
 
export default function MisTurnosPage() {
  const [telefono, setTelefono] = useState('');
  const [apellido, setApellido] = useState('');
  const [turnos, setTurnos] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // ── Cambiar un turno ──
  // Fecha, hora y servicio. Si cambia el servicio puede cambiar la duracion, el
  // precio, quien atiende y los extras que siguen valiendo, asi que antes de
  // confirmar se le muestra todo eso: la cuenta la hace el backend.
  const [editando, setEditando] = useState(null);
  const [nuevoServicioId, setNuevoServicioId] = useState('');
  const [preview, setPreview] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [horariosDia, setHorariosDia] = useState([]);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Los servicios activos, para el selector. Traen su profesional, asi que se
  // pueden agrupar como en la pagina de reservar.
  const [servicios, setServicios] = useState([]);

  // Para pintar el calendario: los rangos de atencion y los dias cerrados.
  const [horariosConfig, setHorariosConfig] = useState([]);
  const [bloqueosDiaCompleto, setBloqueosDiaCompleto] = useState([]);

  useEffect(() => {
    api.get('/api/horarios')
      .then(res => setHorariosConfig(res.data || []))
      .catch(() => {});
    api.get('/api/horarios/bloques-cerrados')
      .then(res => setBloqueosDiaCompleto(
        (res.data || [])
          .filter(b => !b.hora_inicio || !b.hora_fin)
          .map(b => String(b.fecha).split('T')[0])
      ))
      .catch(() => {});
    api.get('/api/servicios')
      .then(res => setServicios(res.data || []))
      .catch(() => {});
  }, []);

  // Horarios libres del dia elegido, para el servicio ELEGIDO (que puede no ser
  // el que el turno tiene) y excluyendo este mismo turno: su propio horario no
  // puede taparse a si mismo, o cambiar de servicio dejando el mismo dia y la
  // misma hora seria imposible.
  useEffect(() => {
    if (!editando || !nuevaFecha) { setHorariosDia([]); return; }
    let cancelado = false;
    setCargandoHorarios(true);
    const servicioId = nuevoServicioId || editando.servicio_id;
    // Los extras van en el pedido porque alargan el turno: sin ellos el listado
    // mide huecos mas cortos de lo que el turno realmente dura y le ofrece
    // horarios que despues no entran. Cuando cambia el servicio, los que valen
    // son los que el servicio nuevo conserva.
    const extras = (preview ? preview.extras_conservados.map(e => e.id) : (editando.extras_ids || [])).join(',');
    api.get(`/api/turnos/disponibilidad/${nuevaFecha}/${servicioId}?excluir_turno_id=${editando.id}&token=${encodeURIComponent(editando.token_acceso)}${extras ? `&extras=${extras}` : ''}`)
      .then(res => { if (!cancelado) setHorariosDia(res.data.horarios || []); })
      .catch(() => { if (!cancelado) setHorariosDia([]); })
      .finally(() => { if (!cancelado) setCargandoHorarios(false); });
    return () => { cancelado = true; };
    // `preview` entra a propósito: si la cuenta vuelve después de que eligió la
    // fecha, los horarios hay que recalcularlos con los extras que el servicio
    // nuevo conserva, no con los del turno viejo.
  }, [editando, nuevaFecha, nuevoServicioId, preview]);

  // Que le queda si cambia el servicio. Solo se pide cuando eligio uno distinto
  // del que ya tiene.
  //
  // El preview se guarda JUNTO al id que lo pidio. Sin eso no hay forma de saber
  // si lo que esta en pantalla corresponde al servicio elegido ahora o al
  // anterior, y se puede confirmar un cambio mostrando la cuenta de otro.
  useEffect(() => {
    if (!editando || !nuevoServicioId || String(nuevoServicioId) === String(editando.servicio_id)) {
      setPreview(null);
      return;
    }
    let cancelado = false;
    const pedidoPara = String(nuevoServicioId);
    setPreview(null);
    api.get(`/api/turnos/${editando.id}/cambio-preview?token=${encodeURIComponent(editando.token_acceso)}&nuevo_servicio_id=${pedidoPara}`)
      .then(res => { if (!cancelado) setPreview({ ...res.data, _para: pedidoPara }); })
      .catch(() => { if (!cancelado) setPreview(null); });
    return () => { cancelado = true; };
  }, [editando, nuevoServicioId]);

  // ¿Lo que se ve en pantalla corresponde al servicio elegido?
  //
  // Si eligio otro servicio y el preview no volvio (o es de otro id), NO se
  // puede confirmar: el PATCH cambiaria el servicio, descartaria los extras que
  // el nuevo no ofrece y recongelaria el precio, despues de que la pantalla le
  // dijo que no cambiaba nada. Es el anti-objetivo del diseño: perder un extra
  // sin verlo.
  const cambiaDeServicio = !!editando && String(nuevoServicioId) !== String(editando.servicio_id);
  const previewAlDia = !cambiaDeServicio || (preview && preview._para === String(nuevoServicioId));

  const abrirEdicion = (turno) => {
    setEditando(turno);
    setNuevoServicioId(String(turno.servicio_id));
    setPreview(null);
    setNuevaFecha('');
    setHorariosDia([]);
    setError('');
    setMensaje('');
  };

  const cerrarEdicion = () => {
    setEditando(null);
    setNuevoServicioId('');
    setPreview(null);
    setNuevaFecha('');
    setHorariosDia([]);
  };

  const confirmarCambio = async (hora) => {
    setGuardando(true);
    setError('');
    try {
      await api.patch(`/api/turnos/${editando.id}`, {
        token: editando.token_acceso,
        nueva_fecha: nuevaFecha,
        nueva_hora_inicio: hora,
        nuevo_servicio_id: nuevoServicioId || editando.servicio_id
      });
      cerrarEdicion();
      setMensaje('Listo, cambiamos tu turno. Te mandamos la confirmación por WhatsApp.');
      await buscarTurnos();
    } catch (err) {
      setError(err.response?.data?.error || 'No pudimos cambiar el turno. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };
 
  // La busqueda en si, sin el submit: tambien se usa para refrescar despues de
  // cancelar o cambiar un turno.
  const buscarTurnos = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/turnos/mistura/${telefono}/${apellido}`);
      setTurnos(res.data);
      setBuscado(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al buscar turnos');
      setTurnos([]);
      setBuscado(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    await buscarTurnos();
  };
 
  // Agrupa los turnos: los que comparten grupo_reserva se muestran como un solo bloque.
  // Mantiene el orden cronológico que ya viene del backend (fecha asc, hora asc).
  const agruparTurnos = (lista) => {
    const indiceGrupo = {};
    const resultado = [];
    for (const t of lista) {
      if (t.grupo_reserva) {
        if (indiceGrupo[t.grupo_reserva] === undefined) {
          indiceGrupo[t.grupo_reserva] = resultado.length;
          resultado.push({ tipo: 'grupo', grupo_reserva: t.grupo_reserva, turnos: [t] });
        } else {
          resultado[indiceGrupo[t.grupo_reserva]].turnos.push(t);
        }
      } else {
        resultado.push({ tipo: 'simple', turno: t });
      }
    }
    // Ordenar los sub-turnos de cada bloque por su orden dentro del grupo
    for (const item of resultado) {
      if (item.tipo === 'grupo') {
        item.turnos.sort((a, b) => (a.orden_en_grupo || 0) - (b.orden_en_grupo || 0));
      }
    }
    return resultado;
  };
 
  // Parsea la fecha de la DB ("YYYY-MM-DD..." en UTC) anclándola al mediodía local,
  // para que Argentina (UTC-3) no retroceda un día al formatear.
  const parseFecha = (fecha) => new Date(fecha.split('T')[0] + 'T12:00:00');
 
  const puedeCancelarTurno = (turno) => {
    const ahora = new Date();
    const turnoDateTime = new Date(`${turno.fecha.split('T')[0]}T${turno.hora_inicio}`);
    return (turnoDateTime - ahora) / (1000 * 60 * 60) >= 24;
  };
 
  const handleCancelar = async (turno) => {
    if (!confirm(`¿Segura que querés cancelar tu turno del ${format(parseFecha(turno.fecha), "d/MM", { locale: es })} a las ${turno.hora_inicio}?`)) return;
 
    setError('');
    try {
      await api.delete(`/api/turnos/${turno.id}`, {
        data: { token: turno.token_acceso }
      });
      setMensaje('Turno cancelado correctamente');
      setTurnos(prev => prev.filter(t => t.id !== turno.id));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cancelar');
    }
  };
 
  // Cancela un bloque completo: el backend cancela todos los turnos del grupo
  // al recibir el delete de cualquiera de ellos.
  const handleCancelarGrupo = async (grupo) => {
    const primero = grupo.turnos[0];
    const nombres = grupo.turnos.map(t => t.servicio?.nombre).join(' + ');
    if (!confirm(`¿Segura que querés cancelar tu reserva del ${format(parseFecha(primero.fecha), "d/MM", { locale: es })} (${nombres})? Se cancelan todos los servicios del bloque.`)) return;
 
    setError('');
    try {
      await api.delete(`/api/turnos/${primero.id}`, {
        data: { token: primero.token_acceso }
      });
      setMensaje('Reserva cancelada correctamente');
      setTurnos(prev => prev.filter(t => t.grupo_reserva !== grupo.grupo_reserva));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cancelar');
    }
  };
 
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#E6005C] mb-2">
        Mis turnos
      </h2>
      <p className="text-[#8A8580] mb-8">Ingresá tus datos para ver tus turnos reservados</p>
 
      <form onSubmit={handleBuscar} className="card mb-8 animate-fade-up">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#8A8580] mb-1 block">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="1123456789"
              className="input-field"
              maxLength={10}
              required
            />
          </div>
          <div>
            <label className="text-sm text-[#8A8580] mb-1 block">Apellido</label>
            <input
              type="text"
              value={apellido}
              onChange={e => setApellido(e.target.value)}
              placeholder="Tu apellido"
              className="input-field"
              required
            />
          </div>
          <button
            type="submit"
            disabled={telefono.length !== 10 || !apellido || loading}
            className="btn-primary w-full"
          >
            {loading ? 'Buscando...' : 'Buscar mis turnos'}
          </button>
        </div>
      </form>
 
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}
 
      {mensaje && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-6 text-sm">
          {mensaje}
        </div>
      )}
 
      {buscado && turnos.length === 0 && !error && (
        <div className="text-center py-8 text-[#8A8580]">
          <p className="text-4xl mb-3">📭</p>
          <p>No tenés turnos próximos</p>
          <a href="/reservar" className="text-[#E6005C] hover:underline text-sm mt-2 inline-block">
            Reservar uno nuevo
          </a>
        </div>
      )}
 
      {turnos.length > 0 && (
        <div className="space-y-4">
          {agruparTurnos(turnos).map(item => {
            // ── Bloque de varios servicios (reserva múltiple) ──
            if (item.tipo === 'grupo') {
              const primero = item.turnos[0];
              const ultimo = item.turnos[item.turnos.length - 1];
              const puedeCancelar = puedeCancelarTurno(primero);
              return (
                <div key={item.grupo_reserva} className="card animate-fade-up">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block bg-[#FCE9F0] text-[#E6005C] text-xs px-2 py-0.5 rounded-full font-medium mb-2">
                        💆‍♀️ Reserva de {item.turnos.length} servicios
                      </span>
                      <p className="text-[#E6005C] font-medium">
                        {format(parseFecha(primero.fecha), "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                      <p className="text-[#8A8580] text-sm">
                        {primero.hora_inicio} - {ultimo.hora_fin} hs
                      </p>
                    </div>
                    <span className="bg-[#E8F5E8] text-[#6B8F6B] text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                      Confirmado
                    </span>
                  </div>
 
                  <div className="mt-3 pt-3 border-t border-[#F5D9E4] space-y-1.5">
                    {item.turnos.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <span className="text-[#8A8580] w-12 shrink-0">{t.hora_inicio}</span>
                        <span className="font-medium text-[#3A3A3A]">{t.servicio?.nombre}</span>
                      </div>
                    ))}
                  </div>
 
                  {puedeCancelar && (
                    <div className="mt-4 pt-3 border-t border-[#F5D9E4]">
                      <button
                        onClick={() => handleCancelarGrupo(item)}
                        className="text-sm text-[#C47070] hover:text-red-700 transition-colors cursor-pointer"
                      >
                        Cancelar reserva completa
                      </button>
                    </div>
                  )}
                </div>
              );
            }
 
            // ── Turno simple (1 servicio) ──
            const turno = item.turno;
            const fechaTurno = parseFecha(turno.fecha);
            const puedeCancelar = puedeCancelarTurno(turno);
 
            return (
              <div key={turno.id} className="card animate-fade-up">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[#3A3A3A]">{turno.servicio?.nombre}</p>
                    <p className="text-[#E6005C] font-medium mt-1">
                      {format(fechaTurno, "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-[#8A8580] text-sm">
                      {turno.hora_inicio} - {turno.hora_fin} hs
                    </p>
                  </div>
                  <span className="bg-[#E8F5E8] text-[#6B8F6B] text-xs px-3 py-1 rounded-full font-medium">
                    Confirmado
                  </span>
                </div>
                {puedeCancelar && editando?.id !== turno.id && (
                  <div className="mt-4 pt-3 border-t border-[#F5D9E4] flex items-center gap-4">
                    <button
                      onClick={() => abrirEdicion(turno)}
                      className="text-sm text-[#E6005C] hover:underline transition-colors cursor-pointer"
                    >
                      Cambiar turno
                    </button>
                    <button
                      onClick={() => handleCancelar(turno)}
                      className="text-sm text-[#C47070] hover:text-red-700 transition-colors cursor-pointer"
                    >
                      Cancelar turno
                    </button>
                  </div>
                )}

                {editando?.id === turno.id && (
                  <div className="mt-4 pt-4 border-t border-[#F5D9E4] animate-fade-up">
                    {!nuevaFecha ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium text-[#3A3A3A]">Elegí el servicio y la fecha</p>
                          <button onClick={cerrarEdicion} className="text-xs text-[#8A8580] hover:underline cursor-pointer">Cancelar</button>
                        </div>

                        {/* El servicio se puede cambiar. Si elige otro, la cuenta
                            de lo que le queda la hace el backend y se muestra
                            abajo: la duración, el precio, quién la atiende y los
                            extras que no siguen valiendo. */}
                        <label className="text-xs text-[#8A8580] mb-1 block">Servicio</label>
                        <select
                          value={nuevoServicioId}
                          onChange={e => { setNuevoServicioId(e.target.value); setHorariosDia([]); }}
                          className="w-full mb-3 px-3 py-2 rounded-xl border border-[#F5D9E4] text-sm text-[#3A3A3A] bg-white"
                        >
                          {Object.entries(
                            servicios.reduce((acc, s) => {
                              const nombre = s.profesional?.nombre || 'Otros';
                              (acc[nombre] = acc[nombre] || []).push(s);
                              return acc;
                            }, {})
                          ).map(([nombreProf, lista]) => (
                            <optgroup key={nombreProf} label={nombreProf}>
                              {lista.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.nombre} · {s.duracion_minutos}min · ${Number(s.precio_pesos).toLocaleString('es-AR')}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        {preview && (
                          <div className="mb-3 rounded-xl bg-[#FDF4F8] px-3 py-2 text-xs text-[#6B6560] space-y-1">
                            <p>Te queda: <span className="font-medium text-[#3A3A3A]">{preview.duracion_minutos} min · ${Number(preview.precio).toLocaleString('es-AR')}</span></p>
                            {String(preview.profesional.id) !== String(turno.profesional_id) && (
                              <p>Te va a atender <span className="font-medium text-[#3A3A3A]">{preview.profesional.nombre}</span>.</p>
                            )}
                            {preview.extras_descartados.length > 0 && (
                              <p className="text-[#C47070]">
                                Con este servicio no van: {preview.extras_descartados.map(e => e.nombre).join(', ')}.
                              </p>
                            )}
                          </div>
                        )}

                        <CalendarioFechas
                          rangos={horariosConfig.filter(h => h.profesional_id === (preview ? preview.profesional.id : turno.profesional_id))}
                          bloqueosDiaCompleto={bloqueosDiaCompleto}
                          onElegir={setNuevaFecha}
                        />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-[#3A3A3A] capitalize">
                              {format(new Date(nuevaFecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                            </p>
                            <p className="text-xs text-[#8A8580]">Elegí el horario</p>
                          </div>
                          <button onClick={() => setNuevaFecha('')} className="text-xs text-[#E6005C] hover:underline cursor-pointer">Cambiar fecha</button>
                        </div>

                        {cargandoHorarios ? (
                          <p className="text-sm text-[#8A8580] py-3">Buscando horarios...</p>
                        ) : horariosDia.length === 0 ? (
                          <p className="text-sm text-[#8A8580] py-3">
                            No quedan horarios libres ese día. Probá con otra fecha.
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {horariosDia.map(h => (
                              <button
                                key={h.hora_inicio}
                                onClick={() => confirmarCambio(h.hora_inicio)}
                                disabled={guardando || !previewAlDia}
                                className="py-2 rounded-lg text-sm font-medium bg-white border border-[#F5D9E4] text-[#3A3A3A] hover:border-[#E6005C] hover:bg-[#FDEFF5] cursor-pointer disabled:opacity-40 disabled:cursor-default"
                              >
                                {h.hora_inicio}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* La nota nunca puede decir "queda igual" cuando eligió
                            otro servicio: mientras la cuenta no esté, no se
                            puede confirmar y se dice por qué. */}
                        <p className="text-xs text-[#8A8580] mt-3">
                          {!previewAlDia
                            ? 'Estamos calculando cómo te queda el turno con ese servicio…'
                            : <>
                                Tocá un horario para confirmar el cambio.
                                {preview
                                  ? ` Te queda ${preview.servicio.nombre} · ${preview.duracion_minutos} min · $${Number(preview.precio).toLocaleString('es-AR')}.`
                                  : ' El servicio y los extras quedan igual.'}
                              </>}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
 
