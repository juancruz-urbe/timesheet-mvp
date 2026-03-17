import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DEV_API = process.env.VITE_DEV_API_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  // './' para standalone ZIP, '/' para Heroku (se sobreescribe via env)
  base: process.env.VITE_BASE_URL || '/',
  server: {
    proxy: {
      '/flat':          DEV_API,
      '/activity':      DEV_API,
      '/clients':       DEV_API,
      '/feriados':      DEV_API,
      '/ancestor':      DEV_API,
      '/colaboradores': DEV_API,
    }
  }
})
