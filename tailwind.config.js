/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // GLAZE Design System
        'glaze': {
          'primary': '#3d3d3d',
          'secondary': '#2d2d2d', 
          'button': 'rgb(60, 60, 60)',
          'button-hover': 'rgb(82, 82, 82)',
          'button-active': 'rgb(50, 50, 50)',
          'input': '#4a4a4a',
          'border': 'rgb(82, 82, 82)',
          'border-light': '#4a4a4a',
          'accent': '#4a90e2',
          'accent-dark': '#357abd',
          'accent-light': '#6ba3e8',
          'text-primary': '#ffffff',
          'text-secondary': '#e0e0e0',
          'text-muted': '#ccc',
          'text-subtle': '#bbb',
        },
        // Legacy support
        'brand-primary': '#4a90e2',
        'brand-secondary': '#357abd',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      // モバイル対応のブレークポイント調整
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      // モバイル向けスペーシング
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      // タッチ対応の最小サイズ
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      }
    },
  },
  plugins: [],
  // モバイル最適化のためのDarkMode設定
  darkMode: 'class',
}