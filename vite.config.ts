import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Fail loudly if 5173 is taken instead of silently hopping ports —
    // prevents duplicate dev-server instances piling up unnoticed.
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the heavy 3D stack out of the app chunk so the app code
        // stays small and the vendor chunks cache well.
        manualChunks: {
          three: ['three'],
          r3f: [
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/postprocessing',
          ],
        },
      },
    },
    // three.js alone is ~700 kB minified; that's expected, not a regression.
    chunkSizeWarningLimit: 900,
  },
});
