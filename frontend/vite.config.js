import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: path.resolve(process.env.TEMP || '/tmp', 'shopsmart-vite-cache'),
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      // Optional: `VITE_API_URL=/api` + this proxy avoids CORS in local dev
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
})
