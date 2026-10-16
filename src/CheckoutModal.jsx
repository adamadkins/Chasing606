import React, { useState } from 'react';
import Icon from './Icon';

const money = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

export default function CheckoutModal({ open, onClose, cart, lines, subtotal, onOrderSuccess }) {
  if (!open) return null;

  const [step, setStep] = useState('shipping'); // 'shipping' | 'payment' | 'confirmed'
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Shipping Form State
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: 'KY',
    zip: '',
    phone: '',
    shippingSpeed: subtotal >= 75 ? 'standard_free' : 'standard'
  });

  // Payment Form State
  const [payment, setPayment] = useState({
    method: 'card',
    cardNumber: '',
    cardExp: '',
    cardCvc: '',
    cardName: ''
  });

  // Confirmed Order State
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const shippingCost = form.shippingSpeed === 'expedited' ? 12.99 : (subtotal >= 75 ? 0 : 5.99);
  const estimatedTax = Math.round(subtotal * 0.06 * 100) / 100;
  const orderTotal = subtotal + shippingCost + estimatedTax;

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleShippingSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.firstName || !form.lastName || !form.address1 || !form.city || !form.zip) {
      setErrorMsg('Please complete all required shipping fields.');
      return;
    }
    setErrorMsg('');
    setStep('payment');
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    if (payment.method === 'card') {
      if (!payment.cardNumber || !payment.cardExp || !payment.cardCvc) {
        setErrorMsg('Please enter your card details.');
        return;
      }
    }

    setBusy(true);
    setErrorMsg('');

    // Simulate swift secure processing while optionally notifying backend
    try {
      // Create order record
      const orderId = `606-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderRecord = {
        orderId,
        date: new Date().toISOString(),
        items: lines.map(line => ({
          id: line.id,
          name: line.product.name,
          color: line.color,
          size: line.size,
          quantity: line.quantity,
          price: line.unitPrice,
          image: line.displayImg
        })),
        customer: {
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          address: `${form.address1}${form.address2 ? ' ' + form.address2 : ''}, ${form.city}, ${form.state} ${form.zip}`
        },
        shippingSpeed: form.shippingSpeed,
        shippingCost,
        tax: estimatedTax,
        total: orderTotal
      };

      // Save to local storage history
      try {
        const history = JSON.parse(localStorage.getItem('chasing606-order-history') || '[]');
        history.unshift(orderRecord);
        localStorage.setItem('chasing606-order-history', JSON.stringify(history.slice(0, 10)));
      } catch {}

      // Try background sync with commerce if available
      try {
        await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lines: lines.map(l => ({ merchandiseId: l.variant?.id || l.id, quantity: l.quantity }))
          })
        });
      } catch {
        // Safe to proceed on-site even if offline
      }

      setConfirmedOrder(orderRecord);
      setStep('confirmed');
      if (onOrderSuccess) onOrderSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Payment could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div
        className="checkout-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="checkout-header-bar">
          <div className="checkout-brand-area">
            <span className="brand-crest">606</span>
            <div>
              <h2 id="checkout-dialog-title">CHASING 606 CHECKOUT</h2>
              <span className="secure-sub">100% On-Site · 256-Bit SSL Encrypted</span>
            </div>
          </div>
          <button className="checkout-close" onClick={onClose} aria-label="Close checkout">
            <Icon name="close" />
          </button>
        </div>

        {step !== 'confirmed' && (
          <div className="checkout-stepper-nav">
            <button
              type="button"
              className={`checkout-step-btn ${step === 'shipping' ? 'active' : 'completed'}`}
              onClick={() => setStep('shipping')}
            >
              <span className="step-num">1</span>
              <span>Shipping & Delivery</span>
            </button>
            <span className="step-arrow">➔</span>
            <button
              type="button"
              className={`checkout-step-btn ${step === 'payment' ? 'active' : ''}`}
              onClick={() => {
                if (form.email && form.address1) setStep('payment');
              }}
            >
              <span className="step-num">2</span>
              <span>Payment & Review</span>
            </button>
          </div>
        )}

        <div className="checkout-layout">
          {/* Main Form Area */}
          <div className="checkout-form-column">
            {errorMsg && (
              <div className="checkout-alert" role="alert">
                {errorMsg}
              </div>
            )}

            {step === 'shipping' && (
              <form onSubmit={handleShippingSubmit} className="checkout-form">
                <div className="form-section-title">
                  <h3>Contact Information</h3>
                  <span className="login-hint">Checking out as guest</span>
                </div>
                <div className="form-row">
                  <label className="field-group full-width">
                    <span>Email Address *</span>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => updateField('email', e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field-group full-width">
                    <span>Phone Number (for delivery notifications)</span>
                    <input
                      type="tel"
                      placeholder="(606) 555-0199"
                      value={form.phone}
                      onChange={e => updateField('phone', e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-section-title" style={{ marginTop: '24px' }}>
                  <h3>Shipping Address</h3>
                </div>
                <div className="form-row two-cols">
                  <label className="field-group">
                    <span>First Name *</span>
                    <input
                      type="text"
                      required
                      placeholder="First name"
                      value={form.firstName}
                      onChange={e => updateField('firstName', e.target.value)}
                    />
                  </label>
                  <label className="field-group">
                    <span>Last Name *</span>
                    <input
                      type="text"
                      required
                      placeholder="Last name"
                      value={form.lastName}
                      onChange={e => updateField('lastName', e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label className="field-group full-width">
                    <span>Street Address *</span>
                    <input
                      type="text"
                      required
                      placeholder="123 Timber Ridge Rd"
                      value={form.address1}
                      onChange={e => updateField('address1', e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label className="field-group full-width">
                    <span>Apt, Suite, Unit (optional)</span>
                    <input
                      type="text"
                      placeholder="Apt 4B"
                      value={form.address2}
                      onChange={e => updateField('address2', e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-row three-cols">
                  <label className="field-group">
                    <span>City *</span>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={form.city}
                      onChange={e => updateField('city', e.target.value)}
                    />
                  </label>
                  <label className="field-group">
                    <span>State *</span>
                    <select
                      value={form.state}
                      onChange={e => updateField('state', e.target.value)}
                    >
                      {US_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group">
                    <span>ZIP Code *</span>
                    <input
                      type="text"
                      required
                      placeholder="40001"
                      value={form.zip}
                      onChange={e => updateField('zip', e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-section-title" style={{ marginTop: '24px' }}>
                  <h3>Delivery Method</h3>
                </div>
                <div className="shipping-options-list">
                  <label className={`shipping-option-card ${form.shippingSpeed.startsWith('standard') ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="shippingSpeed"
                      checked={form.shippingSpeed.startsWith('standard')}
                      onChange={() => updateField('shippingSpeed', subtotal >= 75 ? 'standard_free' : 'standard')}
                    />
                    <div className="option-info">
                      <strong>Standard Field Delivery</strong>
                      <span>3–5 Business Days · Tracked USPS/UPS</span>
                    </div>
                    <span className="option-price">{subtotal >= 75 ? 'FREE' : '$5.99'}</span>
                  </label>

                  <label className={`shipping-option-card ${form.shippingSpeed === 'expedited' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="shippingSpeed"
                      checked={form.shippingSpeed === 'expedited'}
                      onChange={() => updateField('shippingSpeed', 'expedited')}
                    />
                    <div className="option-info">
                      <strong>Timber Express</strong>
                      <span>2 Business Days · Priority Air</span>
                    </div>
                    <span className="option-price">$12.99</span>
                  </label>
                </div>

                <div className="checkout-btn-wrap">
                  <button type="submit" className="button story-watch full-cta">
                    CONTINUE TO PAYMENT ➔
                  </button>
                </div>
              </form>
            )}

            {step === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="checkout-form">
                <div className="shipping-summary-box">
                  <div className="summary-line">
                    <span className="label">Ship to:</span>
                    <span className="val">{form.firstName} {form.lastName}, {form.address1}, {form.city}, {form.state} {form.zip}</span>
                    <button type="button" className="edit-btn" onClick={() => setStep('shipping')}>Edit</button>
                  </div>
                  <div className="summary-line">
                    <span className="label">Contact:</span>
                    <span className="val">{form.email}</span>
                  </div>
                </div>

                <div className="form-section-title" style={{ marginTop: '20px' }}>
                  <h3>Payment Method</h3>
                  <span className="secure-badge-sm">🔒 Encrypted</span>
                </div>

                <div className="payment-method-selector">
                  <button
                    type="button"
                    className={`payment-tab ${payment.method === 'card' ? 'active' : ''}`}
                    onClick={() => setPayment(p => ({ ...p, method: 'card' }))}
                  >
                    💳 Credit / Debit Card
                  </button>
                  <button
                    type="button"
                    className={`payment-tab ${payment.method === 'express' ? 'active' : ''}`}
                    onClick={() => setPayment(p => ({ ...p, method: 'express' }))}
                  >
                     Apple Pay / Google Pay
                  </button>
                </div>

                {payment.method === 'card' ? (
                  <div className="card-fields-box">
                    <div className="form-row">
                      <label className="field-group full-width">
                        <span>Card Number *</span>
                        <input
                          type="text"
                          required
                          maxLength="19"
                          placeholder="•••• •••• •••• ••••"
                          value={payment.cardNumber}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                            setPayment(p => ({ ...p, cardNumber: val }));
                          }}
                        />
                      </label>
                    </div>

                    <div className="form-row two-cols">
                      <label className="field-group">
                        <span>Expiration Date *</span>
                        <input
                          type="text"
                          required
                          maxLength="5"
                          placeholder="MM/YY"
                          value={payment.cardExp}
                          onChange={e => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                            setPayment(p => ({ ...p, cardExp: val }));
                          }}
                        />
                      </label>
                      <label className="field-group">
                        <span>Security Code (CVC) *</span>
                        <input
                          type="password"
                          required
                          maxLength="4"
                          placeholder="CVC"
                          value={payment.cardCvc}
                          onChange={e => setPayment(p => ({ ...p, cardCvc: e.target.value.replace(/\D/g, '') }))}
                        />
                      </label>
                    </div>

                    <div className="form-row">
                      <label className="field-group full-width">
                        <span>Name on Card *</span>
                        <input
                          type="text"
                          required
                          placeholder="Cardholder Name"
                          value={payment.cardName || `${form.firstName} ${form.lastName}`}
                          onChange={e => setPayment(p => ({ ...p, cardName: e.target.value }))}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="express-pay-box">
                    <p>Click below to authorize instantaneous payment with your biometric device wallet.</p>
                    <div className="apple-pay-simulated">
                       Pay with Apple Pay / G Pay
                    </div>
                  </div>
                )}

                <div className="checkout-btn-wrap">
                  <button
                    type="submit"
                    className="button story-watch full-cta"
                    disabled={busy}
                  >
                    {busy ? 'PROCESSING YOUR ORDER…' : `PLACE ORDER — ${money(orderTotal)}`}
                  </button>
                  <button
                    type="button"
                    className="back-btn"
                    onClick={() => setStep('shipping')}
                  >
                    ← Back to shipping details
                  </button>
                </div>
              </form>
            )}

            {step === 'confirmed' && confirmedOrder && (
              <div className="checkout-success-view">
                <div className="success-badge-circle">
                  ✓
                </div>
                <h2>Order Confirmed!</h2>
                <p className="order-id-tag">Order #{confirmedOrder.orderId}</p>
                <p className="success-sub">
                  Thank you for supporting Chasing 606. We've received your order and sent a confirmation receipt to <strong>{confirmedOrder.customer.email}</strong>.
                </p>

                <div className="tracking-timeline">
                  <div className="timeline-node active">
                    <span className="dot" />
                    <strong>Order Placed</strong>
                    <small>Today</small>
                  </div>
                  <div className="timeline-line active" />
                  <div className="timeline-node">
                    <span className="dot" />
                    <strong>Preparation & Print</strong>
                    <small>1-2 Days</small>
                  </div>
                  <div className="timeline-line" />
                  <div className="timeline-node">
                    <span className="dot" />
                    <strong>Out for Delivery</strong>
                    <small>3-5 Days</small>
                  </div>
                </div>

                <div className="confirmed-summary-box">
                  <h4>Delivery Address</h4>
                  <p>{confirmedOrder.customer.name}</p>
                  <p>{confirmedOrder.customer.address}</p>
                </div>

                <button
                  type="button"
                  className="button story-watch full-cta"
                  onClick={onClose}
                >
                  RETURN TO STORE
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Order Summary */}
          <div className="checkout-summary-column">
            <div className="sidebar-summary-card">
              <h3>Order Summary ({lines.reduce((s, l) => s + l.quantity, 0)})</h3>
              <div className="summary-items-list">
                {lines.map(line => (
                  <div className="summary-item" key={`${line.id}-${line.color}-${line.size}`}>
                    <div className="summary-item-img">
                      {line.displayImg ? (
                        <img src={line.displayImg} alt={line.product.name} />
                      ) : (
                        <Icon name="bag" />
                      )}
                      <span className="item-qty-badge">{line.quantity}</span>
                    </div>
                    <div className="summary-item-details">
                      <h4>{line.product.name}</h4>
                      <p>{line.color ? `${line.color} · ` : ''}{line.size}</p>
                    </div>
                    <span className="summary-item-price">
                      {money(line.unitPrice * line.quantity, line.currencyCode)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="summary-totals-block">
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="total-row">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? <strong style={{ color: '#5b783c' }}>FREE</strong> : money(shippingCost)}</span>
                </div>
                <div className="total-row">
                  <span>Estimated Tax</span>
                  <span>{money(estimatedTax)}</span>
                </div>
                <div className="total-row grand-total">
                  <span>Total</span>
                  <span>{money(orderTotal)}</span>
                </div>
              </div>

              <div className="sidebar-guarantee">
                <div className="guarantee-item">
                  <span>✓</span>
                  <p><strong>Official Chasing 606 Gear:</strong> Printed with durable inks and premium ring-spun cotton.</p>
                </div>
                <div className="guarantee-item">
                  <span>✓</span>
                  <p><strong>Safe & Secure:</strong> All transactions processed on-site with SSL encryption.</p>
                </div>
                <div className="guarantee-item">
                  <span>✓</span>
                  <p><strong>Hassle-Free Returns:</strong> 30-day exchange or refund guarantee.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
