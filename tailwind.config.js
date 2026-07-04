/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      height: {
        104: "26rem",
      },
      colors: {
        ink: "#1a1a1a",
        subtle: "#6b7280",
        hairline: "#e5e7eb",
        gold: "#b8860b",
        "gold-soft": "#fdf8ec",
      },
      fontFamily: {
        display: ["system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
