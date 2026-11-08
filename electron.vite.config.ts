import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const shared = resolve(__dirname, 'src/shared')

/** 生产构建注入严格 CSP（开发模式需要 HMR 内联脚本，故只在 build 时注入） */
const cspPlugin = {
  name: 'court-rise-csp',
  apply: 'build' as const,
  transformIndexHtml(html: string): string {
    const csp =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"
    return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`)
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': shared } },
    build: { rollupOptions: { external: ['better-sqlite3'] } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': shared } }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@shared': shared,
        '@': resolve(__dirname, 'src/renderer/src')
      }
    },
    plugins: [react(), cspPlugin],
    build: {
      rollupOptions: { input: resolve(__dirname, 'src/renderer/index.html') }
    }
  }
})
