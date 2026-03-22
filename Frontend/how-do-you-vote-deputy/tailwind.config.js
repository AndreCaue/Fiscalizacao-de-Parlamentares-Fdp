/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        voto: {
          sim: "#22c55e",
          nao: "#ef4444",
          abstencao: "#3b82f6",
          obstrucao: "#f59e0b",
        },
        brasil: {
          verde: "#009C3B",
          amarelo: "#FFDF00",
          azul: "#002776",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
