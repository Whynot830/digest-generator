import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  resolve: { alias: { $lib: path.resolve(root, 'src/lib') } },
  server: { proxy: { '/api': 'http://localhost:3001' } }
});
