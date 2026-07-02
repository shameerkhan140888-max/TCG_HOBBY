import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#ff7a1a',
      },
    },
  },
  plugins: [],
} satisfies Config;
