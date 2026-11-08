/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#090B0F',
        panel: '#171A20',
        steel: '#252A33',
        hoop: { DEFAULT: '#FF6B20', soft: '#FF8A4C', deep: '#D9520F' },
        chalk: '#F7F8FA',
        silver: '#BBC3CF',
        champ: '#F2C46D',
        win: '#45DDA0',
        bronze: '#C9824B'
      },
      fontFamily: {
        display: ['Oswald', '"Microsoft YaHei UI"', '"Microsoft YaHei"', '"PingFang SC"', '"Noto Sans SC"', 'sans-serif'],
        label: ['"Barlow Condensed"', '"Microsoft YaHei UI"', '"Microsoft YaHei"', '"PingFang SC"', 'sans-serif'],
        body: ['"Microsoft YaHei UI"', '"Microsoft YaHei"', '"PingFang SC"', '"Noto Sans SC"', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', '"Microsoft YaHei UI"', 'monospace']
      },
      letterSpacing: { tag: '0.18em' }
    }
  },
  plugins: []
}
