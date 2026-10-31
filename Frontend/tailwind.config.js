/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#1C1A17',
        surface: {
          DEFAULT: '#24211D',
          raised: '#2C2924',
          subtle: '#1F1D1A',
        },
        hairline: 'rgba(255, 255, 255, 0.07)',
        hairlineStrong: 'rgba(255, 255, 255, 0.12)',
        text: {
          DEFAULT: '#E8E6E1',
          muted: '#9E9A90',
          faint: '#6E6A62',
        },
        accent: {
          DEFAULT: '#F0445A',
          hover: '#D93B4F',
          subtle: 'rgba(240, 68, 90, 0.12)',
          faint: 'rgba(240, 68, 90, 0.06)',
        },
        gain: {
          DEFAULT: '#6B9E78',
          subtle: 'rgba(107, 158, 120, 0.12)',
        },
        loss: {
          DEFAULT: '#F0445A',
          subtle: 'rgba(240, 68, 90, 0.12)',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Newsreader', 'Fraunces', 'Source Serif 4', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'xl': ['20px', '28px'],
        '2xl': ['28px', '34px'],
        '4xl': ['44px', '48px'],
        '6xl': ['72px', '76px'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '8px',
        md: '8px',
        lg: '20px',
        xl: '20px',
        '2xl': '20px',
      },
      boxShadow: {
        soft: '0 20px 40px -15px rgba(0, 0, 0, 0.4)',
        sheet: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
      },
    },
  },
  plugins: [],
};
