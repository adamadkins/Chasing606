# Fourthwall shop

The active shop is https://chasing-606-shop.fourthwall.com. `src/shop.js` supplies the public link for desktop/mobile navigation, homepage, About page and footer. The bag icon opens the hosted shop; it does not claim to show a synchronized cart or item count. `/merch` and `/account` remain useful entry pages for existing links.

Products, prices, availability, checkout and account options are managed on Fourthwall. No API credentials are needed for this hosted-shop connection. The site does not embed a product feed or collect payment/account details. Old preview carts are no longer read. The previous Shopify adapter is retained as inactive code; API checkout returns 410 even if old Shopify variables remain configured.

The owner published the shop and its public HTTPS homepage returned HTTP 200 during verification. Verify products, shipping, policies and an order in Fourthwall before launch. The account page links to the shop rather than guessing an unverified sign-in URL; order confirmation emails provide order-specific links.

This website change does not cancel Shopify or Printful accounts or subscriptions.
