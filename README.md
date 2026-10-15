# Chasing 606

A responsive React storefront foundation for the Chasing 606 hunting channel.

## Development

Requires Node.js 22.12+ (validated on Node 24).

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

Production: `npm run build`. Serve the build with `npm run preview`.

## Catalog and commerce

`src/catalog.js` provides an asynchronous catalog adapter with illustrative products, prices, categories, sizes, and availability. Nothing is purchasable yet. The storefront renders these records; product details and category filters work, and unavailable products are labelled out of stock.

For launch, replace the adapter with Shopify Storefront API reads. Shopify Admin will manage products, variants, images, pricing, and inventory. Connect Printify to Shopify for fulfillment. Use Shopify-hosted checkout via a Storefront cart checkout URL; keep private Admin credentials on a server, never in browser code. Do not maintain a second hardcoded catalog after connecting Shopify. Configure token permissions and inventory/availability semantics before enabling checkout.

## Brand assets

The wordmark, garment illustrations, and product details are temporary concepts. The original SVG woodland texture is a placeholder, not licensed Bottomland artwork. Replace it with owner-provided or licensed artwork. The supplied profile picture has not been bundled; obtain an original high-resolution logo file for the header and products. The story photograph currently loads from Unsplash and web fonts from Google Fonts; replace with the channel's approved images and self-host assets before launch.

## Before launch

Connect and test Shopify/Printify with real variants, shipping, taxes, inventory states, checkout, and a test order. Supply approved branding, product photography, contact details, shipping/returns/privacy policies, and domain. This foundation does not collect payments or customer details.

## Automatic Cloudflare Pages previews

Connect this GitHub repository through Cloudflare Workers & Pages → Create application → Pages → Import an existing Git repository. Select production branch `main`, build command `npm run build`, and output directory `dist`; leave root directory blank. The `.node-version` file selects Node 24. Enable automatic production deployments. Every push to `main` triggers a new deployment at the same Pages URL. This is a build-and-refresh preview, not instant development-server hot reload.
