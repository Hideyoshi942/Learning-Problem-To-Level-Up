import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// SPA fallback for GitHub Pages.
// GitHub Pages has no server-side routing: any path that isn't a real file
// (e.g. a refresh on /level/1/topic/sql, a bookmarked or shared deep link)
// returns 404 with no index.html → white screen. GitHub Pages DOES serve
// 404.html for unknown paths, so we copy index.html → 404.html. That boots
// the same SPA, and React Router resolves the real route client-side.
function spaGithubPagesFallback() {
  return {
    name: 'spa-github-pages-fallback',
    apply: 'build',
    closeBundle() {
      const index = fileURLToPath(new URL('./dist/index.html', import.meta.url))
      const notFound = fileURLToPath(new URL('./dist/404.html', import.meta.url))
      if (existsSync(index)) copyFileSync(index, notFound)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaGithubPagesFallback()],
  // GitHub Pages serves under /<repo-name>/ – set base to match
  // Use env var so local dev still works with base '/'
  // eslint-disable-next-line no-undef
  base: process.env.GITHUB_ACTIONS ? '/Learning-Problem-To-Level-Up/' : '/',
})
