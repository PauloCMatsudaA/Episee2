/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nomes curtos e diretos
        brand:    '#F97316',   // laranja principal
        'brand-h':'#EA580C',   // hover do laranja
        'brand-l':'#FFF7ED',   // laranja claro (fundo)
        dark:     '#0F172A',   // fundo sidebar/nav
        'dark-c': '#1E293B',   // cards escuros
        'dark-h': '#334155',   // hover escuro
        light:    '#F1F5F9',   // fundo geral
        ok:       '#22C55E',   // conforme / verde
        err:      '#EF4444',   // não conforme / vermelho
        warn:     '#EAB308',   // pendente / amarelo
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
