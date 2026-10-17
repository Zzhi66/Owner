import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  preview: { host: '127.0.0.1', port: 5175, strictPort: true },
  build: { outDir: 'build' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.mjs'],
    clearMocks: true,
  },
});
