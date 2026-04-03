/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        city: {
          bg: '#060d1f',
          card: '#0a1628',
          border: '#1a3050',
          cyan: '#00d4ff',
          green: '#00e676',
          yellow: '#ffb300',
          red: '#ff1744',
          orange: '#ff6d00',
          blue: '#2979ff',
          purple: '#d500f9',
        },
      },
      animation: {
        pulse_slow: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        fadeIn: 'fadeIn 0.5s ease-in',
        slideUp: 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}

