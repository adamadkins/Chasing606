import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApi } from './server/api.js';

// Serves /api/* from the same code the Cloudflare Worker runs, so `npm run dev`
// and `npm run preview` behave like production.
function localApi(env) {
  const middleware = async (req, res, next) => {
    try {
      const request = new Request(`http://${req.headers.host}${req.originalUrl}`, { method: req.method, headers: req.headers });
      const response = await handleApi(request, { env });
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      next(error);
    }
  };
  return {
    name: 'local-api',
    // Braces matter: Vite treats a returned function as a post-middleware hook.
    configureServer(server) { server.middlewares.use('/api', middleware); },
    configurePreviewServer(server) { server.middlewares.use('/api', middleware); }
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [react(), localApi(env)],
    server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
    preview: { host: '0.0.0.0', port: 3000, allowedHosts: true },
    build: { target: 'es2022' }
  };
});
