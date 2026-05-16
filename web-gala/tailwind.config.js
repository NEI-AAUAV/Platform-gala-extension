/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";
import headlessui from "@headlessui/tailwindcss";

export default {
  mode: "jit",
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "576px",
      },
      fontFamily: {
        gala: ["Montserrat", "sans-serif"],
      },
      colors: {
        "light-gold": "#c9a843",
        "dark-gold": "#8a6a20",
        "green-dark": "#203836",
        "green-light": "#355a56",
        "gala-white": "#c1cac9",
      },
      backgroundImage: () => ({
        "gradient-radial":
          "radial-gradient(50% 50% at 50% 50%, var(--tw-gradient-stops))",
      }),
    },
  },
  plugins: [daisyui, headlessui],
  daisyui: {
    logs: false,
    themes: [
      {
        light: {
          primary: "#c9a843",
          secondary: "#8a6a20",
          accent: "#c9a843",
          neutral: "#355a56",
          "base-100": "#203836",
          "base-200": "#182c2a",
          "base-content": "#c1cac9",
          info: "#0284c7",
          success: "#198754",
          warning: "#DD8500",
          error: "#DC3545",
        },
      },
    ],
  },
};
