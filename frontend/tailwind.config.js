/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        severity: {
          critical: { light: "#ef4444", dark: "#dc2626" },
          high: { light: "#f97316", dark: "#ea580c" },
          medium: { light: "#eab308", dark: "#ca8a04" },
          low: { light: "#3b82f6", dark: "#1d4ed8" },
        },
      },
    },
  },
  plugins: [],
};
