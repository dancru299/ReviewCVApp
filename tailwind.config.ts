import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        mist: "#eef5f8",
        ocean: "#1f6f8b",
        coral: "#ef6f5e",
        lime: "#8abf4f"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(24, 33, 47, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
