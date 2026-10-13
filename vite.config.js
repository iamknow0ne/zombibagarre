import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [],
  server: {
    port: 3000,
    open: true
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