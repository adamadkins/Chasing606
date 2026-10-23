// Stripe, called directly over HTTPS (no SDK, so it runs on Workers unchanged).
// Docs: https://docs.stripe.com/checkout/embedded/quickstart
//
// The API version is pinned so Stripe's changes never alter behaviour under us.
// The browser must load the matching Stripe.js release (see src/lib/stripe.js).

export const STRIPE_API_VERSION = '2026-09-30.endive';
const API = 'https://api.stripe.com/v1';
const WEBHOOK_TOLERANCE_SECONDS = 300;

export class StripeError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

/** Stripe wants nested form fields: a[b][0][c]=d. */
export function formEncode(value, prefix = '', output = []) {
  if (value === undefined || value === null) return output;
  if (Array.isArray(value)) {
    value.forEach((item, index) => formEncode(item, `${prefix}[${index}]`, output));
  } else if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) formEncode(item, prefix ? `${prefix}[${key}]` : key, output);
  } else {
    output.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  }
  return output;
}

async function request(stripe, path, { method = 'GET', body, fetcher = fetch } = {}) {
  const response = await fetcher(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripe.secretKey}`,
      'Stripe-Version': STRIPE_API_VERSION,
      ...(body && { 'Content-Type': 'application/x-www-form-urlencoded' })
    },
    body: body ? formEncode(body).join('&') : undefined,
    signal: AbortSignal.timeout(20_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new StripeError(`Stripe returned HTTP ${response.status}: ${data.error?.message ?? 'unknown error'}`, response.status);
  return data;
}

// ---------------------------------------------------------------------------
// Checkout sessions
// ---------------------------------------------------------------------------

/**
 * @param input {{ lines: {name, description?, image?, unitCents, quantity}[], shipping: {cents, label},
 *   countries: string[], returnUrl: string, cart: string, automaticTax: boolean }}
 */
function sessionParams(input) {
  const tax = input.automaticTax ? { tax_behavior: 'exclusive' } : {};
  return {
    mode: 'payment',
    ui_mode: 'embedded_page',
    return_url: input.returnUrl,
    // Our own record of what to ship; the webhook trusts only this and Stripe's payment status.
    metadata: { cart: input.cart },
    line_items: input.lines.map(line => ({
      quantity: line.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: line.unitCents,
        ...tax,
        product_data: { name: line.name, description: line.description || undefined, images: line.image ? [line.image] : undefined }
      }
    })),
    shipping_address_collection: { allowed_countries: input.countries },
    phone_number_collection: { enabled: true },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        display_name: input.shipping.label,
        fixed_amount: { amount: input.shipping.cents, currency: 'usd' },
        ...tax
      }
    }],
    ...(input.automaticTax && { automatic_tax: { enabled: true } })
  };
}

const readAddress = address => ({
  line1: address?.line1 ?? '', line2: address?.line2 ?? '', city: address?.city ?? '',
  state: address?.state ?? '', postalCode: address?.postal_code ?? '', country: address?.country ?? ''
});

/** Reduce a Stripe Checkout Session to the fields this site uses. */
export function normalizeSession(session) {
  // Newer API versions keep the shipping address under `collected_information`.
  const shipping = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const details = session.customer_details ?? {};
  return {
    id: session.id,
    status: session.status, // open | complete | expired
    paid: session.payment_status === 'paid',
    email: details.email ?? '',
    amountTotalCents: session.amount_total ?? 0,
    cart: session.metadata?.cart ?? '',
    recipient: {
      name: shipping?.name || details.name || '',
      email: details.email ?? '',
      phone: details.phone ?? '',
      address: readAddress(shipping?.address ?? details.address)
    }
  };
}

export const stripePayments = (stripe, fetcher = fetch) => ({
  async createSession(input) {
    const session = await request(stripe, '/checkout/sessions', { method: 'POST', body: sessionParams(input), fetcher });
    return { id: session.id, clientSecret: session.client_secret };
  },
  async retrieveSession(id) {
    return normalizeSession(await request(stripe, `/checkout/sessions/${encodeURIComponent(id)}`, { fetcher }));
  },
  verifyWebhook: (rawBody, header) => verifyWebhook(stripe.webhookSecret, rawBody, header)
});

// ---------------------------------------------------------------------------
// Webhook signatures: https://docs.stripe.com/webhooks#verify-manually
// ---------------------------------------------------------------------------

const hexToBytes = hex => Uint8Array.from(hex.match(/../g) ?? [], pair => Number.parseInt(pair, 16));

/** Returns the parsed event, or throws if the signature is missing, wrong, or too old. */
export async function verifyWebhook(secret, rawBody, header, now = Date.now()) {
  const parts = String(header ?? '').split(',').map(part => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key, value]) => key === 'v1' && /^[0-9a-f]{64}$/i.test(value ?? '')).map(([, value]) => value);
  if (!timestamp || !signatures.length) throw new StripeError('Missing webhook signature.', 400);
  if (Math.abs(now / 1000 - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) throw new StripeError('Webhook timestamp is too old.', 400);

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signedPayload = new TextEncoder().encode(`${timestamp}.${rawBody}`);
  // `verify` compares in constant time.
  const results = await Promise.all(signatures.map(signature => crypto.subtle.verify('HMAC', key, hexToBytes(signature), signedPayload)));
  if (!results.some(Boolean)) throw new StripeError('Webhook signature does not match.', 400);
  return JSON.parse(rawBody);
}

/** Test helper: sign a payload the way Stripe does. */
export async function signWebhook(secret, rawBody, timestamp = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  return `t=${timestamp},v1=${[...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
