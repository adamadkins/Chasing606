import React, { useEffect, useRef, useState } from 'react';
import { createCheckout } from './catalog';

// Customers proceed straight to Fourthwall. Keep an error screen only if redirect fails.
export default function CheckoutModal({ open, onClose, lines = [] }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const redirecting = useRef(false);

  async function redirectToCheckout() {
    if (redirecting.current) return;
    redirecting.current = true;
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
      redirecting.current = false;
    }
  }

  useEffect(() => {
    if (open) {
      redirectToCheckout();
    } else {
      redirecting.current = false;
      setBusy(false);
      setError('');
    }
  }, [open]);

  // Keep the current page visible while the checkout request completes.
  // Only show a dialog if something prevents the redirect.
  if (!open || !error) return null;
  return (
    <div className="product-modal-backdrop" onClick={busy ? undefined : onClose}>
      <section className="product-modal-dialog" role="dialog" aria-modal="true" aria-label="Checkout" onClick={event => event.stopPropagation()} style={{maxWidth:'28rem',padding:'2rem'}}>
        <h2>Checkout unavailable</h2>
        <p role="alert" className="cart-error">{error}</p>
        <button className="button story-watch" type="button" onClick={redirectToCheckout}>TRY AGAIN</button>
        <button type="button" onClick={onClose} className="modal-buy-now-btn">BACK TO CART</button>
      </section>
    </div>
  );
}
