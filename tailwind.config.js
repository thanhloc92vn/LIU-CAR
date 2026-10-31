/** @type {import('tailwindcss').Config} */
const blue = {
  50: '#eef6ff', 100: '#dcecff', 200: '#b9d9ff', 300: '#85bdff', 400: '#4a9bff',
  500: '#1a85ff', 600: '#0071e3', 700: '#0062c4', 800: '#004f9e', 900: '#003a75', 950: '#002448',
};
const green = {
  50: '#f0faf3', 100: '#dcf5e4', 200: '#b8ebc9', 300: '#86dba6', 400: '#4cc76f',
  500: '#34c759', 600: '#248a3d', 700: '#1e7a35', 800: '#1a5f2b', 900: '#144a22', 950: '#0c2e15',
};
const red = {
  50: '#fff2f1', 100: '#ffe3e0', 200: '#ffc7c2', 300: '#ff9d95', 400: '#ff6b60',
  500: '#ff3b30', 600: '#d70015', 700: '#b4160d', 800: '#8a120c', 900: '#6b0f0a', 950: '#3f0806',
};
const orange = {
  50: '#fff8eb', 100: '#ffefd0', 200: '#ffdc9e', 300: '#ffc261', 400: '#ffa826',
  500: '#ff9500', 600: '#c25e00', 700: '#9c4a00', 800: '#7a3a00', 900: '#5c2c00', 950: '#3d1d00',
};
const gray = {
  50: '#fafafa', 100: '#f5f5f7', 200: '#e8e8ed', 300: '#d2d2d7', 400: '#aeaeb2',
  500: '#86868b', 600: '#6e6e73', 700: '#515154', 800: '#333336', 900: '#1d1d1f', 950: '#111113',
};

// Hệ màu chỉ gồm: xám trung tính + xanh thương hiệu + 3 màu trạng thái (xanh lá / đỏ / cam).
// Các tên màu khác được ánh xạ về đúng 5 nhóm này để giao diện không bị loạn màu.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter',
          '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif',
        ],
      },
      fontWeight: { bold: '600', extrabold: '600', black: '700' },
      colors: {
        slate: gray, gray, zinc: gray, neutral: gray,
        blue, indigo: blue, violet: blue, purple: blue, sky: blue, cyan: blue, teal: blue,
        emerald: green, green, lime: green,
        rose: red, red, pink: red,
        amber: orange, orange, yellow: orange,
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)',
        DEFAULT: '0 2px 8px rgba(0,0,0,0.06)',
        md: '0 4px 16px rgba(0,0,0,0.08)',
        lg: '0 8px 30px rgba(0,0,0,0.10)',
        xl: '0 12px 40px rgba(0,0,0,0.12)',
        '2xl': '0 20px 60px rgba(0,0,0,0.16)',
      },
    },
  },
  plugins: [],
}
