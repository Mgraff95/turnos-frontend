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

  const handleCancelar = async (turno) => {
    if (!confirm(`¿Segura que querés cancelar tu turno del ${format(new Date(turno.fecha), "d/MM", { locale: es })} a las ${turno.hora_inicio}?`)) return;

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
          {turnos.map(turno => {
            const fechaTurno = new Date(turno.fecha);
            const ahora = new Date();
            const turnoDateTime = new Date(`${turno.fecha.split('T')[0]}T${turno.hora_inicio}`);
            const horasRestantes = (turnoDateTime - ahora) / (1000 * 60 * 60);
            const puedeCancelar = horasRestantes >= 24;

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
