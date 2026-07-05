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
        // 温かみのある1アクセントカラー + ニュートラル(デザイン方針 §6)
        brand: {
          50: "#fdf6ef",
          100: "#fae8d6",
          200: "#f4cfac",
          300: "#edb078",
          400: "#e58f4a",
          500: "#dd7524", // primary accent
          600: "#c85e1a",
          700: "#a64818",
          800: "#853b1a",
          900: "#6c3218",
        },
      },
    },
  },
  plugins: [],
};

export default config;
