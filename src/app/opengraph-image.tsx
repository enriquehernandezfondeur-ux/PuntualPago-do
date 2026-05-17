import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const alt         = 'PuntualPago — Alquiler Garantizado en República Dominicana'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #0F1F4B 60%, #0B3C5D 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 88px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative circle top-right */}
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 480, height: 480,
          borderRadius: '50%',
          background: 'rgba(14,165,233,0.08)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 280, height: 280,
          borderRadius: '50%',
          border: '1px solid rgba(14,165,233,0.15)',
          display: 'flex',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 56 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#0EA5E9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginRight: 16,
          }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#ffffff' }}>P</span>
          </div>
          <span style={{ fontSize: 34, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            Puntual<span style={{ color: '#0EA5E9' }}>Pago</span>
          </span>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: 68,
          fontWeight: 900,
          color: '#ffffff',
          lineHeight: 1.05,
          letterSpacing: '-2.5px',
          marginBottom: 28,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <span>Alquiler</span>
          <span>Garantizado en</span>
          <span style={{ color: '#0EA5E9' }}>República Dominicana.</span>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(14,165,233,0.15)',
            border: '1px solid rgba(14,165,233,0.3)',
            padding: '14px 28px',
            borderRadius: 100,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: '#ffffff' }}>
              El 1 de cada mes, tu renta. Siempre.
            </span>
          </div>
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            puntualpago.do
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
