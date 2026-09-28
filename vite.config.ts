import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'gr.lukeyao.site',     // ← 加上你的域名
      'localhost',
      '.lukeyao.site',       // 可选：允许所有子域名
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',   // ⭐ 3000 改成 4000
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});