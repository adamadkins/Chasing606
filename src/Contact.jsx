import React, { useState } from 'react';
import Icon from './Icon';
import SocialLinks from './SocialLinks';

const contactEmail = 'chasingbucks606@gmail.com';

export default function Contact() {
  const [topic, setTopic] = useState('General question');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (status === 'sending' || website) return;
    setStatus('sending');
    setError('');

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${contactEmail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          _replyto: email.trim(),
          topic,
          message: message.trim(),
          _subject: `Chasing 606 | ${topic}`,
          _captcha: 'true',
          _honey: website
        })
      });
      const result = await response.json();
      if (!response.ok || result.success === false || result.success === 'false') {
        throw new Error(result.message || 'The message could not be sent.');
      }
      setName('');
      setEmail('');
      setMessage('');
      setTopic('General question');
      setStatus('sent');
    } catch {
      setStatus('error');
      setError('Your message could not be submitted. Please try again or email us directly.');
    }
  }

  return (
    <section className="contact-page page-shell">
      <div className="page-heading">
        <p className="eyebrow">LET’S TALK</p>
        <h1>Contact us.</h1>
        <p>Questions about merch, our videos, or working together? Send us a message.</p>
      </div>
      <div className="contact-grid">
        <div className="contact-info">
          <h2>Get in touch.</h2>
          <a className="contact-email" href={`mailto:${contactEmail}`}>{contactEmail} <Icon /></a>
          <p>For merchandise questions, include the item name and any order number so we can help.</p>
          <div className="contact-note">
            <p className="eyebrow">COME ALONG FOR THE HUNT</p>
            <SocialLinks />
          </div>
        </div>
        <div className="contact-form-panel">
          {status === 'sent' ? (
            <div className="contact-form-success" role="status">
              <span className="contact-form-success-icon" aria-hidden="true">✓</span>
              <h2>Message submitted.</h2>
              <p>Thanks for the message. We'll reply as soon as we can.</p>
              <button type="button" className="button story-watch" onClick={() => setStatus('idle')}>
                SEND ANOTHER MESSAGE <Icon />
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={submit}>
              <p className="contact-form-eyebrow">SEND US A MESSAGE</p>
              <h2>Send us a message.</h2>
              <div className="contact-form-two">
                <label>Your name
                  <input name="name" type="text" autoComplete="name" placeholder="Your name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} />
                </label>
                <label>Email address
                  <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={200} value={email} onChange={e => setEmail(e.target.value)} />
                </label>
              </div>
              <label>What’s it about?
                <select name="topic" value={topic} onChange={e => setTopic(e.target.value)}>
                  <option>General question</option>
                  <option>Merchandise</option>
                  <option>Partnerships</option>
                  <option>A story from the field</option>
                </select>
              </label>
              <label>Your message
                <textarea name="message" rows={6} minLength={10} maxLength={4000} placeholder="Tell us what's on your mind..." value={message} onChange={e => setMessage(e.target.value)} required />
              </label>
              <div className="contact-form-honeypot" aria-hidden="true"><label>Leave this blank<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
              {error && <p className="contact-form-error" role="alert">{error} <a href={`mailto:${contactEmail}`}>Email us instead</a>.</p>}
              <button className="button story-watch" type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'SENDING…' : 'SEND MESSAGE'} <Icon />
              </button>
              <p className="form-help">Messages are delivered through FormSubmit, a third-party form service. You can also email us directly at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Please don’t include payment details.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
