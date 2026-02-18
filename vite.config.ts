import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In dev, forward all /api requests to the Node server
      '/api': {
        target:    'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir:    'dist',
    sourcemap: false,
  },
});
