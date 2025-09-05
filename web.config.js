// Web-specific Vite configuration for pure web builds
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
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
  },
  build: {
    rollupOptions: {
      // Exclude Tauri dependencies from web bundle
      external: [
        '@tauri-apps/api',
        '@tauri-apps/plugin-dialog', 
        '@tauri-apps/plugin-fs',
        'tauri-plugin-serialplugin'
      ],
    }
  }
});