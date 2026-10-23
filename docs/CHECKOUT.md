# On-site checkout (Stripe + Printify)

Customers fill a bag on our site and pay in Stripe's payment form, embedded in our page. When Stripe confirms
payment, our Worker sends the order to Printify, which prints, packs, and ships it and emails the customer
tracking. No monthly fees: Stripe takes 2.9% + 30¢ per US card sale, and Printify charges only the product
and shipping cost of each order.

The site runs in one of three modes, chosen by settings (`server/config.js`):

| Mode | When | Behaviour |
| --- | --- | --- |
| `spring` | No Printify settings (today's default) | Products come from Spring and link out to it. Nothing changes. |
| `printify` | `PRINTIFY_API_TOKEN` and `PRINTIFY_SHOP_ID` are set | Products come from Printify. If the Stripe settings are also set, checkout is on-site. |
| `demo` | `SHOP_MODE=demo` | Fake products, fake payment, fake supplier, for trying the flow locally. Never use in production. |

Try it now, with no accounts: `SHOP_MODE=demo npm run dev`, then add something to the bag and check out.

## How an order flows

```
Browser                      Worker (our code)                 Stripe            Printify
  bag (localStorage)
  POST /api/checkout  ───►  re-price from the catalog  ───►  create Checkout Session
  ◄── client secret         (browser prices are ignored)
  Stripe form (iframe) ─────────────── customer pays ───────►
                                                   ◄── webhook: checkout.session.completed
                            verify signature, claim order in D1
                            read the paid session back  ───►
                            create order  ──────────────────────────────────►
                            send to production  ────────────────────────────►
  /order/complete  ──────►  GET /api/order-status (paid?)
```

Safety rules built in (all covered by tests in `tests/server/`):

- Prices and stock always come from our server's catalog; the browser only says *which* variants and how many.
- The webhook's signature is verified, and the order is only sent when Stripe says it is `paid`.
- Each payment is recorded in a D1 database before anything is sent, so a repeated webhook can never create a
  second Printify order. A half-finished order resumes where it stopped.
- Retryable failures (Printify down) make Stripe redeliver. Permanent ones (bad address, product removed), or
  six failed attempts, stop retrying and email Austin everything needed to fix it by hand.
- No customer details are stored by us; the address is re-read from Stripe when needed. Card data never touches our code.

## Setup checklist

1. **Printify**: create a shop (type: "API" / manual order). Create products and publish them. Generate a
   Personal Access Token (My Profile → Connections). Note the shop id.
2. **Stripe**: activate the account. In test mode, copy the publishable and secret keys. Add a webhook
   endpoint `https://<site>/api/stripe-webhook` for the events `checkout.session.completed` and
   `checkout.session.async_payment_succeeded`; copy its signing secret. In Settings → Emails, turn on
   "Successful payments" receipts. Optionally set up Stripe Tax (see below).
3. **Resend** (free, for problem alerts): create an account and an API key. `ALERT_EMAIL` must be the account's email.
4. **Cloudflare**: add the settings from `.dev.vars.example` under Settings → Variables and Secrets (mark the
   tokens/keys as Secrets). The first `wrangler deploy` creates the `DB` database automatically.
5. **Printify order approval**: set the shop to *manual* approval. (Our Worker approves each order itself
   once payment is confirmed; without this Printify may also auto-approve after 24 hours.)
6. Deploy. The shop now reads from Printify and shows "Add to bag".

## Before taking real money

- [ ] Place a **test-mode** order end to end (Stripe test card `4242 4242 4242 4242`). Confirm the order appears
      in Printify and is sent to production, then cancel it in Printify so nothing prints.
- [ ] Confirm product photos, colors, sizes and prices look right on the site.
- [ ] Order a **sample** of every product (especially hats) from the chosen print partner.
- [ ] Decide shipping: `SHIPPING_FLAT_CENTS` (default 599) and `FREE_SHIPPING_OVER_CENTS` (default 7500) are placeholders.
      Compare against Printify's real shipping cost per product. Orders with items from different print partners ship in separate packages.
- [ ] Sales tax: Kentucky requires a sales-tax permit for taxable goods. Turn on Stripe Tax and set
      `STRIPE_AUTOMATIC_TAX=true` once registered, and ask an accountant about resale certificates for Printify purchases.
- [ ] Update the Privacy, Terms, and Shipping & Returns pages (`src/data/legal.jsx`); they still describe Spring.
- [ ] Switch Stripe to live keys and re-create the webhook endpoint in live mode.
- [ ] Place one small live order yourself.

## When an order needs attention

Austin gets an email titled "order needs your attention" with the payment id, customer, items, and the problem.
Either fix it in Printify (or create the order there by hand), or refund the payment in the Stripe Dashboard.
The order is marked `needs_attention` in the `orders` table and will not retry by itself.

Refunds and cancellations are done by hand in Stripe and Printify. The site does not automate them.

## Known limits / not yet verified

- The Printify product and order shapes follow Printify's documentation but have **not been run against a live
  shop**; the first test order is the real check. Pay particular attention to: photo hosts (allowed:
  `*.printify.com`), `send_to_production`, and how variant options map to colors and sizes.
- If a Printify order is created but its response is lost, a retry could create a duplicate. This is rare; the
  alert email includes the payment id so a duplicate can be spotted and cancelled.
- Stripe's API and Stripe.js are pinned to the `2026-09-30.endive` release (`server/stripe.js`,
  `src/lib/stripe.js`). Update both together.
- Shipping is a flat rate, not a live quote, and is US-only by default.
- There is no customer account or order-history page; Stripe and Printify emails cover receipts and tracking.
- Anyone can create Stripe checkout sessions from the public endpoint (they expire unpaid). Add Cloudflare
  rate limiting or Turnstile if that ever becomes noisy.
