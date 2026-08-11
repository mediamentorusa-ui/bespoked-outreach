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
        paper: "#f5f0e8",
        porcelain: "#fffaf2",
        charcoal: "#27231f",
        ink: "#413b35",
        brass: "#9b7b47",
        sage: "#65705f",
        clay: "#b66e4c"
      },
      boxShadow: {
        quiet: "0 20px 50px rgba(39, 35, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
