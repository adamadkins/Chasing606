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

The wordmark, garment illustrations, and product details are temporary concepts. The original SVG woodland texture is a placeholder, not licensed Bottomland artwork. Replace it with owner-provided or licensed artwork. The supplied profile picture has not been bundled; obtain an original high-resolution logo file for the header and products. The landing photograph is owner-provided. Saira is self-hosted with its license in public/fonts; the story section uses the original woodland placeholder.

## Before launch

Connect and test Shopify/Printify with real variants, shipping, taxes, inventory states, checkout, and a test order. Supply approved branding, product photography, contact details, shipping/returns/privacy policies, and domain. This foundation does not collect payments or customer details.

## Automatic Cloudflare Pages previews

Connect this GitHub repository through Cloudflare Workers & Pages → Create application → Pages → Import an existing Git repository. Select production branch `main`, build command `npm run build`, and output directory `dist`; leave root directory blank. The `.node-version` file selects Node 24. Enable automatic production deployments. Every push to `main` triggers a new deployment at the same Pages URL. This is a build-and-refresh preview, not instant development-server hot reload.


## Dynamic newest video

Cloudflare Pages automatically deploys `functions/api/latest-video.js` with the site. It resolves the Chasing606 handle to its channel ID and reads YouTube's public Atom upload feed. The newest published upload (including Shorts if present in the feed) is cached at the edge for 15 minutes and in the browser for 5 minutes. Visitors load the embedded player only after clicking Play. No API key or manual video URL is needed.

An optional Cloudflare variable `YOUTUBE_CHANNEL_ID` can hold the channel's public UC… ID to skip handle resolution. No credential is required. If YouTube blocks a request or the feed is unavailable, the page links to the channel's videos instead of showing an incorrect upload. `npm run dev` serves the same endpoint locally. `npm run preview` serves only the static bundle, so use development mode or Cloudflare to test the endpoint.

Validation: `node --test` tests channel lookup, latest-upload selection, XML decoding, and unavailable/invalid feed handling. Live YouTube retrieval could not be verified in the coding workspace because its outbound YouTube requests are blocked; check `/api/latest-video` on the deployed Pages domain. The successful player UI was tested with a simulated feed response, separately from the real unavailable-feed response.

### Current hosting: Cloudflare Workers

The current address is https://chasing606.adkins-adam04.workers.dev/. `wrangler.jsonc` deploys `worker/index.js` and the built `dist` assets together. Use the Cloudflare deploy command `npx wrangler deploy`. Wrangler runs `npm run build` through its configured custom build step, so a separate Cloudflare build command is optional. Requests to `/api/*` run the Worker; other requests serve static assets. The same feed implementation remains compatible with Pages. A static-assets-only deploy will not run the video feed, so retain the Worker entry point and asset binding in the configuration.
