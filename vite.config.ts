import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This automatically sets the base path for GitHub Pages deployment.
  base: process.env.VITE_REPO_NAME ? `/${process.env.VITE_REPO_NAME}/` : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
