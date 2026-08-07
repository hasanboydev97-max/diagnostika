/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#111111',
          hover: '#000000',
          light: '#F5F5F5',
        },
        neutral: {
          900: '#111111',
          800: '#222222',
          700: '#333333',
          600: '#555555',
          500: '#777777',
          400: '#999999',
          300: '#BBBBBB',
          200: '#DDDDDD',
          100: '#F5F5F5',
          50: '#FDFDFD',
        },
        success: '#000000', // Monochrome defaults unless accent is needed
        warning: '#000000',
        danger: '#000000',
        background: {
          main: '#FDFDFD',
          card: '#FFFFFF',
        },
        border: '#E5E5E5',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'sans-serif'], 
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'premium-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.1)',
        'accent-glow': '0 0 15px rgba(0, 0, 0, 0.1)',
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          }
        }
      },
      animation: {
        blob: "blob 7s infinite",
      }
    },
  },
  plugins: [],
}
