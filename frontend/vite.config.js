import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Soporte automático para Netlify (base: '/') y GitHub Pages (base: '/ar-studio/')
const base = process.env.NETLIFY ? '/' : (process.env.VITE_BASE_PATH || '/ar-studio/');

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true, // Escuchar en todas las IPs locales para acceso móvil desde la misma red WiFi
    port: 5174,
    strictPort: false,
    cors: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'mind-ar/dist/mindar-image-three.prod.js']
  },
  build: {
    chunkSizeWarningLimit: 2000
  }
});
