import { useState } from 'react';

const ENDPOINT = 'https://formsubmit.co/ajax/';

/**
 * Sends a form to FormSubmit, which emails it to `recipient`.
 * `status` is 'idle' | 'sending' | 'sent' | 'error'.
 */
export default function useFormSubmit(recipient) {
  const [status, setStatus] = useState('idle');

  async function send(payload) {
    if (status === 'sending') return false;
    setStatus('sending');
    try {
      const response = await fetch(ENDPOINT + recipient, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...payload, _replyto: payload.email, _captcha: 'true' })
      });
      const result = await response.json();
      if (!response.ok || result.success === false || result.success === 'false') throw new Error(result.message || 'The message could not be sent.');
      setStatus('sent');
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }

  return { status, send, reset: () => setStatus('idle') };
}

/** Trimmed text fields from a submitted <form>. */
export function readForm(form) {
  return Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, String(value).trim()]));
}
