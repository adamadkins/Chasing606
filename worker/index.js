import { onRequestGet } from '../functions/api/latest-video.js';
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/api/latest-video') {
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
      return onRequestGet({ request, env });
    }
    return env.ASSETS.fetch(request);
  },
};
