/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "#F7F8FA",
        surface: "#FFFFFF",
        "surface-secondary": "#F1F5F9",
        "surface-card": "#FFFFFF",
        border: "#E2E8F0",
        "border-subtle": "#EDF2F7",
        "text-primary": "#172B4D",
        "text-secondary": "#64748B",
        "action-primary": "#334155",
        "action-hover": "#1E293B",
        success: "#10B981",
        "success-subtle": "#ECFDF5",
        warning: "#F59E0B",
        "warning-subtle": "#FFFBEB",
        error: "#EF4444",
        "error-subtle": "#FEF2F2",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
