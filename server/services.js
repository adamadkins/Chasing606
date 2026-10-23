// Chooses the real or pretend implementations for the current shop mode.
// Everything downstream (checkout, fulfillment, API routes) talks to this shape,
// which is also what the tests replace with fakes.

import { shopMode, stripeConfig } from './config.js';
import { demoServices } from './demo.js';
import { printifyFulfiller, loadPrintifyCatalog } from './printify.js';
import { loadSpringCatalog } from './spring.js';
import { stripePayments } from './stripe.js';

let demo;

export function buildServices(env = {}, fetcher = fetch) {
  const mode = shopMode(env);
  if (mode === 'demo') return (demo ??= demoServices());

  if (mode === 'printify') {
    const stripe = stripeConfig(env);
    return {
      mode,
      automaticTax: Boolean(stripe?.automaticTax),
      catalog: { load: async () => ({ products: await loadPrintifyCatalog(env, fetcher) }) },
      payments: stripe ? stripePayments(stripe, fetcher) : null,
      fulfiller: printifyFulfiller(env, fetcher)
    };
  }

  return { mode, catalog: { load: () => loadSpringCatalog(fetcher) }, payments: null, fulfiller: null };
}
