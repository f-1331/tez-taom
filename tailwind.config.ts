import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#C92A1C',
          'red-dark': '#A32014',
          'red-light': '#FF7262',
          yellow: '#FFC93C',
          'yellow-hover': '#E5B434',
          text: '#231815',
          bg: '#FFFFFF',
          'bg-muted': '#F5F2EF',
          'receipt-bg': '#FAF8F5',
        },
      },
      fontFamily: {
        display: ['var(--font-unbounded)', 'sans-serif'],
        sans: ['var(--font-onest)', 'sans-serif'],
      },
      boxShadow: {
        receipt: '0 4px 20px -2px rgba(35, 24, 21, 0.08), 0 2px 6px -1px rgba(35, 24, 21, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
