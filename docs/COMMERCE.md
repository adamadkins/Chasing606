# Spring Storefront & Checkout

Austin manages all merchandise directly in Spring at https://chasing606.creator-spring.com. Public products from its catalog appear in the Chasing 606 shop automatically, with photography, prices, colors, sizes, and availability.

## Configuration
No API credential is required. The Worker reads Spring's public storefront data through `server/spring.js` and caches browser responses for five minutes.

## Checkout
Spring hosts the product selection, cart, payment, fulfillment, and order support. Spring does not publish a supported API for transferring a custom website cart, so the website links each product preview to its exact Spring listing instead of imitating a checkout it cannot safely maintain.

Keep the Spring storefront published and verify its branding, checkout, shipping, taxes, and support information directly in Spring's dashboard.

## Printful via the TLT Studios portal (opt-in)
Austin creates products in Printful and connects his store in the portal. The portal holds the Printful token; this Worker never calls Printful.

1. Nothing to register by hand: once Austin has Printful and Stripe connected in the portal, and the portal has his domain on file, his shop switches on for that domain (and its `www` form) by itself. He can change the shipping fee or turn it off under Connections → Online shop. The studio can set an address by hand under Clients → Manage → Website shop.
2. `wrangler.jsonc` sets `PORTAL_SHOP=true`. **Merging this branch to `main` is the switch**: from then on `/api/products` serves Printful products and the Worker names itself to the portal with `X-Site-Origin` (`server/portal-feed.js`). Optional `PORTAL_FEED_URL` / `PORTAL_CHECKOUT_URL` override the portal addresses.
3. Merge only after the portal side is ready (Online shop showing On for his domain, Printful and Stripe connected, Stripe Tax on). Until `PORTAL_SHOP` is set the site uses Spring.

Checkout: the cart and bag work as before. `POST /api/checkout` sends variant ids and quantities to the portal (`/api/site/printful/checkout`), which prices them from Printful and returns a Stripe Checkout URL on Austin's account. After paying, Stripe returns the customer to `/merch?order=success`, which empties the bag and shows a thank-you. The portal places the Printful order when Stripe confirms payment. See `Client-Portal/INTEGRATIONS.md` ("Website checkout") for the portal setup.

The Privacy, Terms and Shipping & Returns text (`src/LegalPage.jsx`) now describes Stripe and Printful. Austin should read it before this goes live.
