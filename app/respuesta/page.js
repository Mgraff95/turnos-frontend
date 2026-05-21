'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function RespuestaContent() {
  const searchParams = useSearchParams();
  const estado = searchParams.get('estado');
  const msg = searchParams.get('msg');

  if (estado === 'confirmado') {
    return (
      <div className="card text-center animate-fade-up max-w-lg mx-auto mt-8">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#6B8F6B] mb-2">
          ¡Asistencia confirmada!
        </h2>
        <p className="text-[#A89585] mb-6">
          Gracias por confirmar. Te esperamos con todo listo. 💅
        </p>
        <a href="/" className="btn-primary inline-block">
          Volver al inicio
        </a>
      </div>
    );
  }

  if (estado === 'cancelado') {
    return (
      <div className="card text-center animate-fade-up max-w-lg mx-auto mt-8">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#8B6F5E] mb-2">
          Turno cancelado
        </h2>
        <p className="text-[#A89585] mb-6">
          Tu turno fue cancelado correctamente. ¡Esperamos verte pronto!
        </p>
        <a href="/reservar" className="btn-primary inline-block">
          Reservar otro turno
        </a>
      </div>
    );
  }

  // Estado error u otro
  return (
    <div className="card text-center animate-fade-up max-w-lg mx-auto mt-8">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#8B6F5E] mb-2">
        Algo salió mal
      </h2>
      <p className="text-[#A89585] mb-6">
        {msg ? decodeURIComponent(msg) : 'No pudimos procesar tu solicitud. El link puede haber expirado.'}
      </p>
      <a href="/" className="btn-primary inline-block">
        Volver al inicio
      </a>
    </div>
  );
}

export default function RespuestaPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-[#A89585]">Cargando...</div>}>
      <RespuestaContent />
    </Suspense>
  );
}
