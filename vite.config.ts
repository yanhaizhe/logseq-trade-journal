import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import logseqDevPlugin from 'vite-plugin-logseq';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    logseqDevPlugin({
      // 自动注入 HMR 并处理 Logseq 插件通信
    }),
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'klinecharts': path.resolve(__dirname, 'src/core/klinecharts-wrapper.ts'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 4567,
    strictPort: false,
  },
});
