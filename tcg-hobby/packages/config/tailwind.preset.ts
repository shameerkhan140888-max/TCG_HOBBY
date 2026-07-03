import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        surface: {
          ink: '#08080a',
          base: '#0d0d10',
          raised: '#151519',
          panel: '#1d1d22',
          line: '#2d2d35',
        },
        accent: {
          DEFAULT: '#ff7a1a',
          soft: '#ff9b4a',
          deep: '#c94e00',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255, 122, 26, 0.24), 0 24px 80px rgba(0, 0, 0, 0.35)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
} satisfies Partial<Config>;
