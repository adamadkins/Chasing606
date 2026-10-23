# Notes on how the site is built

Short explanations of choices that are not obvious from the code.

- **Own tiny router (`src/lib/router.jsx`)** instead of a library. The site has seven pages and no
  nested routes. It gives client-side navigation, hash scrolling, scroll restoration, and focus
  management, and links are still real `<a href>`s.
- **Native `<dialog>` for the product window and photo viewer.** The browser provides focus
  trapping, Escape, and focus return, so there is no custom scroll-lock or portal code. The photo
  viewer is a second dialog stacked on the first.
- **Radio inputs for color and size.** Styled through their labels, so arrow keys and screen readers
  behave like any native radio group.
- **Server owns the product shape.** `server/spring.js` turns Spring's raw data into a small catalog
  (one entry per product, variants without repeated photo lists). The browser never parses Spring data.
- **Product photos are requested at display size.** Spring's image service serves any square size from
  the same URL; cards ask for 600px instead of 1200px (`imageAtSize` in `src/lib/catalog.js`).
- **Stale-if-error caching (`server/cache.js`).** Spring and YouTube are not ours, so a failed refresh
  serves the last good copy rather than breaking the shop or the video section.
- **Scroll reveals are opt-in per element** (`data-reveal`) and only hide content once JavaScript has
  run, so nothing stays invisible if scripts fail. They are skipped for reduced motion.
- **Features that were removed:** the on-site cart and checkout, and the Shopify, Fourthwall, and
  Printful integrations. Spring has no cart API, so the site links to Spring instead. They remain in
  git history if ever needed.
