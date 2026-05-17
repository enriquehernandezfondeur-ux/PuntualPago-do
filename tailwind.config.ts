import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Design System ─────────────────────────────────────
        surface: 'var(--surface)',
        border:  'var(--border)',

        // ── Brand reference ───────────────────────────────────
        brand: {
          primary:   '#0B3C5D',
          secondary: '#4A90E2',
        },

        // ── Semantic status palette (soft, elegant) ───────────
        status: {
          green:        '#12B76A',
          'green-bg':   '#ECFDF3',
          'green-text': '#027A48',
          'green-border':'#A6F4C5',

          yellow:        '#F79009',
          'yellow-bg':   '#FFFAEB',
          'yellow-text': '#B54708',
          'yellow-border':'#FEF0C7',

          orange:        '#EF6820',
          'orange-bg':   '#FFF6ED',
          'orange-text': '#B93815',
          'orange-border':'#FDDCAB',

          red:        '#F04438',
          'red-bg':   '#FEF3F2',
          'red-text': '#B42318',
          'red-border':'#FECDCA',

          purple:        '#7F56D9',
          'purple-bg':   '#F9F5FF',
          'purple-text': '#6941C6',
          'purple-border':'#E9D7FE',

          blue:        '#1570EF',
          'blue-bg':   '#EFF8FF',
          'blue-text': '#175CD3',
          'blue-border':'#B2DDFF',

          gray:        '#667085',
          'gray-bg':   '#F9FAFB',
          'gray-text': '#344054',
          'gray-border':'#E4E7EC',
        },

        // ── Sidebar (unchanged dark) ───────────────────────────
        sidebar: {
          bg:         '#0f172a',
          hover:      '#1e293b',
          active:     '#1e3a8a',
          border:     '#1e293b',
          text:       '#94a3b8',
          textActive: '#f1f5f9',
        },
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      borderRadius: {
        lg:  'var(--radius)',
        md:  'calc(var(--radius) - 2px)',
        sm:  'calc(var(--radius) - 4px)',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },

      boxShadow: {
        'xs':  '0 1px 2px 0 rgba(16,24,40,0.05)',
        'sm':  '0 1px 3px 0 rgba(16,24,40,0.10), 0 1px 2px -1px rgba(16,24,40,0.10)',
        'md':  '0 4px 6px -1px rgba(16,24,40,0.08), 0 2px 4px -2px rgba(16,24,40,0.08)',
        'subtle': '0 0 0 1px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.08)',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.18s ease-out',
        'slide-in':       'slide-in 0.18s ease-out',
        'pulse-dot':      'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
