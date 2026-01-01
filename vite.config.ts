import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Chart library (likely large)
          'charts': ['recharts'],

          // Date utilities (includes moment-timezone which is large ~500KB)
          'date-utils': ['date-fns', 'moment-timezone'],

          // Form handling
          'forms': ['react-hook-form'],

          // Animation library
          'animations': ['framer-motion'],

          // UI components
          'ui': ['lucide-react'],
        },
      },
    },
    // Suppress warning for moment-timezone chunk (known large dependency)
    chunkSizeWarningLimit: 900,
  },
})
