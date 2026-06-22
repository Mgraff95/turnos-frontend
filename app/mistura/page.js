'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MisTurnosPage() {
  const [telefono, setTelefono] = useState('');
  const [apellido, setApellido] = useState('');
  const [turnos, setTurnos] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleBuscar = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
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
      <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#8B6F5E] mb-2">
        Mis turnos
      </h2>
      <p className="text-[#A89585] mb-8">Ingresá tus datos para ver tus turnos reservados</p>

      <form onSubmit={handleBuscar} className="card mb-8 animate-fade-up">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#A89585] mb-1 block">Teléfono</label>
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
            <label className="text-sm text-[#A89585] mb-1 block">Apellido</label>
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
        <div className="text-center py-8 text-[#A89585]">
          <p className="text-4xl mb-3">📭</p>
          <p>No tenés turnos próximos</p>
          <a href="/reservar" className="text-[#8B6F5E] hover:underline text-sm mt-2 inline-block">
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
                      <span className="inline-block bg-[#F5EBDD] text-[#8B6F5E] text-xs px-2 py-0.5 rounded-full font-medium mb-2">
                        💆‍♀️ Reserva de {item.turnos.length} servicios
                      </span>
                      <p className="text-[#8B6F5E] font-medium">
                        {format(parseFecha(primero.fecha), "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                      <p className="text-[#A89585] text-sm">
                        {primero.hora_inicio} - {ultimo.hora_fin} hs
                      </p>
                    </div>
                    <span className="bg-[#E8F5E8] text-[#6B8F6B] text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                      Confirmado
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#E8DDD3] space-y-1.5">
                    {item.turnos.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <span className="text-[#A89585] w-12 shrink-0">{t.hora_inicio}</span>
                        <span className="font-medium text-[#2D2A26]">{t.servicio?.nombre}</span>
                      </div>
                    ))}
                  </div>

                  {puedeCancelar && (
                    <div className="mt-4 pt-3 border-t border-[#E8DDD3]">
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
                    <p className="font-semibold text-[#2D2A26]">{turno.servicio?.nombre}</p>
                    <p className="text-[#8B6F5E] font-medium mt-1">
                      {format(fechaTurno, "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-[#A89585] text-sm">
                      {turno.hora_inicio} - {turno.hora_fin} hs
                    </p>
                  </div>
                  <span className="bg-[#E8F5E8] text-[#6B8F6B] text-xs px-3 py-1 rounded-full font-medium">
                    Confirmado
                  </span>
                </div>
                {puedeCancelar && (
                  <div className="mt-4 pt-3 border-t border-[#E8DDD3]">
                    <button
                      onClick={() => handleCancelar(turno)}
                      className="text-sm text-[#C47070] hover:text-red-700 transition-colors cursor-pointer"
                    >
                      Cancelar turno
                    </button>
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
