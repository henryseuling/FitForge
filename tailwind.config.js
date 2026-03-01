/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0C0C14',
        surface: '#14141F',
        elevated: '#1C1C2A',
        primary: '#E8A838',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        'text-primary': '#F0F0F5',
        'text-secondary': '#8B8BA3',
        'text-tertiary': '#52526B',
      },
      fontFamily: {
        'dm': ['DMSans'],
        'dm-medium': ['DMSans-Medium'],
        'dm-semibold': ['DMSans-SemiBold'],
        'dm-bold': ['DMSans-Bold'],
        'mono': ['JetBrainsMono'],
        'mono-medium': ['JetBrainsMono-Medium'],
        'mono-semibold': ['JetBrainsMono-SemiBold'],
        'mono-bold': ['JetBrainsMono-Bold'],
        'mono-extrabold': ['JetBrainsMono-ExtraBold'],
      },
    },
  },
  plugins: [],
};
