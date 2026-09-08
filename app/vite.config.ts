import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // Builds into /anchor at the repo root so GitHub Pages serves it at <site>/anchor/
  build: { outDir: '../anchor', emptyOutDir: true },
})
