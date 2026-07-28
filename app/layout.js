
import { Playfair_Display, Montserrat, Allura } from 'next/font/google';
import './globals.css';
 
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});
 
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
});
 
const allura = Allura({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-allura',
  display: 'swap',
});
 
export const metadata = {
  metadataBase: new URL('https://turnos.danielayanetbeauty.com'),
  title: 'Daniela Yanet Beauty - Reservá tu turno',
  description: 'Sistema de reservas online para el estudio de uñas @danielayanetbeauty',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon-512.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://turnos.danielayanetbeauty.com',
    siteName: 'Daniela Yanet Beauty',
    title: 'Daniela Yanet Beauty - Reservá tu turno',
    description: 'Reservá tu turno online en el estudio de uñas @danielayanetbeauty',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Daniela Yanet Beauty',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daniela Yanet Beauty - Reservá tu turno',
    description: 'Reservá tu turno online en el estudio de uñas @danielayanetbeauty',
    images: ['/og-image.jpg'],
  },
};
 
export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${playfair.variable} ${montserrat.variable} ${allura.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#FFF7FA] text-[#3A3A3A] font-[family-name:var(--font-montserrat)]">
        <header className="bg-white/90 backdrop-blur-sm border-b border-[#F5D9E4] sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/isotipo.png" alt="Daniela Yanet Beauty" className="h-10 w-auto" />
            </a>
            <nav className="flex gap-5 text-sm">
              <a href="/reservar" className="text-[#E6005C] font-medium hover:text-[#D94F8A] transition-colors">
                Reservar
              </a>
              <a href="/mistura" className="text-[#3A3A3A] hover:text-[#E6005C] transition-colors">
                Mis Turnos
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
          {children}
        </main>
        <footer className="bg-[#3A3A3A] mt-16 shrink-0">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-[#F2A7C0] tracking-wide">
            © 2026 @danielayanetbeauty · Buenos Aires
          </div>
        </footer>
      </body>
    </html>
  );
}
