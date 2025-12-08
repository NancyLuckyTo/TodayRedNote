import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Gzip 压缩
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // 只压缩 1KB 以上的文件
    }),
    // Brotli 压缩（比 gzip 更高效）
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 目标现代浏览器，减少 polyfill
    target: 'es2020',
    // 使用 esbuild 进行更快的压缩
    minify: 'esbuild',
    // 强制生成 modulePreload
    modulePreload: {
      polyfill: true,
    },
    // 代码分割策略
    rollupOptions: {
      output: {
        // 优化最小 chunk 大小
        experimentalMinChunkSize: 5000,
        manualChunks: id => {
          // React 核心运行时，首屏渲染必需
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-core'
          }

          // 路由库，首屏导航必需
          if (id.includes('node_modules/react-router')) {
            return 'react-router'
          }

          // 数据请求层，首屏数据获取必需
          if (
            id.includes('node_modules/@tanstack/react-query') ||
            id.includes('node_modules/axios')
          ) {
            return 'data-layer'
          }

          // 状态管理
          if (id.includes('node_modules/zustand')) {
            return 'state'
          }

          // 富文本编辑器（较大，会被懒加载的页面引用）单独打包
          if (
            id.includes('node_modules/@tiptap') ||
            id.includes('node_modules/prosemirror')
          ) {
            return 'editor'
          }

          // UI 组件库（Radix UI + class-variance-authority）
          if (
            id.includes('node_modules/@radix-ui') ||
            id.includes('node_modules/class-variance-authority') ||
            id.includes('node_modules/clsx') ||
            id.includes('node_modules/tailwind-merge')
          ) {
            return 'ui-primitives'
          }

          // 图标库单独打包
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }

          // 表单相关
          if (
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/@hookform') ||
            id.includes('node_modules/zod')
          ) {
            return 'form-utils'
          }

          // 其余依赖统一打包
          if (id.includes('node_modules')) {
            return 'vendor'
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
