/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      height: {
        104: "26rem", // h-52(13rem)の2倍
      },
    },
  },
  plugins: [],
};
