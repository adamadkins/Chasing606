# Stripe + Printful migration (development only)

The production shop currently uses Fourthwall. Do not replace its product feed or checkout until a Stripe account and a Printful store have been connected and end-to-end test orders have passed.

## Proposed architecture
- React checkout UI on Chasing 606, with Stripe Payment Element for card entry. Card numbers and CVC never pass through Chasing 606 code.
- Cloudflare Worker creates Stripe PaymentIntents using server-validated prices, product/variant mappings, shipping, and tax; never trust client-provided totals.
- A signed Stripe webhook confirms payment before creating a Printful order. Use idempotency and persistent order state to prevent duplicate fulfillment on webhook retries.
- Printful API provides product/variant mappings, shipping quotes, fulfillment status and tracking.
- Show a branded success page only after verifying payment state on the server. Do not treat a browser redirect as proof of payment.
- Keep secrets in Cloudflare Worker Secrets. Do not commit secrets or expose them via VITE_ variables.

## Before implementation can go live
1. Connect Austin's verified Stripe account; use test-mode keys during development.
2. Connect the intended Printful store and private API token, with minimum necessary scopes.
3. Decide which Printful products/variants replace existing Fourthwall products; IDs and images are not interchangeable.
4. Define retail prices, shipping rules, sales-tax responsibilities, refund/return policies and inventory/availability handling.
5. Set up durable order storage, Stripe webhook signature verification, idempotent fulfillment and alerting for failed orders.
6. Test successful payment, declined payment, duplicate webhook, refund, missing variant, shipping error, and Printful API outage.
7. Switch storefront only after explicit approval. Fourthwall remains active until then.

## Suggested Cloudflare secrets
- PRINTFUL_API_TOKEN
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

The Stripe publishable key is public configuration, not a secret.

**Status:** Architecture documented; production checkout unchanged. No payments are enabled by this document.
