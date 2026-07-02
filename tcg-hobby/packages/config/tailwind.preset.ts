import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#ff7a1a',
          ink: '#09090b',
          panel: '#111113',
        },
      },
    },
  },
} satisfies Partial<Config>;
