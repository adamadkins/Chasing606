import { defineConfig } from 'vite';
import { onRequestGet } from './functions/api/latest-video.js';
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all',
  },
  plugins: [{
    name: 'local-video-feed',
    configureServer(server) {
      server.middlewares.use('/api/latest-video', async (_req, res) => {
        const response = await onRequestGet({ request: new Request('http://localhost/api/latest-video'), env: process.env });
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  }],
});
