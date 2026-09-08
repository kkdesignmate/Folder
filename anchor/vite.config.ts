import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // Stays inside this folder and out of git — this app is not part of the site
  // published from the repo root.
  build: { outDir: 'dist', emptyOutDir: true },
})
