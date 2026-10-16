# Fourthwall Storefront & Checkout

Austin manages all merchandise directly in Fourthwall at https://chasing-606-shop.fourthwall.com. Public products from its catalog appear in the Chasing 606 shop automatically, with photography, prices, colors, sizes, and live inventory.

## Configuration
Set `FOURTHWALL_STOREFRONT_TOKEN` as a Cloudflare Worker runtime **Secret** (or in `.env.local` for local development). Never prefix with `VITE_` and never commit tokens. All communication is routed securely via `server/fourthwall.js`.

## Customizing the Fourthwall Checkout Screen
Fourthwall hosts the final checkout page (e.g. `https://chasing-606-shop.fourthwall.com/checkout/...`). To make the checkout page look fully branded and cohesive with the Chasing 606 design:
1. Log in to the Fourthwall Dashboard: https://admin.fourthwall.com
2. Navigate to **Design & Theme** (or **Settings > Branding**).
3. **Upload Logo**: Upload the official Chasing 606 logo (`public/header-logo.png` or `public/logo.png`) to display prominently at the top of checkout.
4. **Set Brand Colors**:
   - Primary Accent: `#c2ad84` (warm gold) or `#303b2b` (dark pine)
   - Background: Dark (`#181d16`) or Cream (`#f8f7f2`)
5. Save changes. The checkout screen will instantly adopt the custom Chasing 606 identity.

Official references:
- https://docs.fourthwall.com/storefront/products
- https://docs.fourthwall.com/storefront/cart-checkout-tutorial
- https://docs.fourthwall.com/storefront/checkout
