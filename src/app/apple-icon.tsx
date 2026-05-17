import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #0F1F4B 0%, #0B3C5D 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <span style={{ fontSize: 88, fontWeight: 900, color: '#ffffff', letterSpacing: '-4px', lineHeight: 1 }}>
          P<span style={{ color: '#0EA5E9' }}>P</span>
        </span>
      </div>
    ),
    { ...size }
  )
}
