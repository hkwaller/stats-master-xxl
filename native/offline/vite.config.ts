import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [tailwindcss()],
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.resolve(__dirname, '../..') } },
  build: { outDir: '../www', emptyOutDir: true, rollupOptions: { onwarn(warning, warn) { if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning) }, input: path.resolve(__dirname, 'offline.html') } },
})
