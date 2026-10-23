// Remembers which payments have been sent to the supplier, so a retried webhook
// can never ship an order twice. Stored in Cloudflare D1 (SQLite) in production.
// No customer details are stored here; the address is re-read from Stripe.
//
// Status flow: received -> processing -> submitted
//                                  \-> failed (will retry) -> needs_attention (human follow-up)

export const MAX_ATTEMPTS = 6;
const LEASE_MS = 2 * 60 * 1000;

const SCHEMA = `CREATE TABLE IF NOT EXISTS orders (
  session_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  supplier_order_id TEXT,
  error TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`;

/** What a caller learns when it asks to work on an order. */
function outcome(changed, record) {
  if (changed) return { state: 'claimed', record };
  if (record.status === 'submitted') return { state: 'done', record };
  if (record.status === 'needs_attention') return { state: 'stopped', record };
  return { state: 'busy', record };
}

export function memoryOrderStore() {
  const rows = new Map();
  return {
    async claim(sessionId, now = Date.now()) {
      const row = rows.get(sessionId) ?? { session_id: sessionId, status: 'received', attempts: 0, supplier_order_id: null, error: null, lease_until: 0, created_at: now };
      rows.set(sessionId, row);
      const claimable = row.status === 'received' || row.status === 'failed' || (row.status === 'processing' && row.lease_until < now);
      if (claimable) Object.assign(row, { status: 'processing', attempts: row.attempts + 1, lease_until: now + LEASE_MS, updated_at: now });
      return outcome(claimable, { ...row });
    },
    async update(sessionId, patch, now = Date.now()) {
      Object.assign(rows.get(sessionId), patch, { updated_at: now });
    },
    async get(sessionId) {
      const row = rows.get(sessionId);
      return row ? { ...row } : null;
    }
  };
}

let schemaReady;

export function d1OrderStore(db) {
  const ready = () => (schemaReady ??= db.prepare(SCHEMA).run().catch(error => { schemaReady = undefined; throw error; }));
  const read = async sessionId => db.prepare('SELECT * FROM orders WHERE session_id = ?').bind(sessionId).first();
  return {
    async claim(sessionId, now = Date.now()) {
      await ready();
      await db.prepare('INSERT OR IGNORE INTO orders (session_id, status, attempts, created_at, updated_at) VALUES (?, \'received\', 0, ?, ?)').bind(sessionId, now, now).run();
      // One atomic statement decides who owns the work, even if Stripe delivers twice at once.
      const result = await db.prepare(
        `UPDATE orders SET status = 'processing', attempts = attempts + 1, lease_until = ?, updated_at = ?
         WHERE session_id = ? AND (status IN ('received', 'failed') OR (status = 'processing' AND lease_until < ?))`
      ).bind(now + LEASE_MS, now, sessionId, now).run();
      return outcome(result.meta.changes === 1, await read(sessionId));
    },
    async update(sessionId, patch, now = Date.now()) {
      await ready();
      const entries = Object.entries({ ...patch, updated_at: now });
      const columns = entries.map(([column]) => `${column} = ?`).join(', ');
      await db.prepare(`UPDATE orders SET ${columns} WHERE session_id = ?`).bind(...entries.map(([, value]) => value), sessionId).run();
    },
    async get(sessionId) {
      await ready();
      return read(sessionId);
    }
  };
}

// One in-memory store per isolate, used only where no database is bound (local development).
const fallback = memoryOrderStore();

export function orderStore(env) {
  if (env.DB) return d1OrderStore(env.DB);
  if (env.ALLOW_MEMORY_ORDER_STORE === 'true') return fallback;
  return null;
}
