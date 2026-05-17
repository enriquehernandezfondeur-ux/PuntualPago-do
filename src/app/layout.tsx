import type { Metadata } from 'next'
import './globals.css'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puntualpago.do'
const TITLE       = 'PuntualPago — Alquiler Garantizado en República Dominicana'
const DESCRIPTION = 'Recibe tu renta el 1 de cada mes, aunque el inquilino no pague. Administración profesional de propiedades en República Dominicana. Garantía total, cero estrés.'

export const metadata: Metadata = {
  title: {
    default:  TITLE,
    template: '%s | PuntualPago',
  },
  description: DESCRIPTION,
  keywords: [
    'alquiler garantizado República Dominicana',
    'administración de propiedades RD',
    'administradora de alquileres Santo Domingo',
    'garantía de renta dominicana',
    'gestión de alquileres RD',
    'cobro de alquiler garantizado',
    'propiedades en alquiler Santo Domingo',
    'administración inmobiliaria República Dominicana',
    'PuntualPago',
  ],
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: BASE_URL },
  openGraph: {
    type:        'website',
    locale:      'es_DO',
    url:         BASE_URL,
    siteName:    'PuntualPago',
    title:       TITLE,
    description: DESCRIPTION,
    // opengraph-image.tsx auto-detected by Next.js — no static URL needed
  },
  twitter: {
    card:        'summary_large_image',
    site:        '@puntualpago',
    title:       TITLE,
    description: DESCRIPTION,
    // opengraph-image.tsx also used for Twitter card
  },
  icons: {
    icon:     '/icon',        // Next.js auto-serves icon.tsx as /icon
    apple:    '/apple-icon',  // Next.js auto-serves apple-icon.tsx as /apple-icon
    shortcut: '/icon',
  },
  manifest: '/manifest.json',
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id':   `${BASE_URL}/#organization`,
      name:    'PuntualPago',
      url:     BASE_URL,
      logo:    { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
      description: DESCRIPTION,
      address: {
        '@type':           'PostalAddress',
        addressLocality:   'Santo Domingo',
        addressCountry:    'DO',
      },
      contactPoint: {
        '@type':       'ContactPoint',
        contactType:   'customer service',
        telephone:     '+1-829-548-1998',
        email:         'contacto@puntualpago.do',
        availableLanguage: 'Spanish',
      },
      sameAs: ['https://www.instagram.com/puntualpago/'],
    },
    {
      '@type':       'LocalBusiness',
      '@id':         `${BASE_URL}/#business`,
      name:          'PuntualPago',
      url:           BASE_URL,
      description:   DESCRIPTION,
      priceRange:    '$$',
      address: {
        '@type':         'PostalAddress',
        addressLocality: 'Santo Domingo',
        addressCountry:  'DO',
      },
      areaServed: { '@type': 'Country', name: 'República Dominicana' },
    },
    {
      '@type': 'WebSite',
      '@id':   `${BASE_URL}/#website`,
      url:     BASE_URL,
      name:    'PuntualPago',
      publisher: { '@id': `${BASE_URL}/#organization` },
      inLanguage: 'es-DO',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name:    '¿Cómo funciona la garantía de cobro?',
          acceptedAnswer: { '@type': 'Answer', text: 'El primero de cada mes PuntualPago deposita la renta al propietario, sin importar si el inquilino pagó o no. Nosotros asumimos el riesgo de cobro y gestionamos el proceso de recuperación directamente con el inquilino. El propietario no tiene que hacer nada.' },
        },
        {
          '@type': 'Question',
          name:    '¿Cuánto tiempo tarda en activarse?',
          acceptedAnswer: { '@type': 'Answer', text: 'En menos de 24 horas tu propiedad está activa en la plataforma. El proceso incluye verificación de datos, firma digital del contrato y activación de la garantía.' },
        },
        {
          '@type': 'Question',
          name:    '¿Puedo administrar más de una propiedad?',
          acceptedAnswer: { '@type': 'Answer', text: 'Sí. La plataforma está diseñada para gestionar desde una propiedad individual hasta carteras corporativas. Tienes acceso a un panel centralizado con todas tus propiedades.' },
        },
        {
          '@type': 'Question',
          name:    '¿Qué pasa si vivo fuera de República Dominicana?',
          acceptedAnswer: { '@type': 'Answer', text: 'Es precisamente para eso que existe PuntualPago. Puedes gestionar todo desde el extranjero: ver el estado en tiempo real, recibir pagos y comunicarte con el equipo sin necesidad de estar presente.' },
        },
        {
          '@type': 'Question',
          name:    '¿Cómo se evalúa a los inquilinos?',
          acceptedAnswer: { '@type': 'Answer', text: 'Realizamos un análisis de perfil que incluye historial de referencias, capacidad financiera y otros indicadores relevantes. Esto reduce significativamente el riesgo de impago antes de firmar.' },
        },
        {
          '@type': 'Question',
          name:    '¿Cuál es el costo del servicio?',
          acceptedAnswer: { '@type': 'Answer', text: 'PuntualPago cobra una comisión de gestión mensual sobre la renta administrada. Contacta nuestro equipo para obtener una propuesta personalizada según el tamaño de tu cartera.' },
        },
      ],
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        {/* Google Fonts */}
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
