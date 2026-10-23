import { handleApi } from '../server/api.js';

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleApi(request, { env, ctx });
    return env.ASSETS.fetch(request);
  }
};
