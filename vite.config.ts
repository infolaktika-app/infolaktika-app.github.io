import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// VITE_BASE lets the same project run at a sub-path, e.g. GitHub Pages:
// https://<user>.github.io/<repo>/  →  VITE_BASE=/<repo>/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
});
