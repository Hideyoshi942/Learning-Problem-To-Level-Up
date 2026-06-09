import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves under /<repo-name>/ – set base to match
  // Use env var so local dev still works with base '/'
  // eslint-disable-next-line no-undef
  base: process.env.GITHUB_ACTIONS ? '/Learning-Problem-To-Level-Up/' : '/',
})
