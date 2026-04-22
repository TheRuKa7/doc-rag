/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        surface: "#1e293b",
        border: "#334155",
        primary: "#8b5cf6",
        assistant: "#1e293b",
        user: "#312e81",
        muted: "#94a3b8",
        danger: "#ef4444",
      },
    },
  },
};
