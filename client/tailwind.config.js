/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        heading: ['Syne', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: {
          DEFAULT: '#0B0C0E',
          secondary: '#101114',
        },
        surface: {
          DEFAULT: '#17191D',
          elevated: '#202329',
          hover: '#2A2E35',
        },
        border: {
          DEFAULT: 'rgba(238,241,244,0.08)',
          hover: 'rgba(238,241,244,0.18)',
          accent: 'rgba(215,220,226,0.42)',
        },
        accent: {
          DEFAULT: '#D7DCE2',
          hover: '#EEF1F4',
          muted: 'rgba(215,220,226,0.12)',
          glow: 'rgba(215,220,226,0.24)',
        },
        text: {
          primary: '#EEF1F4',
          secondary: '#A4ABB5',
          muted: '#666E7A',
        },
        priority: {
          low: '#22c55e',
          medium: '#f59e0b',
          high: '#f97316',
          urgent: '#ef4444',
        },
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(5,6,8,0.46), 0 0 0 1px rgba(238,241,244,0.06)',
        'card-hover': '0 4px 24px rgba(5,6,8,0.56), 0 0 0 1px rgba(215,220,226,0.26)',
        glow: '0 0 20px rgba(215,220,226,0.18)',
        'glow-lg': '0 0 40px rgba(215,220,226,0.24)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'accent-gradient': 'linear-gradient(135deg, #F0F2F5, #AAB1BA)',
        'card-gradient': 'linear-gradient(135deg, rgba(32,35,41,0.88), rgba(17,18,21,0.94))',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
