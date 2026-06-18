import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // relative base so the static build works from any host or subpath
  base: './',
  server: {
    host: true,
  },
})
