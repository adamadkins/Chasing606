// Loads Stripe.js on demand (only on the checkout page). Stripe requires that it
// is loaded from js.stripe.com rather than bundled. The release name must match
// the API version pinned in server/stripe.js ("endive" = 2026-09-30.endive).

const STRIPE_JS = 'https://js.stripe.com/endive/stripe.js';
let loading;

export function loadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = STRIPE_JS;
    script.async = true;
    script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error('The payment form could not start.')));
    script.onerror = () => {
      loading = undefined;
      reject(new Error('The payment form could not load. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Asks our server for a payment session for the bag. Returns Stripe's client secret and the session id. */
export async function createSession(items) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'We could not start checkout. Please try again.');
  return data;
}
