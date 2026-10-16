import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { createCheckout, variantFor } from './catalog';

const storageKey = 'chasing606-fourthwall-cart-v2';

export function useCart() {
  const [items, setItems] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(value)
        ? value.filter(i => typeof i.id === 'string' && typeof i.size === 'string' && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 10)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      /* Cart remains usable in memory */
    }
  }, [items]);

  function add(id, size, color = '', qty = 1, image = null) {
    const validQty = Math.max(1, Math.min(qty || 1, 10));
    setItems(previous => {
      const match = previous.find(i => i.id === id && i.size === size && (i.color || '') === (color || ''));
      if (match) {
        return previous.map(i => i === match ? { ...i, quantity: Math.min(i.quantity + validQty, 10), image: image || i.image } : i);
      }
      return [...previous, { id, size, color: color || '', quantity: validQty, image }];
    });
  }

  function quantity(id, size, color, next) {
    setItems(previous =>
      next <= 0
        ? previous.filter(i => !(i.id === id && i.size === size && (i.color || '') === (color || '')))
        : previous.map(i => (i.id === id && i.size === size && (i.color || '') === (color || '')) ? { ...i, quantity: Math.min(next, 10) } : i)
    );
  }

  function clear() {
    setItems([]);
  }

  return { items, add, quantity, clear };
}

export default function Cart({ open, onClose, cart, products, commerce, onOpenCheckout }) {
  const dialog = useRef(null);

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      const old = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        dialog.current?.close();
        document.body.style.overflow = old;
      };
    }
  }, [open]);

  const money = (amount, code = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);

  const lines = cart.items.map(item => {
    const product = products.find(p => p.id === item.id);
    const variant = variantFor(product, item.size, item.color);
    const displayImg = item.image || (item.color && product?.imagesByColor?.[item.color]) || variant?.image || product?.image;
    return {
      ...item,
      product,
      variant,
      displayImg,
      unitPrice: variant?.price ?? product?.price ?? 0,
      currencyCode: variant?.currencyCode ?? product?.currencyCode ?? 'USD'
    };
  }).filter(line => line.product);

  const subtotal = lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
  const freeShippingThreshold = 75;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const diffToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  function proceed() {
    onClose();
    if (onOpenCheckout) {
      onOpenCheckout(lines, subtotal);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="cart-drawer"
      aria-labelledby="cart-title"
      onCancel={onClose}
      onClick={event => {
        if (event.target === dialog.current) {
          const rect = dialog.current.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
            onClose();
          }
        }
      }}
    >
      <div className="cart-header">
        <div className="cart-header-title">
          <span className="cart-badge-dot" />
          <h2 id="cart-title">YOUR BAG</h2>
          <span className="cart-count">({cart.items.reduce((sum, item) => sum + item.quantity, 0)})</span>
        </div>
        <button className="cart-close-btn" onClick={onClose} aria-label="Close cart">
          <Icon name="close" />
        </button>
      </div>

      {subtotal > 0 && (
        <div className="free-shipping-bar">
          <div className="shipping-text">
            {diffToFreeShipping === 0 ? (
              <span><strong>✓ You qualify for Free US Shipping!</strong></span>
            ) : (
              <span>Add <strong>{money(diffToFreeShipping)}</strong> more for <strong>Free US Shipping</strong></span>
            )}
          </div>
          <div className="shipping-progress-track">
            <div className="shipping-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {lines.length > 0 ? (
        <>
          <div className="cart-lines">
            {lines.map(line => (
              <article className="cart-line-card" key={`${line.id}-${line.color}-${line.size}`}>
                <div className="cart-line-thumb">
                  {line.displayImg ? (
                    <img src={line.displayImg} alt={line.product.name} />
                  ) : (
                    <div className="cart-fallback-art">
                      <Icon name="bag" />
                    </div>
                  )}
                </div>
                <div className="cart-line-main">
                  <div className="cart-line-header">
                    <h3 className="cart-line-name">{line.product.name}</h3>
                    <span className="cart-line-price">{money(line.unitPrice * line.quantity, line.currencyCode)}</span>
                  </div>
                  <div className="cart-line-options">
                    {line.color && <span className="option-tag">Color: {line.color}</span>}
                    {line.size && <span className="option-tag">Size: {line.size}</span>}
                  </div>
                  <div className="cart-line-actions">
                    <div className="cart-stepper">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => cart.quantity(line.id, line.size, line.color, line.quantity - 1)}
                      >
                        −
                      </button>
                      <span aria-live="polite">{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={line.quantity >= 10}
                        onClick={() => cart.quantity(line.id, line.size, line.color, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="cart-remove-btn"
                      onClick={() => cart.quantity(line.id, line.size, line.color, 0)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="cart-footer">
            <div className="cart-subtotal-row">
              <span className="label">Subtotal</span>
              <span className="value">{money(subtotal, lines[0]?.currencyCode || 'USD')}</span>
            </div>
            <p className="cart-tax-notice">
              Taxes and shipping calculated at checkout. Free shipping over $75.
            </p>

            <button
              type="button"
              className="button story-watch cart-checkout-cta"
              onClick={proceed}
            >
              PROCEED TO SECURE CHECKOUT ➔
            </button>

            <div className="cart-trust-badges">
              <span>🔒 100% On-Site Checkout</span>
              <span>•</span>
              <span>256-Bit SSL Encrypted</span>
              <span>•</span>
              <span>Fast Tracked Shipping</span>
            </div>

            <button type="button" className="cart-continue-link" onClick={onClose}>
              ← Continue shopping
            </button>
          </div>
        </>
      ) : (
        <div className="empty-cart-view">
          <div className="empty-cart-icon">
            <Icon name="bag" />
          </div>
          <h3>Your bag is empty</h3>
          <p>Out here, you only carry what matters. Explore the official Chasing 606 collection and gear up for the season.</p>
          <a className="button story-watch" href="/merch" onClick={onClose}>
            EXPLORE THE GEAR <Icon />
          </a>
        </div>
      )}
    </dialog>
  );
}
