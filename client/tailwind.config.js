/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mtg: {
          white: '#F8F6E3',
          blue: '#0E68AB',
          black: '#150B00',
          red: '#D3202A',
          green: '#00733E',
          colorless: '#CAC5C0',
          mythic: '#F8991C',
          rare: '#D5B45A',
          uncommon: '#A8B0B8',
          common: '#1A1718',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Cinzel"', 'serif'],
      },
      boxShadow: {
        card: '0 10px 30px -10px rgba(0,0,0,0.5)',
        glow: '0 0 25px rgba(248, 153, 28, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        shimmer: 'shimmer 1.5s linear infinite',
        'orbit-slow': 'orbit 2.4s linear infinite',
        'pulse-ring': 'pulseRing 1.8s ease-out infinite',
        'rise-in': 'riseIn 0.6s ease-out both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.6)', opacity: 0.6 },
          '100%': { transform: 'scale(1.6)', opacity: 0 },
        },
        riseIn: {
          '0%': { opacity: 0, transform: 'translateY(20px) scale(0.96)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
