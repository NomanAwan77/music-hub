import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'GOOGLE_CLIENT_ID'],
  server: {
    proxy: {
      '/auth/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/music/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/receptionist': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/calendar': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/artists': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/bookings': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
