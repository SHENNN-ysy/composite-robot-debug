import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/ws': {
        target: 'ws://127.0.0.1:8080',
        ws: true,
        configure: (proxy) => {
          // 客户端在代理转发途中断开（页面刷新、HMR、后端重启）时，http-proxy 会报
          // ECONNABORTED；接管 error 事件避免 Vite 输出无害的噪音日志，
          // 断线恢复由前端 WebSocket 重连机制兜底。
          proxy.on('error', (err) => {
            if ((err as { code?: string }).code !== 'ECONNABORTED') {
              console.error('[vite] ws proxy error:', err);
            }
          });
        },
      },
    },
  },
});
