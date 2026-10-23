// The site's JSON API. Used by the Cloudflare Worker and by the Vite dev server,
// so local development behaves like production.

import { withEdgeCache } from './cache.js';
import { CheckoutError, orderStatus, startCheckout } from './checkout.js';
import { publicCheckoutConfig } from './config.js';
import { fulfillSession } from './fulfillment.js';
import { orderStore } from './orders.js';
import { SpringError } from './spring.js';
import { buildServices } from './services.js';
import { StripeError } from './stripe.js';
import { CHANNEL_HANDLE_URL, CHANNEL_ID, failureReason, loadLatestVideo } from './youtube.js';

const json = (body, init = {}) => Response.json(body, init);
const noStore = { 'Cache-Control': 'no-store' };

function dataResponse({ data, stale }, cacheControl) {
  return json(data, { headers: { 'Cache-Control': stale ? 'public, max-age=60' : cacheControl, ...(stale && { 'X-Data-Stale': 'true' }) } });
}

/** The catalog for the current shop mode, cached at the edge where available. */
async function loadCatalog({ ctx, services }) {
  const ttl = services.mode === 'demo' ? { ttl: 0, staleTtl: 0 } : { ttl: 300, staleTtl: 86_400 };
  return withEdgeCache(ctx, `products-${services.mode}`, ttl, () => services.catalog.load());
}

function errorResponse(error, fallback) {
  const known = error instanceof CheckoutError || error instanceof SpringError;
  return json({ error: known ? error.message : fallback }, { status: known ? error.status : 502, headers: noStore });
}

// ---------------------------------------------------------------------------
// Catalog and video
// ---------------------------------------------------------------------------

async function productsRoute({ env, ctx, services }) {
  try {
    const { data, stale } = await loadCatalog({ ctx, services });
    // Settings are read fresh so changing them never waits on the cache.
    return dataResponse({ data: { ...data, checkout: publicCheckoutConfig(env) }, stale }, 'public, max-age=300');
  } catch (error) {
    console.error('products failed:', error);
    return errorResponse(error, 'The shop is temporarily unavailable.');
  }
}

async function latestVideoRoute({ env, ctx, fetcher }) {
  try {
    const channelId = env.YOUTUBE_CHANNEL_ID || CHANNEL_ID;
    const result = await withEdgeCache(ctx, 'latest-video', { ttl: 900, staleTtl: 604_800 }, () => loadLatestVideo({ fetcher, channelId }));
    return dataResponse(result, 'public, max-age=300, s-maxage=900');
  } catch (error) {
    console.error('latest-video failed:', error);
    return json(
      { error: 'Latest upload temporarily unavailable', reason: failureReason(error), channelUrl: CHANNEL_HANDLE_URL },
      { status: 503, headers: noStore }
    );
  }
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

async function checkoutRoute({ request, env, ctx, services }) {
  if (!services.payments) return json({ error: 'Checkout is not open yet.' }, { status: 503, headers: noStore });
  try {
    const { data } = await loadCatalog({ ctx, services });
    return json(await startCheckout({ request, env, services, products: data.products }), { headers: noStore });
  } catch (error) {
    console.error('checkout failed:', error);
    return errorResponse(error, 'We could not start checkout. Please try again.');
  }
}

async function orderStatusRoute({ request, services }) {
  if (!services.payments) return json({ error: 'Not found.' }, { status: 404, headers: noStore });
  try {
    const sessionId = new URL(request.url).searchParams.get('session_id');
    return json(await orderStatus(sessionId, services), { headers: noStore });
  } catch (error) {
    if (!(error instanceof CheckoutError)) console.error('order-status failed:', error);
    return errorResponse(error, 'We could not look up that order.');
  }
}

const FULFILL_ON = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

/** Stripe tells us a payment succeeded; we send the order to the supplier. */
async function stripeWebhookRoute({ request, env, services, fetcher }) {
  if (!services.payments?.verifyWebhook) return json({ error: 'Not found.' }, { status: 404, headers: noStore });
  const store = orderStore(env);
  if (!store) {
    console.error('Orders cannot be recorded: bind a D1 database named DB (see docs/CHECKOUT.md).');
    return json({ error: 'Order storage is not configured.' }, { status: 500, headers: noStore });
  }

  let event;
  try {
    event = await services.payments.verifyWebhook(await request.text(), request.headers.get('Stripe-Signature'));
  } catch (error) {
    if (!(error instanceof StripeError)) console.error('webhook parse failed:', error);
    return json({ error: 'Invalid webhook.' }, { status: 400, headers: noStore });
  }
  if (!FULFILL_ON.has(event.type)) return json({ received: true }, { headers: noStore });

  try {
    const result = await fulfillSession({ sessionId: event.data.object.id, env, services, store, fetcher });
    // "busy" means another delivery is mid-way; ask Stripe to come back.
    return json({ received: true, result }, { status: result === 'busy' ? 503 : 200, headers: noStore });
  } catch (error) {
    console.error('fulfillment failed:', error);
    return json({ error: 'Fulfillment failed; will retry.' }, { status: 500, headers: noStore });
  }
}

/** Development only: stands in for the customer finishing the payment form. */
async function demoPayRoute({ request, env, services, fetcher }) {
  if (services.mode !== 'demo') return json({ error: 'Not found.' }, { status: 404, headers: noStore });
  const store = orderStore({ ...env, ALLOW_MEMORY_ORDER_STORE: 'true' });
  const body = await request.json().catch(() => null);
  if (!body?.sessionId || !body.recipient?.name || !body.recipient?.address?.line1) {
    return json({ error: 'Fill in your name and address.' }, { status: 400, headers: noStore });
  }
  try {
    await services.payments.completeDemoPayment(body.sessionId, { phone: '', ...body.recipient, email: body.recipient.email ?? '' });
    const result = await fulfillSession({ sessionId: body.sessionId, env, services, store, fetcher });
    return json({ result }, { headers: noStore });
  } catch (error) {
    console.error('demo pay failed:', error);
    return json({ error: 'Demo payment failed.' }, { status: 500, headers: noStore });
  }
}

const ROUTES = {
  '/api/products': { methods: ['GET', 'HEAD'], handler: productsRoute },
  '/api/latest-video': { methods: ['GET', 'HEAD'], handler: latestVideoRoute },
  '/api/checkout': { methods: ['POST'], handler: checkoutRoute },
  '/api/order-status': { methods: ['GET'], handler: orderStatusRoute },
  '/api/stripe-webhook': { methods: ['POST'], handler: stripeWebhookRoute },
  '/api/demo/pay': { methods: ['POST'], handler: demoPayRoute }
};

/**
 * @param {Request} request
 * @param {{ env?: Record<string, any>, ctx?: { waitUntil?: Function }, fetcher?: typeof fetch, services?: object }} [options]
 *   `services` replaces the real suppliers (used by tests).
 */
export async function handleApi(request, { env = {}, ctx, fetcher = fetch, services } = {}) {
  const route = ROUTES[new URL(request.url).pathname];
  if (!route) return json({ error: 'Not found.' }, { status: 404, headers: noStore });
  if (!route.methods.includes(request.method)) {
    return json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: route.methods.join(', '), ...noStore } });
  }
  return route.handler({ request, env, ctx, fetcher, services: services ?? buildServices(env, fetcher) });
}
