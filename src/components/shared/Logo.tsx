'use client'

/**
 * Logo PuntualPago — SVG inline, sin fondo, sin dependencia de fuentes externas.
 * variant="color"  → navy + azul (para fondos claros)
 * variant="white"  → blanco + azul (para fondos oscuros como sidebar y login)
 */

interface LogoProps {
  variant?: 'color' | 'white'
  width?: number
  className?: string
}

export function Logo({ variant = 'color', width = 180, className = '' }: LogoProps) {
  const navy = variant === 'white' ? '#FFFFFF' : '#1D2D5B'
  const blue = '#29A8E0'
  const h    = Math.round(width * 0.24)   // mantener proporción ~4.2:1

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 480 115"
      width={width}
      height={h}
      className={className}
      aria-label="PuntualPago"
      fill="none"
    >
      {/* ── Tipografía PUNTUAL (condensed bold italic) ── */}
      <text
        x="6" y="82"
        fontFamily="'Arial Narrow','Arial','Helvetica Neue',Helvetica,sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="72"
        fill={navy}
        letterSpacing="0"
      >
        PUNTUAL
      </text>

      {/* ── Arco del reloj — casi completo, abierto abajo-izquierda ── */}
      {/*  cx=270, cy=53, r=44  →  apertura en ~195° a ~165° (gap a la izquierda) */}
      <path
        d="M 228 62 A 44 44 0 1 1 227 44"
        stroke={blue}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Manecilla / flecha dentro del círculo ── */}
      {/* Forma de vela/aguja: base ancha abajo, punta arriba a las 12-1 */}
      <path
        d="M 270 10 L 256 60 L 270 53 L 284 60 Z"
        fill={navy}
      />

      {/* ── Banda PAGO — paralelogramo azul ── */}
      <path
        d="M 296 22 L 474 22 L 474 82 L 296 82 L 308 52 Z"
        fill={blue}
      />

      {/* ── Texto PAGO ── */}
      <text
        x="318" y="71"
        fontFamily="'Arial Narrow','Arial','Helvetica Neue',Helvetica,sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="42"
        fill="#FFFFFF"
        letterSpacing="4"
      >
        PAGO
      </text>
    </svg>
  )
}
