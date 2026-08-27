/// <reference types="vitest" />

import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Extract single source of truth version with robust fallback
let appVersion = '3.1.1'
try {
  const versionFilePath = path.resolve(__dirname, '../VERSION')
  if (fs.existsSync(versionFilePath)) {
    appVersion = fs.readFileSync(versionFilePath, 'utf-8').trim()
  } else {
    const pkgPath = path.resolve(__dirname, './package.json')
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      if (pkg.version) appVersion = pkg.version
    }
  }
} catch {
  // Graceful fallback to default version
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 3173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: '../.cov/frontend',
    },
  }
})