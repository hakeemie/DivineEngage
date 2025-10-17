/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkblue: "#0b1020",
        accent: "#4c6ef5",
        cardbg: "#11172a",
        textlight: "#e2e8f0",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 10px rgba(76, 110, 245, 0.5)",
      },
    },
  },
  plugins: [],
};
