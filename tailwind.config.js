/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}',
    './app/(tabs)/**/*.{js,ts,jsx,tsx}', // <--- ADD THIS LINE (or ensure it's captured by a broader pattern)
    './components/**/*.{js,ts,jsx,tsx}',],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#2874F0',
        secondary: '#007bff',
        wheat: '#f5deb3',
        primaryRed: '#F44336',
        primaryGreen: '#4CAF50',
        primaryYellow: '#FFEB3B',
        primaryLight: '#6CA1FF'
      },
      // fontFamily: {
      //   'Bitcount': ['Bitcount'],
      //   'SourGummy': ['SourGummy'],
      //   'Newsreader': ['Newsreader']
      // },
    },
  },
  plugins: [],
}

