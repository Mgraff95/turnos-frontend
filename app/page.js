export default function Home() {
  return (
    <div className="text-center py-16 animate-fade-up">
      <div className="mb-8">
        <span className="text-6xl">💅</span>
      </div>
      <h2 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#8B6F5E] mb-4">
        Bienvenida a tu espacio
      </h2>
      <p className="text-[#A89585] text-lg mb-12 max-w-md mx-auto">
        Reservá tu turno online de forma rápida y sencilla.
        Sin llamadas, sin esperas.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/reservar" className="btn-primary text-center inline-block">
          Reservar turno
        </a>
        <a
          href="/mistura"
          className="px-6 py-3 border border-[#E8DDD3] rounded-lg text-[#8B6F5E] hover:bg-white transition-colors text-center inline-block"
        >
          Ver mis turnos
        </a>
      </div>
    </div>
  );
}
