# Commerce and fulfillment

The website is provider-independent at the catalog boundary (`src/catalog.js`). The current optional connector is Shopify; no paid plan or live checkout is enabled by these code changes. Demo products remain available when both Shopify connection values are absent. An incomplete or failing live connection shows an error instead of silently substituting demo products.

## Choosing services

Printful and Printify produce and ship print-on-demand orders. Shopify manages the catalog, checkout, payments and customer accounts. The typical workflow is: design products in Printful/Printify → sync them into Shopify → publish them to the Headless sales channel → the custom site reads Shopify → paid Shopify orders go to the fulfillment provider.

Printful is a reasonable starting point for tees, hoodies and embroidered hats; compare samples and landed costs before choosing. Printify offers a network of print providers. Fourthwall combines a creator storefront with merchandise fulfillment on a free plan, but would require a different commerce adapter and account flow. Shopify customer accounts/Shop sign-in are not universal login services for other platforms.

## Optional Shopify setup

1. Create a Shopify store and choose the fulfillment provider. Link that provider using its official Shopify app. Sample the actual blanks and embroidered design before selling.
2. Install Shopify's Headless sales channel, create a storefront and obtain a **public Storefront API access token** with access to the published products and carts. This implementation uses `X-Shopify-Storefront-Access-Token`; do not supply an Admin API token or a private Storefront token in its place.
3. Publish intended products to that channel, including images, descriptions, product types (used as categories), variants, prices and stock. Variant option labels include every option, so color/size combinations remain distinct. The connector follows product and variant pagination.
4. In Cloudflare Workers → chasing606 → Settings → Variables and Secrets, set `SHOPIFY_STORE_DOMAIN` to the store's `name.myshopify.com` hostname and save `SHOPIFY_STOREFRONT_ACCESS_TOKEN` as a **secret**. These are runtime settings, not `VITE_` variables. Do not commit token values. For local development, use the gitignored `.env.local` and restart Vite.
5. `SHOPIFY_API_VERSION` defaults to `2026-10`. Keep `SHOPIFY_CHECKOUT_ENABLED=false` until validation is complete. Verify `/api/commerce`, `/api/products`, real prices/images/options, removed products, and sold-out variants.
6. Configure payments, shipping regions/rates, taxes, refund/return policies and fulfillment routing in Shopify. Confirm costs and supported delivery locations with the fulfillment provider.
7. When ready for a test order, set `SHOPIFY_CHECKOUT_ENABLED=true` and use Shopify's supported test payment setup. Verify an order and its fulfillment routing without accidentally ordering paid production samples. The server creates a Shopify cart using only variant IDs and quantities. Shopify determines the actual prices and availability. Any error, warning, or changed quantity keeps the shopper on the site to review the cart.

Preview cart contents are stored in the browser. Removed products/options are flagged and must be removed before checkout. Checkout is created fresh when requested; the site does not retain Shopify cart IDs, collect card details or submit payments itself. Customer checkout currency/shipping/taxes and final prices are confirmed by Shopify.

## Customer accounts and Shop

The `/account` page links to Shopify's hosted customer account experience. It does not implement its own password collection, OAuth token storage, or signed-in customer dashboard.

- Enable **customer accounts** (the current passwordless version) in Shopify Settings → Customer accounts.
- Activate **Shop Pay** to offer **Sign in with Shop**, subject to Shopify eligibility/settings. Shopify owns and renders that sign-in option; this site does not fake a standalone Shop button.
- Set `SHOPIFY_CUSTOMER_ACCOUNTS_ENABLED=true` only when accounts are ready. Optionally set `SHOPIFY_CUSTOMER_ACCOUNT_URL` to the exact HTTPS account URL shown in Shopify admin. Otherwise the link uses `https://STORE.myshopify.com/account`, which Shopify routes according to the store's account setup.
- Test sign-in, order history, sign-out and checkout behavior on the real store. Hosted authentication does not mean this custom site's header knows who is signed in. That would require a later Customer Account API integration.

## Validation

`node --test` covers configuration gating, secret omission, product/variant pagination, currencies, unavailable items, cart input validation, Shopify errors and changed quantities. Browser checks exercise demo mode and simulated live Shopify responses. Production Shopify connectivity, payments, Shop authentication and fulfillment cannot be verified without an actual configured store.

Official references:
- https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage
- https://help.shopify.com/en/manual/customers/customer-accounts/new-customer-accounts
- https://www.printful.com/pricing
- https://printify.com/pricing/
- https://fourthwall.com/pricing
