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

The website reads published products from Fourthwall and provides on-site product selection and a shopping bag. Fourthwall handles hosted checkout. Set the runtime secret `FOURTHWALL_STOREFRONT_TOKEN`; see [Commerce setup](docs/COMMERCE.md).

## Brand assets

The wordmark, garment illustrations, and product details are temporary concepts. The original SVG woodland texture is a placeholder, not licensed Bottomland artwork. Replace it with owner-provided or licensed artwork. The owner-provided white logo is bundled at `public/logo.png` and used on dark backgrounds in the sticky header, mobile menu, and footer. The landing photograph is owner-provided. Saira is self-hosted with its license in public/fonts; the story section uses the owner-provided hunting photograph.

## Before launch

Publish the Fourthwall shop and verify products, shipping, taxes, checkout, and a test order. Supply approved branding, product photography, contact details, shipping/returns/privacy policies, and domain. This foundation does not collect payments or customer details.

## Automatic Cloudflare Pages previews

Connect this GitHub repository through Cloudflare Workers & Pages → Create application → Pages → Import an existing Git repository. Select production branch `main`, build command `npm run build`, and output directory `dist`; leave root directory blank. The `.node-version` file selects Node 24. Enable automatic production deployments. Every push to `main` triggers a new deployment at the same Pages URL. This is a build-and-refresh preview, not instant development-server hot reload.


## Dynamic newest video

Cloudflare Pages automatically deploys `functions/api/latest-video.js` with the site. It reads YouTube's public Atom upload feed. If the feed fails, it reads the channel's Videos tab in Latest order and verifies the channel identity before selecting the first video. This fallback selects regular videos, not Shorts, and returns no publication timestamp rather than inventing one. The newest published upload (including Shorts if present in the feed) is cached at the edge for 15 minutes and in the browser for 5 minutes. Visitors load the embedded player only after clicking Play. No API key or manual video URL is needed.

The endpoint defaults to the verified Chasing606 ID `UCl9Y60eT8tlw0VEvcLcPijA`. An optional Cloudflare variable `YOUTUBE_CHANNEL_ID` can override the feed ID. No credential is required. If YouTube blocks a request or the feed is unavailable, the page links to the channel's videos instead of showing an incorrect upload. `npm run dev` serves the same endpoint locally. `npm run preview` serves only the static bundle, so use development mode or Cloudflare to test the endpoint.

Validation: `node --test` tests channel lookup, latest-upload selection, XML decoding, and unavailable/invalid feed handling. The fallback was also verified against a live YouTube Videos page after reproducing HTTP 404 from the verified channel feed.

### Current hosting: Cloudflare Workers

The current address is https://chasing606.adkins-adam04.workers.dev/. `wrangler.jsonc` deploys `worker/index.js` and the built `dist` assets together. Use the Cloudflare deploy command `npx wrangler deploy`. Wrangler runs `npm run build` through its configured custom build step, so a separate Cloudflare build command is optional. Requests to `/api/*` run the Worker; other requests serve static assets. The same feed implementation remains compatible with Pages. A static-assets-only deploy will not run the video feed, so retain the Worker entry point and asset binding in the configuration.

## Pages, contact, and preview cart

- `/` is the channel homepage; `/merch` displays the live Fourthwall catalog; `/contact` contains contact details and an email-draft composer. The Workers SPA fallback supports direct visits to each path.
- The contact form opens a `mailto:` draft addressed to `chasingbucks606@gmail.com`. The visitor reviews and sends it in their email app. It does not send mail from a server or show a false delivery confirmation. Server-side form delivery would require an email service and its credentials.
- The bag icon opens the on-site cart. Selected real products persist locally; checkout creates a validated Fourthwall cart and redirects for payment.
- The centered header uses `public/logo.png` (the original logo), with a modest overhang below the dark sticky header. The alternative upload is retained as `public/header-logo.png`. The original image files are preserved without editing. The landing photograph is framed around the deer with less enlargement; higher-resolution source photography would be needed for more actual detail.
