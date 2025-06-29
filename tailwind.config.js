/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#9333ea',
        accent: '#f59e42',
      },
      borderRadius: {
        xl: '1rem',
      },
      boxShadow: {
        card: '0 4px 24px 0 rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
