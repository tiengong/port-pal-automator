// Web-specific Vite configuration for standalone web builds
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Use relative paths for standalone deployment
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Disable Tauri for web builds
    __TAURI__: false,
    // Ensure we're in web mode
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.MODE': '"web"'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable sourcemaps for smaller build
    minify: 'terser',
    rollupOptions: {
      // Completely exclude Tauri dependencies
      external: [],
      output: {
        manualChunks: {
          // Optimize chunking for better caching
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        }
      }
    }
  },
  // Optimize for standalone web deployment
  optimizeDeps: {
    exclude: [
      '@tauri-apps/api',
      '@tauri-apps/plugin-dialog', 
      '@tauri-apps/plugin-fs',
      'tauri-plugin-serialplugin'
    ]
  }
});