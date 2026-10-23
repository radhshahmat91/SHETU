// Colours are CSS variables (see src/index.css) so light and dark themes share one set of class names.
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: v('surface'),
        sunken: v('sunken'),
        ink: v('ink'),
        mute: v('mute'),
        line: v('line'),
        river: v('river'),
        stamp: v('stamp'),
        brand: { 50: v('g50'), 100: v('g100'), 200: v('g200'), 300: v('g300'), 400: v('g400'), 500: v('g500'), 600: v('g600'), 700: v('g700'), 800: v('g800'), 900: v('g900') },
        marigold: { 300: '#f8d26a', 400: '#f7b928', 500: '#f2a900', 600: '#c98500' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
        sans: ['"Hind Siliguri"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 24px 60px -20px rgb(0 0 0 / .4)',
        ring: '0 0 0 4px rgb(var(--g500) / .18)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        ring: { '0%': { transform: 'rotate(0)' }, '15%': { transform: 'rotate(14deg)' }, '30%': { transform: 'rotate(-12deg)' }, '45%': { transform: 'rotate(8deg)' }, '60%': { transform: 'rotate(-4deg)' }, '100%': { transform: 'rotate(0)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-6px)' }, '40%,80%': { transform: 'translateX(6px)' } },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        ring: 'ring 1s ease-in-out',
        shake: 'shake .4s ease-in-out',
      },
    },
  },
  plugins: [],
};
