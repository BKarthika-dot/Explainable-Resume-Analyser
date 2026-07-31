/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0D16",
          900: "#10131F",
          800: "#171B2C",
          700: "#1E2338",
          600: "#2A3049",
        },
        paper: {
          DEFAULT: "#F2EFE6",
          dim: "#E7E2D3",
        },
        brass: {
          DEFAULT: "#B8935A",
          light: "#D3B27E",
        },
        teal: {
          DEFAULT: "#4F9C87",
          light: "#7CC0AC",
        },
        rust: {
          DEFAULT: "#C1442D",
          light: "#E0715C",
        },
        muted: "#8A8F9E",
        ink_text: "#E7E4DA",
      },
      fontFamily: {
        display: ["'Source Serif 4'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
