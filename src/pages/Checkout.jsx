import { useEffect, useRef, useState } from 'react';
import { ShippingNote } from '../components/shop/CartDrawer';
import Icon from '../components/ui/Icon';
import useCart from '../hooks/useCart';
import useCatalog from '../hooks/useCatalog';
import { shippingQuote } from '../lib/cart';
import { imageAtSize } from '../lib/catalog';
import { formatMoney } from '../lib/format';
import { Link, useRouter } from '../lib/router';
import { createSession, loadStripeJs } from '../lib/stripe';
import './Checkout.css';

function Message({ title, children }) {
  return (
    <section className="checkout page-shell checkout--message">
      <h1>{title}</h1>
      <p>{children}</p>
      <Link href="/merch" className="btn btn--dark">BACK TO THE GEAR <Icon /></Link>
    </section>
  );
}

function OrderSummary({ cart, checkout }) {
  const quote = shippingQuote(cart.subtotal, checkout.shipping);
  return (
    <aside className="checkout__summary" aria-labelledby="summary-title">
      <h2 id="summary-title">Your order</h2>
      <ul>
        {cart.lines.map(line => (
          <li key={line.key}>
            <div className="checkout__photo">
              {line.image ? <img src={imageAtSize(line.image, 200)} alt="" /> : <Icon name="bag" />}
              <span className="checkout__qty" aria-label={`Quantity ${line.quantity}`}>{line.quantity}</span>
            </div>
            <div>
              <strong>{line.product.name}</strong>
              <small>{[line.variant.color, line.variant.size].filter(value => value && value !== 'Standard' && value !== 'One size').join(' / ')}</small>
            </div>
            <span>{formatMoney(line.unitPrice * line.quantity, line.product.currency)}</span>
          </li>
        ))}
      </ul>
      <ShippingNote subtotal={cart.subtotal} shipping={checkout.shipping} />
      <dl className="totals">
        <div><dt>Subtotal</dt><dd>{formatMoney(cart.subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>{quote.free ? 'Free' : formatMoney(quote.amount)}</dd></div>
        {checkout.automaticTax && <div><dt>Tax</dt><dd>Calculated next</dd></div>}
        <div className="totals__total"><dt>Total</dt><dd>{formatMoney(cart.subtotal + quote.amount)}</dd></div>
      </dl>
      <button type="button" className="text-link" onClick={cart.openBag}>Edit your bag</button>
    </aside>
  );
}

/** Stripe's payment form, mounted inside our page. The card details never touch our servers. */
function StripePayment({ items, publishableKey }) {
  const mount = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let embedded;
    (async () => {
      try {
        const Stripe = await loadStripeJs();
        const stripe = Stripe(publishableKey);
        embedded = await stripe.createEmbeddedCheckoutPage({ fetchClientSecret: async () => (await createSession(items)).clientSecret });
        if (cancelled) embedded.destroy();
        else embedded.mount(mount.current);
      } catch (failure) {
        if (!cancelled) setError(failure.message);
      }
    })();
    return () => {
      cancelled = true;
      embedded?.destroy();
    };
  }, [items, publishableKey]);

  return (
    <>
      {error && <p className="checkout__error" role="alert">{error}</p>}
      <div ref={mount} className="checkout__stripe" />
    </>
  );
}

/** Development stand-in for the payment form (SHOP_MODE=demo). */
function DemoPayment({ items, total }) {
  const { navigate } = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createSession(items).then(session => { if (!cancelled) setSessionId(session.sessionId); }).catch(failure => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [items]);

  async function pay(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPaying(true);
    setError('');
    const response = await fetch('/api/demo/pay', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        recipient: {
          name: form.get('name'), email: form.get('email'),
          address: { line1: form.get('line1'), city: form.get('city'), state: form.get('state'), postalCode: form.get('zip'), country: 'US' }
        }
      })
    });
    if (response.ok) navigate(`/order/complete?session_id=${sessionId}`);
    else { setError((await response.json().catch(() => ({}))).error || 'The demo payment failed.'); setPaying(false); }
  }

  return (
    <form className="checkout__demo" onSubmit={pay}>
      <p className="checkout__demo-banner">Demo checkout. No real payment is taken and nothing is shipped.</p>
      <label>Name<input name="name" required autoComplete="name" defaultValue="Pat Hunter" /></label>
      <label>Email<input name="email" type="email" required autoComplete="email" defaultValue="pat@example.com" /></label>
      <label>Street address<input name="line1" required autoComplete="address-line1" defaultValue="1 Main Street" /></label>
      <div className="checkout__demo-row">
        <label>City<input name="city" required autoComplete="address-level2" defaultValue="Hazard" /></label>
        <label>State<input name="state" required autoComplete="address-level1" defaultValue="KY" maxLength={2} /></label>
        <label>ZIP<input name="zip" required autoComplete="postal-code" defaultValue="41701" /></label>
      </div>
      {error && <p className="checkout__error" role="alert">{error}</p>}
      <button className="btn btn--dark btn--block" disabled={!sessionId || paying}>{paying ? 'PLACING ORDER…' : `PAY ${formatMoney(total)} (DEMO)`}</button>
    </form>
  );
}

export default function Checkout() {
  const catalog = useCatalog();
  const cart = useCart();

  if (catalog.status === 'loading') return <Message title="Checkout">Loading your bag…</Message>;
  if (catalog.status === 'error') return <Message title="Checkout">We couldn’t load the shop. Please refresh to try again.</Message>;
  if (!catalog.checkout.mode) return <Message title="Checkout isn’t open yet">Online checkout is coming soon. In the meantime, you can browse the gear.</Message>;
  if (!cart.count && !cart.hasUnavailable) return <Message title="Your bag is empty">Add something from the collection to check out.</Message>;
  if (cart.hasUnavailable) return <Message title="An item is sold out">Something in your bag is no longer available. Open your bag to remove it.</Message>;

  const items = cart.items.filter(item => cart.lines.some(line => line.key === `${item.productId}:${item.variantId}`));
  const quote = shippingQuote(cart.subtotal, catalog.checkout.shipping);
  // Changing the bag starts a fresh payment session.
  const bagKey = items.map(item => `${item.productId}:${item.variantId}:${item.quantity}`).join(';');

  return (
    <section className="checkout page-shell">
      <div className="page-heading"><p className="eyebrow">Secure checkout</p><h1>Checkout.</h1></div>
      <div className="checkout__grid">
        <div className="checkout__pay">
          {catalog.checkout.mode === 'stripe'
            ? <StripePayment key={bagKey} items={items} publishableKey={catalog.checkout.publishableKey} />
            : <DemoPayment key={bagKey} items={items} total={cart.subtotal + quote.amount} />}
        </div>
        <OrderSummary cart={cart} checkout={catalog.checkout} />
      </div>
    </section>
  );
}
