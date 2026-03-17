import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // './' para standalone ZIP, '/' para Heroku (se sobreescribe via env)
  base: process.env.VITE_BASE_URL || '/',
  server: {
    proxy: {
      '/flat':          'http://localhost:8000',
      '/activity':      'http://localhost:8000',
      '/clients':       'http://localhost:8000',
      '/feriados':      'http://localhost:8000',
      '/ancestor':      'http://localhost:8000',
      '/colaboradores': 'http://localhost:8000',
    }
  }
})
