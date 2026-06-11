/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Chrome / texto — navy da identidade AjeX
        ink: {
          DEFAULT: "#1D242D",
          900: "#141A20",
          800: "#1D242D",
          700: "#2A333E",
          600: "#3A4654",
          muted: "#5B6573",
        },
        // Cor de ação / marca — laranja AjeX (substitui o antigo azul)
        brand: {
          50:  "#FFF3EE",
          100: "#FFE2D6",
          200: "#FFC3AC",
          300: "#FF9F77",
          400: "#FF7A45",
          500: "#FF5722",
          600: "#EA4E1B",
          700: "#C73F12",
          900: "#7A2A0F",
        },
        // Positivo / sucesso — verde AjeX
        positive: {
          50:  "#E6F6EC",
          100: "#C2EDD1",
          500: "#16A34A",
          600: "#15803D",
          bright: "#00E54C",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(29,36,45,0.04), 0 1px 3px rgba(29,36,45,0.06)",
      },
    },
  },
  plugins: [],
};
