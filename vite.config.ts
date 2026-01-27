import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // LOGIKA PENTING UNTUK VERCEL:
  // Ambil Key dari process.env (Vercel System) dulu. Kalau gak ada, baru cari di file .env lokal.
  // Ini memastikan saat 'npm run build' jalan di server Vercel, dia ngambil key yang bener.
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Vite akan me-replace text 'process.env.API_KEY' di kode client dengan nilai string aslinya
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
    }
  };
});