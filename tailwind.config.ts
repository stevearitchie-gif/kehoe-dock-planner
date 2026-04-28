import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          600: '#2551b2',
          700: '#1f428f',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
