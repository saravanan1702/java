import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '../..');
  const env = loadEnv(mode, envDir, 'VITE_');
  return {
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Same-origin /api in development: cookies stay first-party.
      proxy: { '/api': { target: env.VITE_DEV_API_PROXY || 'http://localhost:4000', changeOrigin: false } },
    },
    preview: {
      port: 4173,
      proxy: { '/api': { target: env.VITE_DEV_API_PROXY || 'http://localhost:4000', changeOrigin: false } },
    },
    build: {
      sourcemap: true,
      target: 'es2022',
      rollupOptions: {
        output: {
          // Long-term cacheable vendor chunks.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router'],
            radix: [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-avatar',
              '@radix-ui/react-label',
              '@radix-ui/react-slot',
            ],
            data: ['@tanstack/react-query', 'zod', 'react-hook-form', '@hookform/resolvers'],
          },
        },
      },
    },
  };
});
