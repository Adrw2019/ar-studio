import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/ar-studio/',
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
