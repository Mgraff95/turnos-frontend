export default function Home() {
  return (
    <div className="text-center py-16 animate-fade-up">
      <div className="mb-8">
        <img src="/logo.svg" alt="Daniela Yanet Beauty" className="h-20 w-auto mx-auto" />
      </div>
      <p className="text-[#A89585] text-lg mb-12 max-w-md mx-auto">
        Reservá tu turno online de forma rápida y sencilla.
        Sin llamadas, sin esperas.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/reservar" className="btn-primary text-center inline-block">
          Reservar turno
        </a>
        
          href="/mistura"
          className="px-6 py-3 border border-[#E8DDD3] rounded-lg text-[#8B6F5E] hover:bg-white transition-colors text-center inline-block"
        >
          Ver mis turnos
        </a>
      </div>
    </div>
  );
}