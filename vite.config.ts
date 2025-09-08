import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 性能优化：生产环境移除console和debugger
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  define: {
    __DEV__: mode === 'development',
    __VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
  },
  // 构建优化
  build: {
    // 启用压缩
    minify: 'esbuild',
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'utils': ['date-fns', 'clsx', 'class-variance-authority'],
        },
      },
    },
    // 启用tree shaking
    treeShaking: true,
    // 启用chunk大小警告
    chunkSizeWarningLimit: 1000,
  },
}));
