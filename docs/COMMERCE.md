# Fourthwall storefront

Austin manages products in Fourthwall. Public regular products from its built-in `all` collection appear in the Chasing606 catalog automatically, with images, prices, color/size options and availability. The website fetches on page load and window focus; refresh an already-open tab to see changes. Hidden, private and archived items are excluded. Bundles are not supported by this initial integration.

Set `FOURTHWALL_STOREFRONT_TOKEN` as a Cloudflare Worker runtime **Secret**. For development it may be placed in gitignored `.env.local`. Never commit it or use a VITE_ variable. No Shopify settings are needed. `server/fourthwall.js` calls the Storefront API; errors do not expose upstream URLs or tokens.

The `/merch` page, product options and persistent shopping bag are on Chasing606. Checkout rechecks the current public catalog, creates a Fourthwall cart from variant IDs and quantities only, verifies the returned items, and redirects to https://chasing-606-shop.fourthwall.com/checkout/ for shipping, taxes and payment. Fourthwall sets final prices and availability. No card details are collected by this site. Refresh and review the bag if stock changes.

The account page links to Fourthwall; no custom customer login or Shop sign-in is implemented. Use order confirmation emails for order-specific links. The older Shopify adapter remains inactive.

Official references:
- https://docs.fourthwall.com/storefront/products
- https://docs.fourthwall.com/storefront/cart-checkout-tutorial
- https://docs.fourthwall.com/storefront/checkout

Before launch, verify shipping settings, checkout branding, return policies and a complete test purchase in Fourthwall. Creating a checkout cart does not place an order or charge a customer.
