import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0A0F1C',
          surface: '#141B2D',
          elevated: '#1B2236',
        },
        primary: {
          DEFAULT: '#00D4AA',
          hover: '#00B894',
        },
        accent: {
          DEFAULT: '#F5A623',
        },
        text: {
          DEFAULT: '#E2E8F0',
          muted: '#94A3B8',
        },
        border: {
          DEFAULT: '#1E293B',
        },
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
