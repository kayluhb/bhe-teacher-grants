import {cloudflare} from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import {defineConfig} from 'vite';
import {wishlistDevPlugin} from './vite-wishlist-dev-plugin';

export default defineConfig({
  plugins: [
    wishlistDevPlugin(),
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      external: ['cloudflare:workers'],
    },
  },
});
