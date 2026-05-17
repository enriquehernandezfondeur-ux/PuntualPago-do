import type { Metadata } from 'next'
import './globals.css'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puntualpago.do'

export const metadata: Metadata = {
  title: {
    default: 'PuntualPago — Alquiler Garantizado en RD',
    template: '%s | PuntualPago',
  },
  description: 'Cobra tu alquiler el 1 de cada mes aunque el inquilino no pague. Administración profesional de propiedades en República Dominicana.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type:        'website',
    locale:      'es_DO',
    url:         BASE_URL,
    siteName:    'PuntualPago',
    title:       'PuntualPago — Alquiler Garantizado en RD',
    description: 'Cobra tu alquiler el 1 de cada mes aunque el inquilino no pague. Administración profesional de propiedades en República Dominicana.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PuntualPago — Alquiler Garantizado' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'PuntualPago — Alquiler Garantizado en RD',
    description: 'Cobra tu alquiler el 1 de cada mes aunque el inquilino no pague.',
    images:      ['/og-image.png'],
  },
  icons: { icon: '/favicon.ico' },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Google Fonts — Almarai (primary) + DM Serif Display (accent headlines) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {/* Avoid dark mode flash on load */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('pp-theme');
            var d = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
