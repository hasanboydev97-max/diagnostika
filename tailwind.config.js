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
        blob1: {
          "0%, 100%": { 
            transform: "translate(0px, 0px) rotate(0deg) scale(1)",
            borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%"
          },
          "33%": { 
            transform: "translate(150px, -200px) rotate(90deg) scale(1.3)",
            borderRadius: "60% 40% 30% 70% / 50% 60% 40% 50%"
          },
          "66%": { 
            transform: "translate(-100px, 150px) rotate(180deg) scale(0.8)",
            borderRadius: "50% 50% 70% 30% / 40% 40% 60% 60%"
          }
        },
        blob2: {
          "0%, 100%": { 
            transform: "translate(0px, 0px) rotate(0deg) scale(1)",
            borderRadius: "50% 50% 50% 50% / 50% 50% 50% 50%"
          },
          "33%": { 
            transform: "translate(-200px, 150px) rotate(-90deg) scale(1.4)",
            borderRadius: "40% 60% 30% 70% / 60% 30% 70% 40%"
          },
          "66%": { 
            transform: "translate(150px, -150px) rotate(-180deg) scale(0.9)",
            borderRadius: "70% 30% 50% 50% / 30% 70% 50% 50%"
          }
        },
        blob3: {
          "0%, 100%": { 
            transform: "translate(0px, 0px) rotate(0deg) scale(1)",
            borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%"
          },
          "33%": { 
            transform: "translate(200px, 100px) rotate(120deg) scale(1.6)",
            borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%"
          },
          "66%": { 
            transform: "translate(-150px, -100px) rotate(240deg) scale(0.7)",
            borderRadius: "60% 40% 30% 70% / 60% 60% 40% 40%"
          }
        }
      },
      animation: {
        blob1: "blob1 25s ease-in-out infinite",
        blob2: "blob2 30s ease-in-out infinite",
        blob3: "blob3 20s ease-in-out infinite",
      }
    },
  },
  plugins: [],
}
