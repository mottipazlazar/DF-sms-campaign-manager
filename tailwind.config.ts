import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pine: "#3F6B55",
          "pine-dark": "#2D5240",
          taupe: "#635752",
          "taupe-dark": "#4A3F3B",
          gold: "#E5A94D",
          "gold-dark": "#C8912E",
          white: "#FFFEF6",
          ivory: "#F6F4E3",
          lemon: "#D9CD25",
        },
      },
      fontFamily: {
        display: ["Ethereal", "Cormorant Garamond", "Playfair Display", "Georgia", "serif"],
        body: ["Neue Montreal", "DM Sans", "Inter", "Calibri", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
