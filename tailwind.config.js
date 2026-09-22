/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Midnight Cosmic Palette (moving away from standard flat Spotify black)
        midnight: {
          950: "#050811", // Pitch cosmic base
          900: "#090E1A", // Primary background
          850: "#0D1527", // Elevated card surface
          800: "#131C35", // Surface border & hover
          700: "#1E2C4F", // Subtle divider
          600: "#2D4170",
        },
        // Neon Cybernetic Streaming Accents
        neon: {
          cyan: "#00F5FF",    // Electric Cyan highlight
          violet: "#8B5CF6",  // Audio Spectrum Violet
          pink: "#FF2E93",    // Pulsing playback accent
          amber: "#FFB020",   // Warning / Throttling state
          emerald: "#00FF9D", // 100% Offline cached state
        },
        // Premium Glassmorphic Layering
        glass: {
          subtle: "rgba(255, 255, 255, 0.03)",
          surface: "rgba(13, 21, 39, 0.65)",
          elevated: "rgba(19, 28, 53, 0.75)",
          border: "rgba(255, 255, 255, 0.08)",
          highlight: "rgba(255, 255, 255, 0.15)",
          glow: "rgba(0, 245, 255, 0.12)",
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.37)",
        "glass-lg": "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
        "neon-cyan": "0 0 25px -4px rgba(0, 245, 255, 0.35)",
        "neon-violet": "0 0 25px -4px rgba(139, 92, 246, 0.35)",
        "neon-pink": "0 0 25px -4px rgba(255, 46, 147, 0.35)",
      },
      backdropBlur: {
        xs: "2px",
        md: "12px",
        xl: "20px",
        "2xl": "40px",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-fade": "glowFade 3s ease-in-out infinite alternate",
        "spectrum-wave": "spectrumWave 1.2s ease-in-out infinite",
      },
      keyframes: {
        glowFade: {
          "0%": { opacity: "0.4", transform: "scale(0.98)" },
          "100%": { opacity: "0.85", transform: "scale(1.02)" },
        },
        spectrumWave: {
          "0%, 100%": { height: "20%" },
          "50%": { height: "95%" },
        },
      },
    },
  },
  plugins: [],
};
