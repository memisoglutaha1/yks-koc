import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages: https://memisoglutaha1.github.io/yks-koc/
  base: process.env.GITHUB_PAGES === 'true' ? '/yks-koc/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
})
