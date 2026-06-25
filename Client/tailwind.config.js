export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        
        brand:    '#F97316',   
        'brand-h':'#EA580C',   
        'brand-l':'#FFF7ED',   
        dark:     '#0F172A',   
        'dark-c': '#1E293B',   
        'dark-h': '#334155',   
        light:    '#F1F5F9',   
        ok:       '#22C55E',   
        err:      '#EF4444',   
        warn:     '#EAB308',   
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
