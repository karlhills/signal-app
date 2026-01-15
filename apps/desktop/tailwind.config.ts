import type { Config } from 'tailwindcss';

export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Source Sans 3"', 'sans-serif']
      },
      colors: {
        ink: '#0f172a',
        mist: '#eef2f7',
        cloud: '#f8fafc',
        moss: '#0f766e',
        amber: '#f59e0b',
        ember: '#ef4444',
        blurple: '#4338ca'
      }
    }
  },
  plugins: []
} satisfies Config;
