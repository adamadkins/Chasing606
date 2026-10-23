import { useRef } from 'react';
import useCart from '../../hooks/useCart';
import useCatalog from '../../hooks/useCatalog';
import useModalDialog from '../../hooks/useModalDialog';
import { MAX_QUANTITY, shippingQuote } from '../../lib/cart';
import { imageAtSize } from '../../lib/catalog';
import { formatMoney } from '../../lib/format';
import { Link } from '../../lib/router';
import Icon from '../ui/Icon';
import './CartDrawer.css';

export function ShippingNote({ subtotal, shipping }) {
  const quote = shippingQuote(subtotal, shipping);
  if (!subtotal) return null;
  if (quote.free) return <p className="shipping-note is-free">You’ve earned free shipping.</p>;
  if (quote.remaining > 0) return <p className="shipping-note">Add <strong>{formatMoney(quote.remaining)}</strong> more for free shipping.</p>;
  return null;
}

/** The slide-in shopping bag. Mounted only while open. */
export default function CartDrawer() {
  const cart = useCart();
  const { checkout } = useCatalog();
  const dialog = useRef(null);
  const closeOnBackdrop = useModalDialog(dialog, cart.closeBag);
  const quote = shippingQuote(cart.subtotal, checkout.shipping);
  const empty = cart.lines.length === 0;

  return (
    <dialog ref={dialog} className="cart-drawer" aria-labelledby="cart-title" onClick={closeOnBackdrop}>
      <div className="cart-drawer__panel">
        <header className="cart-drawer__header">
          <h2 id="cart-title">Your bag{cart.count > 0 && <span> ({cart.count})</span>}</h2>
          <button type="button" className="cart-drawer__close" aria-label="Close bag" onClick={() => dialog.current.close()}><Icon name="close" /></button>
        </header>

        {empty ? (
          <div className="cart-drawer__empty">
            <Icon name="bag" />
            <p>Your bag is empty.</p>
            <Link href="/merch" className="btn btn--dark" onClick={() => dialog.current.close()}>SHOP THE GEAR <Icon /></Link>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {cart.lines.map(line => (
                <li key={line.key} className={`cart-line${line.unavailable ? ' is-unavailable' : ''}`}>
                  <div className="cart-line__photo">
                    {line.image ? <img src={imageAtSize(line.image, 200)} alt="" /> : <Icon name="bag" />}
                  </div>
                  <div className="cart-line__info">
                    <h3>{line.product.name}</h3>
                    <p>{[line.variant.color, line.variant.size].filter(value => value && value !== 'Standard' && value !== 'One size').join(' / ') || line.product.type}</p>
                    {line.unavailable ? (
                      <p className="cart-line__warning" role="alert">Sold out. Remove it to check out.</p>
                    ) : (
                      <div className="stepper" role="group" aria-label={`Quantity for ${line.product.name}`}>
                        <button type="button" aria-label="Decrease quantity" onClick={() => cart.setQuantity(line.key, line.quantity - 1)}>−</button>
                        <span aria-live="polite">{line.quantity}</span>
                        <button type="button" aria-label="Increase quantity" disabled={line.quantity >= MAX_QUANTITY} onClick={() => cart.setQuantity(line.key, line.quantity + 1)}>+</button>
                      </div>
                    )}
                  </div>
                  <div className="cart-line__price">
                    {!line.unavailable && <span>{formatMoney(line.unitPrice * line.quantity, line.product.currency)}</span>}
                    <button type="button" className="cart-line__remove" onClick={() => cart.remove(line.key)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="cart-drawer__footer">
              <ShippingNote subtotal={cart.subtotal} shipping={checkout.shipping} />
              <dl className="totals">
                <div><dt>Subtotal</dt><dd>{formatMoney(cart.subtotal)}</dd></div>
                <div><dt>Shipping</dt><dd>{quote.free ? 'Free' : formatMoney(quote.amount)}</dd></div>
              </dl>
              {checkout.automaticTax && <p className="cart-drawer__fine">Sales tax, if any, is added at checkout.</p>}
              <Link
                href="/checkout"
                className={`btn btn--dark btn--block${cart.hasUnavailable || !cart.count ? ' is-disabled' : ''}`}
                aria-disabled={cart.hasUnavailable || !cart.count}
                onClick={event => {
                  if (cart.hasUnavailable || !cart.count) event.preventDefault();
                  else dialog.current.close();
                }}
              >
                CHECKOUT · {formatMoney(cart.subtotal + quote.amount)} <Icon />
              </Link>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}
