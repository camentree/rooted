/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(250, 250, 250)",
          dark: "rgb(35, 35, 35)",
        },
        secondary: {
          DEFAULT: "rgb(230, 230, 230)",
          dark: "rgb(49, 49, 49)",
        },
        sidebar: {
          DEFAULT: "rgb(218, 218, 218)",
          dark: "rgb(30, 30, 33)",
        },
        textPrimary: {
          DEFAULT: "black",
          dark: "white",
        },
        textSecondary: {
          DEFAULT: "gray-500",
          dark: "gray-500",
        },
        textSidebar: {
          DEFAULT: "rgb(50, 50, 50)",
          dark: "rgb(180, 180, 180)",
        },
      },
      animation: {
        "spin-slow": "spin 1.7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
