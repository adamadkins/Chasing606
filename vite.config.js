import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApi } from './server/api.js';

// Serves /api/* from the same code the Cloudflare Worker runs, so `npm run dev`
// and `npm run preview` behave like production.
function localApi(env) {
  const middleware = async (req, res, next) => {
    try {
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      const chunks = [];
      if (hasBody) for await (const chunk of req) chunks.push(chunk);
      const request = new Request(`http://${req.headers.host}${req.originalUrl}`, {
        method: req.method,
        headers: req.headers,
        ...(hasBody && { body: Buffer.concat(chunks) })
      });
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

// `.dev.vars` is where Wrangler reads local secrets; read it here too so one file serves both.
function readDevVars() {
  try {
    return Object.fromEntries(fs.readFileSync('.dev.vars', 'utf8').split('\n')
      .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*?)"?\s*(?:#.*)?$/)).filter(Boolean).map(match => [match[1], match[2]]));
  } catch {
    return {};
  }
}

export default defineConfig(({ mode }) => {
  const env = { ALLOW_MEMORY_ORDER_STORE: 'true', ...loadEnv(mode, process.cwd(), ''), ...readDevVars(), ...process.env };
  return {
    plugins: [react(), localApi(env)],
    server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
    preview: { host: '0.0.0.0', port: 3000, allowedHosts: true },
    build: { target: 'es2022' }
  };
});
