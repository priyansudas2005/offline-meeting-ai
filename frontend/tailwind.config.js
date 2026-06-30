/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#020617', // Slate-950
        card: '#0f172a', // Slate-900
        accent: '#38bdf8', // Sky-400
        success: '#10b981', // Emerald-500
        warning: '#f59e0b', // Amber-500
        error: '#f43f5e', // Rose-500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
