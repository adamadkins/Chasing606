// Reads the Worker's settings into one object. Secrets come from Cloudflare
// secrets (or .dev.vars locally); everything has a safe default.
//
// Shop mode decides where products come from and whether checkout is on-site:
//   spring   – current behaviour: products are read from Spring and link out to it
//   printify – products from Printify, on-site checkout with Stripe
//   demo     – fake products, fake payment, fake supplier (development only)

const toInt = (value, fallback) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

export function shopMode(env = {}) {
  if (env.SHOP_MODE === 'demo') return 'demo';
  if (env.PRINTIFY_API_TOKEN && env.PRINTIFY_SHOP_ID) return 'printify';
  return 'spring';
}

export function shippingConfig(env = {}) {
  return {
    flatCents: toInt(env.SHIPPING_FLAT_CENTS, 599),
    freeOverCents: toInt(env.FREE_SHIPPING_OVER_CENTS, 7500),
    countries: String(env.SHIPPING_COUNTRIES || 'US').split(',').map(code => code.trim().toUpperCase()).filter(Boolean)
  };
}

export function stripeConfig(env = {}) {
  const { STRIPE_SECRET_KEY: secretKey, STRIPE_PUBLISHABLE_KEY: publishableKey, STRIPE_WEBHOOK_SECRET: webhookSecret } = env;
  if (!secretKey || !publishableKey || !webhookSecret) return null;
  return { secretKey, publishableKey, webhookSecret, automaticTax: env.STRIPE_AUTOMATIC_TAX === 'true' };
}

/** What the browser needs to know about checkout (never includes secrets). */
export function publicCheckoutConfig(env = {}) {
  const mode = shopMode(env);
  const shipping = shippingConfig(env);
  const base = { shipping: { flatCents: shipping.flatCents, freeOverCents: shipping.freeOverCents }, automaticTax: env.STRIPE_AUTOMATIC_TAX === 'true' };
  if (mode === 'demo') return { ...base, mode: 'demo' };
  if (mode === 'printify') {
    const stripe = stripeConfig(env);
    return stripe ? { ...base, mode: 'stripe', publishableKey: stripe.publishableKey } : { ...base, mode: null };
  }
  return { ...base, mode: null };
}
