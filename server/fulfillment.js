// After a payment is confirmed: send the order to the supplier exactly once.

import { decodeBag } from './checkout.js';
import { MAX_ATTEMPTS } from './orders.js';
import { sendAlert } from './notify.js';

const money = cents => `$${(cents / 100).toFixed(2)}`;

function describe(session, record, extra = '') {
  return [
    `Payment: ${session?.id ?? '(unknown)'}`,
    session && `Customer: ${session.recipient.name} <${session.email}>`,
    session && `Total paid: ${money(session.amountTotalCents)}`,
    session?.cart && `Items (product:variant:qty): ${session.cart}`,
    `Attempts so far: ${record.attempts}`,
    record.supplier_order_id && `Printify order: ${record.supplier_order_id}`,
    extra
  ].filter(Boolean).join('\n');
}

function recipientError(session) {
  const { recipient } = session;
  const { address } = recipient;
  if (!recipient.name || !address.line1 || !address.city || !address.postalCode || !address.country) {
    return new Error('The payment has no complete shipping address.');
  }
  return null;
}

/**
 * @returns {Promise<'submitted'|'already'|'busy'|'unpaid'|'needs_attention'>} — or throws on a retryable failure
 */
export async function fulfillSession({ sessionId, env, services, store, fetcher = fetch }) {
  const claim = await store.claim(sessionId);
  if (claim.state === 'done') return 'already';
  if (claim.state === 'stopped') return 'needs_attention';
  if (claim.state === 'busy') return 'busy';

  let record = claim.record;
  let session;
  try {
    session = await services.payments.retrieveSession(sessionId);
    if (!session.paid) {
      // Delayed payment methods confirm later with their own event.
      await store.update(sessionId, { status: 'received', attempts: record.attempts - 1, lease_until: 0 });
      return 'unpaid';
    }
    const missing = recipientError(session);
    if (missing) throw Object.assign(missing, { permanent: true });

    let supplierOrderId = record.supplier_order_id;
    if (!supplierOrderId) {
      const created = await services.fulfiller.createOrder({
        id: sessionId,
        label: `606-${sessionId.slice(-8)}`,
        lines: decodeBag(session.cart),
        recipient: session.recipient
      });
      supplierOrderId = created.id;
      record = { ...record, supplier_order_id: supplierOrderId };
      // Saved before the next call so a retry only has to send it to production.
      await store.update(sessionId, { supplier_order_id: supplierOrderId });
    }
    await services.fulfiller.submitOrder(supplierOrderId);
    await store.update(sessionId, { status: 'submitted', error: null, lease_until: 0 });
    return 'submitted';
  } catch (error) {
    const giveUp = error.permanent || record.attempts >= MAX_ATTEMPTS;
    await store.update(sessionId, { status: giveUp ? 'needs_attention' : 'failed', error: String(error.message).slice(0, 500), lease_until: 0 });
    // Alert on the first failure, every third retry after it, and always when giving up.
    if (giveUp || record.attempts % 3 === 1) {
      await sendAlert(
        env,
        giveUp ? 'Chasing 606: order needs your attention' : 'Chasing 606: an order hit a snag (retrying)',
        describe(session, record, `\nProblem: ${error.message}\n\n${giveUp
          ? 'This order will NOT retry on its own. The customer has paid: fix it in Printify (or place it by hand) or refund it in Stripe.'
          : 'It will retry automatically.'}`),
        fetcher
      );
    }
    if (giveUp) return 'needs_attention';
    throw error;
  }
}
