import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'node18',
    lib: {
      entry: resolve(__dirname, 'src/server.ts'),
      formats: ['cjs'],
      fileName: 'server'
    },
    rollupOptions: {
      external: [
        'express',
        'sqlite3',
        'bcryptjs',
        'jsonwebtoken',
        '@xenova/transformers',
        'cors',
        'helmet',
        'uuid',
        'zod',
        'dotenv',
        'ws',
        'node-cron',
        'fsevents'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    host: true
  }
})
