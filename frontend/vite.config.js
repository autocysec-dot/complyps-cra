import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes the built asset paths relative, so it works on GitHub Pages
// project sites (https://USER.github.io/REPO/) regardless of the repo name.
// We use HashRouter in the app so client-side routing works without a server.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
});
