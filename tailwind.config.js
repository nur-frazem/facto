/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '#1a1f4e',
          light: '#2d3575',
          dark: '#0f1235',
          hover: '#252b63',
          active: '#151a42',
        },
        // Danger/Cancel colors
        danger: {
          DEFAULT: '#f87171',
          hover: '#fca5a5',
          active: '#ef4444',
        },
        // Success colors
        success: {
          DEFAULT: '#16a34a',
          hover: '#22c55e',
          active: '#15803d',
        },
        // Card and surface colors
        surface: {
          DEFAULT: '#0a1628',
          light: '#0f2035',
          dark: '#050d18',
          card: '#0c1a2e',
        },
        // Accent colors
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
        },
      },
      borderRadius: {
        'btn': '9999px',      // Full rounded for buttons
        'card': '1rem',       // 16px for cards
        'input': '0.5rem',    // 8px for inputs
        'modal': '0.75rem',   // 12px for modals
      },
      boxShadow: {
        'card': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        'btn': '0 4px 14px rgba(0, 0, 0, 0.3)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        'xxs': '0.65rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
