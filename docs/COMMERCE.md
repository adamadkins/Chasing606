# Spring Storefront & Checkout

Austin manages all merchandise directly in Spring at https://chasing606.creator-spring.com. Public products from its catalog appear in the Chasing 606 shop automatically, with photography, prices, colors, sizes, and availability.

## Configuration
No API credential is required. The Worker reads Spring's public storefront data through `server/spring.js` and caches browser responses for five minutes.

## Checkout
Spring hosts the product selection, cart, payment, fulfillment, and order support. Spring does not publish a supported API for transferring a custom website cart, so the website links each product preview to its exact Spring listing instead of imitating a checkout it cannot safely maintain.

Keep the Spring storefront published and verify its branding, checkout, shipping, taxes, and support information directly in Spring's dashboard.

## Printful via the TLT Studios portal (opt-in)
Austin creates products in Printful and connects his store in the portal. The portal holds the Printful token; this Worker never calls Printful.

1. In the portal, the studio issues a site key for Austin: `POST /api/admin/site-feed/<client id>/key` (shown once).
2. Set it on this Worker: `npx wrangler secret put PORTAL_FEED_KEY`. Optional `PORTAL_FEED_URL` overrides `https://portal.tlt-studios.com/api/site/printful/products`.
3. While `PORTAL_FEED_KEY` is unset the site keeps using Spring. Once set, `/api/products` serves Printful products (`server/portal-feed.js`).

Checkout is **not** wired for Printful: `/api/checkout` returns 409 and products have no `shopUrl`. Set the key only once a checkout path (hosted platform or Stripe + Printful order webhook) is chosen, or products will display without a way to buy them.
