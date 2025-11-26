/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 🟦 Couleur Principale — Bleu Nuit Urbain (#1F3B57)
        primary: {
          50: '#e8ecf0',
          100: '#d1d9e1',
          200: '#a3b3c3',
          300: '#758da5',
          400: '#476787',
          500: '#1F3B57', // Couleur principale
          600: '#192f46',
          700: '#132335',
          800: '#0d1724',
          900: '#070b13',
        },
        // 🩶 Couleur Secondaire — Gris Acier des Tours (#A9B2BA)
        secondary: {
          50: '#f5f6f7',
          100: '#ebedef',
          200: '#d7dbdf',
          300: '#c3c9cf',
          400: '#afb7bf',
          500: '#A9B2BA', // Couleur secondaire
          600: '#878e95',
          700: '#656a70',
          800: '#43464a',
          900: '#212325',
        },
        // 🟧 Accent Chaud — Or des Lumières Intérieures (#D9A441)
        accent: {
          50: '#faf6eb',
          100: '#f5edd7',
          200: '#ebdbaf',
          300: '#e1c987',
          400: '#d7b75f',
          500: '#D9A441', // Accent chaud
          600: '#ae8334',
          700: '#836227',
          800: '#57411a',
          900: '#2c200d',
        },
        // 🟫 Accent Deuxième — Orange du Lever/Coucher de Soleil (#D47F50)
        accent2: {
          50: '#faf3ef',
          100: '#f5e7df',
          200: '#ebcfbf',
          300: '#e1b79f',
          400: '#d79f7f',
          500: '#D47F50', // Accent deuxième
          600: '#aa6640',
          700: '#804c30',
          800: '#553320',
          900: '#2b1910',
        },
        // ⚫ Neutres Profonds — Noir Urbain (#1B1B1C)
        neutral: {
          50: '#e6e6e6',
          100: '#cdcdcd',
          200: '#9b9b9b',
          300: '#696969',
          400: '#373737',
          500: '#1B1B1C', // Noir urbain
          600: '#161616',
          700: '#101010',
          800: '#0b0b0b',
          900: '#050505',
        },
        // ⚪ Neutre Clair — Gris Béton Léger (#E6E4E1)
        concrete: {
          50: '#fafaf9',
          100: '#f5f5f3',
          200: '#ebebe7',
          300: '#e1e1db',
          400: '#E6E4E1', // Gris béton léger
          500: '#b8b6b4',
          600: '#93918f',
          700: '#6e6c6a',
          800: '#494745',
          900: '#242220',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

