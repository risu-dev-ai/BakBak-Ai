/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ── BakBak Gemini-Inspired Dark Glassmorphism Palette ────────────────────────
      colors: {
        primary: {
          50:  '#e0f7fa',
          100: '#b2ebf2',
          200: '#80deea',
          300: '#4dd0e1',
          400: '#26c6da',
          500: 'var(--wa-green)',
          600: '#00b8d4',
          700: '#00838f',
          800: '#006064',
          900: '#004d40',
          950: '#002d2d',
        },
        wa: {
          teal:      'var(--wa-teal)',
          'teal-dark': 'var(--wa-teal-dark)',
          green:     'var(--wa-green)',
          light:     'var(--wa-light)',
          blue:      'var(--wa-blue)',
          bg:        'var(--wa-bg)',
          header:    'var(--wa-header)',
          input:     'var(--wa-input-bg)',
        },
        online:  'var(--wa-green)',
        offline: '#374151',
        away:    '#f59e0b',
        missed:  '#f87171',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.05)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.3s ease-out',
      },

      boxShadow: {
        'wa': '0 4px 30px rgba(0, 0, 0, 0.4)',
        'wa-md': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'wa-lg': '0 12px 40px rgba(0, 0, 0, 0.6)',
        'glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'glass-glow': '0 0 15px rgba(0, 229, 255, 0.15)',
      },
    },
  },
  plugins: [],
}
