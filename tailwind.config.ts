import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard',
          'Pretendard JP',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif'
        ]
      },
      colors: {
        bg: {
          primary: { light: '#FFFFFF', dark: '#141414' },
          secondary: { light: '#F5F7FA', dark: '#1F1F1F' }
        },
        text: {
          primary: { light: '#111111', dark: '#F5F5F5' },
          secondary: { light: '#666666', dark: '#AAAAAA' }
        },
        accent: { light: '#0064FF', dark: '#3D8BFF' },
        positive: { light: '#E53935', dark: '#FF5252' },
        negative: { light: '#3DB351', dark: '#66BB6A' },
        border: { light: '#E4E4E4', dark: '#333333' }
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        'soft-md': '0 4px 12px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.04)'
      },
      fontSize: {
        'hero': ['2.5rem', { lineHeight: '1.1', fontWeight: '700' }]
      }
    }
  },
  plugins: []
}

export default config
