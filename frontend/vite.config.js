import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

  return {
    base: isGitHubPages ? '/ar-studio/' : '/',

    plugins: [react()],

    server: {
      host: true,
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
      include: [
        'three',
        'mind-ar/dist/mindar-image-three.prod.js'
      ]
    },

    build: {
      chunkSizeWarningLimit: 2000
    }
  };
});
