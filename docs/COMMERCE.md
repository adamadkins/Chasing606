# Spring Storefront & Checkout

Austin manages all merchandise directly in Spring at https://chasing606.creator-spring.com. Public products from its catalog appear in the Chasing 606 shop automatically, with photography, prices, colors, sizes, and availability.

## Configuration
No API credential is required. The Worker reads Spring's public storefront data through `server/spring.js` and caches browser responses for five minutes.

## Checkout
Spring hosts the product selection, cart, payment, fulfillment, and order support. Spring does not publish a supported API for transferring a custom website cart, so the website links each product preview to its exact Spring listing instead of imitating a checkout it cannot safely maintain.

Keep the Spring storefront published and verify its branding, checkout, shipping, taxes, and support information directly in Spring's dashboard.
