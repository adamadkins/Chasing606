import { useEffect, useState } from 'react';
import Icon from '../components/ui/Icon';
import useCart from '../hooks/useCart';
import { Link, useRouter } from '../lib/router';
import './Checkout.css';

/** Where Stripe sends the customer after paying. Confirms the payment with our server. */
export default function OrderComplete() {
  const { search } = useRouter();
  const { clear } = useCart();
  const sessionId = new URLSearchParams(search).get('session_id');
  const [result, setResult] = useState({ state: sessionId ? 'loading' : 'missing' });

  useEffect(() => {
    if (!sessionId) return undefined;
    const controller = new AbortController();
    fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setResult(data.status === 'complete' && data.paid ? { state: 'paid', email: data.email } : { state: data.status === 'complete' ? 'pending' : 'unpaid' });
      })
      .catch(error => { if (error.name !== 'AbortError') setResult({ state: 'error' }); });
    return () => controller.abort();
  }, [sessionId]);

  const paid = result.state === 'paid';
  useEffect(() => { if (paid) clear(); }, [paid, clear]);

  return (
    <section className="checkout page-shell checkout--message">
      {result.state === 'loading' && <><h1>One moment…</h1><p role="status">Confirming your payment.</p></>}
      {paid && (
        <>
          <span className="checkout__done" aria-hidden="true">✓</span>
          <h1>Thank you!</h1>
          <p>Your order is in. {result.email ? <>A receipt is on its way to <strong>{result.email}</strong>, and you’ll get tracking when it ships.</> : 'You’ll get a receipt by email, and tracking when it ships.'}</p>
          <p className="checkout__fine">Everything is made to order, so please allow a little time before it ships.</p>
        </>
      )}
      {result.state === 'pending' && <><h1>Payment processing</h1><p>Your payment is still being confirmed. You’ll get an email as soon as it goes through.</p></>}
      {result.state === 'unpaid' && <><h1>Payment not completed</h1><p>You haven’t been charged. Your bag is still saved, so you can try again.</p></>}
      {(result.state === 'error' || result.state === 'missing') && <><h1>We couldn’t find that order</h1><p>If you just paid, check your email for a receipt. Questions? <Link href="/contact">Contact us</Link>.</p></>}
      <div className="checkout__actions">
        {result.state === 'unpaid' && <Link href="/checkout" className="btn btn--dark">BACK TO CHECKOUT <Icon /></Link>}
        <Link href="/merch" className={result.state === 'unpaid' ? 'text-link' : 'btn btn--dark'}>KEEP SHOPPING <Icon /></Link>
      </div>
    </section>
  );
}
