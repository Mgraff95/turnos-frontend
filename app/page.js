export default function Home() {
  return (
    <div className="text-center py-16 animate-fade-up">
      <div className="mb-4">
        <img src="/logo.png" alt="Daniela Yanet Beauty Artist" className="h-28 w-auto mx-auto" />
      </div>
      <p className="font-accent text-3xl mb-10">
        Belleza que realza tu esencia
      </p>
      <p className="text-[#8A8580] text-lg mb-12 max-w-md mx-auto">
        Reservá tu turno online de forma rápida y sencilla. Sin llamadas, sin esperas.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/reservar" className="btn-primary text-center inline-block">
          Reservar turno
        </a>
        <a href="/mistura" className="px-6 py-3 border border-[#F5D9E4] rounded-full text-[#3A3A3A] hover:bg-white transition-colors text-center inline-block">
          Ver mis turnos
        </a>
      </div>
    </div>
  );
}
