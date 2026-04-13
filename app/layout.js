import { Playfair_Display, Lato } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lato',
  display: 'swap',
});

export const metadata = {
  title: 'Daniela Yanet Beauty - Reservá tu turno',
  description: 'Sistema de reservas online para el estudio de uñas @danielayanetbeauty',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${playfair.variable} ${lato.variable}`}>
      <body className="min-h-screen bg-[#FDF8F4] text-[#2D2A26] font-[family-name:var(--font-lato)]">
        <header className="bg-white/80 backdrop-blur-sm border-b border-[#E8DDD3] sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <span className="text-2xl">💅</span>
              <div>
                <h1 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#8B6F5E]">
                  Daniela Yanet
                </h1>
                <p className="text-xs text-[#A89585] tracking-widest uppercase">Beauty Studio</p>
              </div>
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/reservar" className="text-[#8B6F5E] hover:text-[#6B5344] transition-colors">
                Reservar
              </a>
              <a href="/mistura" className="text-[#8B6F5E] hover:text-[#6B5344] transition-colors">
                Mis Turnos
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-[#E8DDD3] mt-16">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-[#A89585]">
            © 2026 @danielayanetbeauty · Buenos Aires
          </div>
        </footer>
      </body>
    </html>
  );
}
