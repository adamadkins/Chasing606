// Emails Austin when an order needs a human. Uses Resend's HTTP API, whose free
// sandbox sender (onboarding@resend.dev) can email the account owner with no
// domain setup. Without a key, alerts go to the Worker log instead.

export async function sendAlert(env, subject, text, fetcher = fetch) {
  if (!env.RESEND_API_KEY || !env.ALERT_EMAIL) {
    console.error(`[order alert] ${subject}\n${text}`);
    return false;
  }
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Chasing 606 Orders <onboarding@resend.dev>', to: [env.ALERT_EMAIL], subject, text }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
    return true;
  } catch (error) {
    // An alert that cannot be sent must never break order handling.
    console.error(`[order alert not sent: ${error.message}] ${subject}\n${text}`);
    return false;
  }
}
