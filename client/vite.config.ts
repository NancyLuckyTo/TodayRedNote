import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: id => {
          // React 核心库
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/')
          ) {
            return 'react-vendor'
          }
          // 路由相关
          if (id.includes('node_modules/react-router')) {
            return 'router'
          }
          // 状态管理和数据请求
          if (
            id.includes('node_modules/zustand') ||
            id.includes('node_modules/@tanstack/react-query') ||
            id.includes('node_modules/axios')
          ) {
            return 'data-layer'
          }
          // 富文本编辑器（较大，会被懒加载的页面引用）
          if (
            id.includes('node_modules/@tiptap') ||
            id.includes('node_modules/prosemirror')
          ) {
            return 'editor'
          }
          // Radix UI 组件库
          if (id.includes('node_modules/@radix-ui')) {
            return 'ui-vendor'
          }
        },
      },
    },
    // 设置警告阈值
    chunkSizeWarningLimit: 200,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
