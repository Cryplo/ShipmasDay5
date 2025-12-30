/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Muted, warm golden hour palette
        'golden': {
          light: '#f5e6d3',
          DEFAULT: '#d4a574',
          dark: '#8b6914',
        },
        'dusk': {
          light: '#e8ddd4',
          DEFAULT: '#c4b5a5',
          dark: '#7a6b5a',
        },
        'shadow': {
          light: '#6b5b4a',
          DEFAULT: '#4a3f32',
          dark: '#2d261e',
        },
      },
    },
  },
  plugins: [],
}
