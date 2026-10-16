import React, { useState } from 'react';
import { createCheckout } from './catalog';

// Payment, shipping, taxes, and order confirmation are handled by Fourthwall.
// This component never collects card details or creates simulated orders.
export default function CheckoutModal({ open, onClose, lines = [] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function proceed() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (!lines.length || lines.some(line => !line.variant?.id || !line.variant.available || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10)) {
        throw new Error('Some items are unavailable. Please review your bag.');
      }
      const url = await createCheckout(lines.map(line => ({
        merchandiseId: line.variant.id,
        quantity: line.quantity
      })));
      const destination = new URL(url);
      if (destination.protocol !== 'https:' || destination.hostname !== 'chasing-606-shop.fourthwall.com') {
        throw new Error('Checkout returned an unexpected destination.');
      }
      window.location.assign(destination.href);
    } catch (err) {
      setError(err.message || 'Checkout is temporarily unavailable.');
      setBusy(false);
    }
  }

  return (
    <div className="product-modal-backdrop" onClick={busy ? undefined : onClose}>
      <section className="product-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="secure-checkout-title" onClick={event => event.stopPropagation()} style={{maxWidth: '34rem', padding: '2rem'}}>
        <button type="button" className="modal-close-trigger" onClick={onClose} disabled={busy} aria-label="Close checkout">×</button>
        <h2 id="secure-checkout-title">Secure checkout</h2>
        <p>You'll complete shipping, payment, and your order through Chasing 606's official Fourthwall checkout.</p>
        <p>Final prices, shipping, and taxes are calculated by Fourthwall.</p>
        {error && <p role="alert" className="cart-error">{error}</p>}
        <button type="button" className="button story-watch" disabled={busy || !lines.length} onClick={proceed}>
          {busy ? 'Connecting to checkout…' : 'CONTINUE TO SECURE CHECKOUT'}
        </button>
      </section>
    </div>
  );
}
