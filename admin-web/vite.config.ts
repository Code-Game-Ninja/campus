import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 4174, proxy: { '/v1': 'http://localhost:4180', '/healthz': 'http://localhost:4180' } },
  preview: { port: 4174 },
});
