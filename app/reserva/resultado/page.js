'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Cada cuánto y por cuánto tiempo se pregunta por el estado del pago.
// El webhook de Mercado Pago suele tardar unos segundos en llegar, y a veces
// llega incluso antes que este redirect.
const INTERVALO_MS = 2000;
const LIMITE_MS = 60000;

const fechaLocal = (f) => new Date(String(f).split('T')[0] + 'T12:00:00');

function ResultadoContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  const [estado, setEstado] = useState(null);
  const [datos, setDatos] = useState(null);
  const [seAgotoLaEspera, setSeAgotoLaEspera] = useState(false);
  const [noEncontrada, setNoEncontrada] = useState(false);

  useEffect(() => {
    if (!ref) return;

    let cancelado = false;
    let timer = null;
    const arranque = Date.now();

    const consultar = async () => {
      if (cancelado) return;
      try {
        const res = await api.get(`/api/pagos/estado/${ref}`);
        if (cancelado) return;

        setDatos(res.data);
        setEstado(res.data.estado);

        // Estados finales: no tiene sentido seguir preguntando.
        if (res.data.estado !== 'activa') return;
      } catch (err) {
        if (cancelado) return;
        if (err.response?.status === 404) {
          setNoEncontrada(true);
          return;
        }
      }

      if (Date.now() - arranque >= LIMITE_MS) {
        if (!cancelado) setSeAgotoLaEspera(true);
        return;
      }
      timer = setTimeout(consultar, INTERVALO_MS);
    };

    consultar();
    return () => { cancelado = true; if (timer) clearTimeout(timer); };
  }, [ref]);

  // Los parámetros que agrega Mercado Pago a la URL (payment_id, status...) se
  // ignoran a propósito: cualquiera puede editarlos. La verdad la da el backend,
  // que consulta el pago contra la API de MP.

  if (!ref) {
    return (
      <Tarjeta emoji="🤔" titulo="No encontramos tu reserva" color="#8A8580">
        <p className="text-[#8A8580] mb-6">
          El enlace está incompleto. Si hiciste un pago, revisá tu WhatsApp: si el turno quedó
          confirmado te llega el detalle por ahí.
        </p>
        <a href="/reservar" className="btn-primary inline-block">Reservar un turno</a>
      </Tarjeta>
    );
  }

  if (noEncontrada) {
    return (
      <Tarjeta emoji="🤔" titulo="No encontramos tu reserva" color="#8A8580">
        <p className="text-[#8A8580] mb-6">
          Puede que el enlace haya vencido. Si hiciste un pago y no recibiste el WhatsApp de
          confirmación, escribinos y lo revisamos.
        </p>
        <a href="/reservar" className="btn-primary inline-block">Reservar un turno</a>
      </Tarjeta>
    );
  }

  // ── Turno confirmado ──
  if (estado === 'completada') {
    const turnos = datos?.turnos || [];
    return (
      <Tarjeta emoji="✅" titulo="¡Tu turno está confirmado!" color="#6B8F6B">
        <div className="bg-[#FFF7FA] rounded-lg p-4 text-left mb-4">
          {datos?.fecha && (
            <p className="text-sm text-[#E6005C] font-medium mb-2">
              📅 {format(fechaLocal(datos.fecha), "EEEE d 'de' MMMM", { locale: es })}
            </p>
          )}
          {turnos.length > 0 ? (
            <div className="space-y-1">
              {turnos.map(t => (
                <p key={t.id} className="text-sm text-[#3A3A3A]">
                  ⏰ {t.hora_inicio} hs · {t.servicio}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#3A3A3A]">⏰ {datos?.hora_inicio} hs</p>
          )}
          {datos?.monto > 0 && (
            <p className="text-sm text-[#6B8F6B] font-medium mt-3">
              💳 {datos.tipo_pago === 'total'
                ? `Abonaste $${datos.monto.toLocaleString('es-AR')} — servicio completo`
                : `Seña abonada: $${datos.monto.toLocaleString('es-AR')}`}
            </p>
          )}
        </div>
        <p className="text-sm text-[#8A8580] mb-6">
          Te mandamos el detalle por WhatsApp. ¡Te esperamos! 💅
        </p>
        <a href="/mistura" className="btn-primary inline-block">Ver mis turnos</a>
      </Tarjeta>
    );
  }

  // ── El pago no se completó ──
  if (estado === 'expirada' || estado === 'cancelada') {
    return (
      <Tarjeta emoji="❌" titulo="El pago no se completó" color="#C47070">
        <p className="text-[#8A8580] mb-6">
          El horario volvió a quedar disponible. Si querés, elegilo de nuevo — o buscá otro que
          te venga mejor.
        </p>
        <a href="/reservar" className="btn-primary inline-block">Volver a reservar</a>
      </Tarjeta>
    );
  }

  // ── Conflicto: se cobró pero el horario ya estaba ocupado ──
  if (estado === 'conflicto') {
    return (
      <Tarjeta emoji="😔" titulo="No pudimos confirmar tu turno" color="#C47070">
        <p className="text-[#8A8580] mb-4">
          Ese horario se ocupó justo mientras se procesaba tu pago. <strong>Ya te devolvimos el
          dinero</strong>; puede tardar unos días en acreditarse según tu medio de pago.
        </p>
        <p className="text-sm text-[#8A8580] mb-6">Perdón por la molestia. 💗</p>
        <a href="/reservar" className="btn-primary inline-block">Elegir otro horario</a>
      </Tarjeta>
    );
  }

  // ── Todavía esperando el webhook ──
  if (seAgotoLaEspera) {
    return (
      <Tarjeta emoji="⏳" titulo="Estamos confirmando tu pago" color="#E6005C">
        <p className="text-[#8A8580] mb-4">
          Está tardando un poco más de lo normal. Si el pago se aprobó, en unos minutos te llega
          el WhatsApp con tu turno confirmado.
        </p>
        <p className="text-sm text-[#8A8580] mb-6">
          Si pasa un rato y no te llega nada, escribinos y lo resolvemos.
        </p>
        <a href="/mistura" className="btn-primary inline-block">Ver mis turnos</a>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta emoji="⏳" titulo="Confirmando tu pago..." color="#E6005C">
      <div className="flex justify-center mb-4">
        <div className="w-8 h-8 border-3 border-[#F2A7C0] border-t-[#E6005C] rounded-full animate-spin" />
      </div>
      <p className="text-[#8A8580]">Un segundo, estamos verificando el pago con Mercado Pago.</p>
    </Tarjeta>
  );
}

function Tarjeta({ emoji, titulo, color, children }) {
  return (
    <div className="card text-center animate-fade-up max-w-lg mx-auto mt-8">
      <div className="text-5xl mb-4">{emoji}</div>
      <h2
        className="font-[family-name:var(--font-playfair)] text-2xl font-bold mb-3"
        style={{ color }}
      >
        {titulo}
      </h2>
      {children}
    </div>
  );
}

export default function ResultadoPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-[#8A8580]">Cargando...</div>}>
      <ResultadoContent />
    </Suspense>
  );
}
