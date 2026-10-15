import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const {version} = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base: './',
  define: { 'import.meta.env.GAME_VERSION': JSON.stringify(version) },
  plugins: [{
    name: 'game-version',
    transformIndexHtml: html => html.replaceAll('%GAME_VERSION%', version),
  }],
  server: {
    port: 3000,
    open: true,
    // Native packaging/toolchains are large generated trees, not browser inputs.
    watch: { ignored: ['**/.cache/**', '**/release/**', '**/.desktop-build/**', '**/android/**', '**/assets/source/**'] }
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {game: 'index.html', traversal: 'traversal.html'},
      output: {
        manualChunks: {
          'three': ['three']
        }
      }
    }
  }
});
