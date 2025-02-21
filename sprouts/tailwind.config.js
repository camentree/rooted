/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        chatBg: "rgb(35, 35, 35)",
        chatBubbleUser: "rgb(49, 49, 49)",
        topbarBg: "rgb(49, 49, 49)",
        inputBg: "rgb(49, 49, 49)",
        sidebarBg: "rgb(30, 30, 33)",
      },
      animation: {
        "spin-slow": "spin 1.7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
