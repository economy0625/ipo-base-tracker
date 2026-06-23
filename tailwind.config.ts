import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        muted: "#66736a",
        panel: "#f7f8f5",
        line: "#dce3dd",
        accent: "#1f7a55",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(23, 33, 27, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
