# Chasing 606

The website for the Chasing 606 hunting channel: home, merch, our story, contact, and legal pages.
Built with React and Vite, served by a Cloudflare Worker.

- **Merch** comes live from the Chasing 606 [Spring storefront](https://chasing606.creator-spring.com) today (checkout happens on Spring). The site is also ready to switch to **on-site checkout with Stripe and Printify**; see [docs/CHECKOUT.md](docs/CHECKOUT.md). Try it locally with `SHOP_MODE=demo npm run dev`.
- **Latest video** is found automatically from the YouTube channel's public feed. No API key.
- **Contact forms** are delivered by [FormSubmit](https://formsubmit.co), so there is no mail server or database.

## Getting started

Requires Node.js 22.12 or newer (`.node-version` pins 22).

```sh
npm install
npm run dev        # http://localhost:3000 — includes the /api routes
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload. `/api/*` runs the same code as production. |
| `npm run build` | Production build into `dist/`. |
| `npm run preview` | Serves the production build (with `/api/*`). |
| `npm test` | Unit tests (`node --test`). |
| `npm run lint` | ESLint, including the React hooks rules. |
| `npm run check` | Lint, tests, and build — run this before pushing. |
| `npm run deploy` | Build and deploy with Wrangler. |

## Project layout

```
src/
  main.jsx, App.jsx        Entry point; route table, page layout, per-page title/meta
  pages/                   One file per page (Home, Merch, About, Contact, Legal, Developer, NotFound)
  components/
    layout/                Header, mobile menu, Footer, one-time logo Intro
    home/                  Hero, FeaturedGear, LatestVideo, StorySection
    shop/                  Product card/grid/filters and the product dialog (gallery + lightbox)
    ui/                    Icon, SocialLinks
  hooks/                   useCatalog, useReveal, useModalDialog, useFormSubmit, …
  lib/                     router, catalog helpers (pure, tested), formatting, <head> updates
  config/site.js           Name, email, store/YouTube/social URLs, navigation links
  data/                    Page content that is not layout: legal text, story slides
  assets/images/           Photos and logo (WebP). Imported, so Vite fingerprints and caches them
  styles/                  tokens.css (colors, spacing), base.css, components.css (buttons, shared bits)
server/
  api.js                   The JSON API router: products, latest video, checkout, webhook
  spring.js, printify.js   Product catalogs (Spring today, Printify for on-site checkout)
  stripe.js, checkout.js   Payment sessions, webhook verification, bag pricing
  fulfillment.js, orders.js  Send paid orders to Printify exactly once; the D1 order record
  demo.js, services.js     Fake shop for local testing; picks real or fake pieces by mode
  youtube.js               Finds the newest upload
  cache.js                 Edge cache that serves the last good copy if an upstream is down
worker/index.js            Cloudflare Worker entry: API first, everything else is static assets
public/                    Served as-is: favicon, OG image, fonts, robots.txt, sitemap.xml, _headers
tests/                     server/ and client/ unit tests
```

Each component keeps its CSS next to it (`Header.jsx` + `Header.css`). Colors and sizes that appear
in more than one place are variables in `src/styles/tokens.css`.

## Common changes

| I want to… | Edit |
| --- | --- |
| Change the contact email, social links, or nav | `src/config/site.js` |
| Reword the privacy / terms / shipping pages | `src/data/legal.jsx` (and the "Last updated" date there) |
| Change the homepage story slides | `src/data/story.js` (+ photos in `src/assets/images/`) |
| Change About page copy or photos | `src/pages/About.jsx` |
| Change a color | `src/styles/tokens.css` |
| Add or rename a page | Add a file in `src/pages/` and a line in the route table in `src/App.jsx`; add it to `public/sitemap.xml` |
| Change products, prices, photos | In Spring. The site picks it up within about five minutes. |

## How the shop works

`server/spring.js` fetches the public Spring storefront page and extracts its product data (Spring has
no public API). Products are cached at Cloudflare's edge for 5 minutes; if Spring is down or changes
its markup, the last good catalog is served for up to a day instead of an error. The browser gets a
small, normalised catalog, and every "Continue to Spring" button links to that product's exact Spring
listing. The site never handles payment or customer details.

If Spring ever changes its page format, `/api/products` returns an error and the shop shows a retry
message (or the cached catalog). The parser and its tests are in `server/spring.js` and
`tests/server/spring.test.js`.

## Deploying (Cloudflare Workers)

`wrangler.jsonc` deploys `worker/index.js` together with the built `dist/` assets. Connect the GitHub
repository in Cloudflare (Workers & Pages → Create → Import a repository) with the deploy command
`npx wrangler deploy` (the build runs automatically), or run `npm run deploy`.

- Only `/api/*` runs the Worker; every other path is served from static assets, and unknown paths fall
  back to `index.html` so the client-side router can show the page (or the 404 page).
- `public/_headers` sets security headers (including a Content-Security-Policy) and long-lived caching
  for fingerprinted files. If you add a new third-party service (analytics, another embed, another form
  provider), allow it in that file's `Content-Security-Policy` line or the browser will block it.
- Optional variable `YOUTUBE_CHANNEL_ID` overrides the channel the latest video is read from.
- On-site checkout needs more settings and a D1 database; see `.dev.vars.example` and [docs/CHECKOUT.md](docs/CHECKOUT.md).
- The canonical site URL is set in `src/config/site.js`, `index.html`, `robots.txt`, and
  `sitemap.xml`. Update all four if the domain changes.

## Brand assets

The white logo is `src/assets/images/logo.webp`; favicon, touch icon, and the social-share image
(`og-image.jpg`) are in `public/`. Saira is self-hosted in `public/fonts` with its license. Photography
is owner-provided and was resized for the web; keep originals elsewhere.
