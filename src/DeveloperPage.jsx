import React, { useState } from 'react';

const destination = 'adkins.adam04@gmail.com';

export default function DeveloperPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [project, setProject] = useState('Website design & development');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function send(event) {
    event.preventDefault();
    if (status === 'sending') return;
    if (honeypot) return;
    setStatus('sending');
    setError('');
    try {
      const response = await fetch(`https://formsubmit.co/ajax/${destination}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          _replyto: email.trim(),
          project,
          message: message.trim(),
          _subject: 'Website inquiry for Adam Adkins — Chasing 606',
          _captcha: 'true',
          _honey: honeypot,
          _url: window.location.href
        })
      });
      const data = await response.json();
      if (!response.ok || data.success === false || data.success === 'false') throw new Error(data.message || 'The form could not be delivered.');
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError('Your message could not be sent. Please try again or use your email app.');
      setStatus('error');
    }
  }

  const mailto = `mailto:${destination}?subject=${encodeURIComponent('Website inquiry for Adam Adkins')}`;

  return <section className="developer-page" aria-labelledby="developer-title">
    <div className="developer-glow" aria-hidden="true" />
    <div className="developer-shell">
      <a className="developer-back" href="/">← BACK TO CHASING 606</a>
      <div className="developer-card">
        <div className="developer-card-top">
          <p className="developer-kicker"><span className="developer-kicker-dot" /> BEHIND THE BUILD</p>
          <span className="developer-edition">DESIGN / DEVELOPMENT</span>
        </div>
        <div className="developer-contact-grid">
          <div className="developer-contact-intro">
            <div className="developer-portrait-frame">
              <img
                src="/413CF16B-E711-4E8C-BC53-C57C789371F6.png"
                alt="Portrait of Adam Adkins"
                className="developer-portrait"
                loading="eager"
                decoding="async"
              />
            </div>
            <p className="developer-overline">MEET THE DEVELOPER</p>
            <h1 id="developer-title">Adam<br/><em>Adkins.</em></h1>
            <p className="developer-role">WEBSITE DESIGNER &amp; DEVELOPER</p>
            <p className="developer-lead">Have a website idea, need help improving an existing one, or want to work together? Send me a message.</p>
            <div className="developer-mini-bio">
              <span>BASED IN KENTUCKY</span>
              <p>I work in information technology and build thoughtful, functional web experiences. Chasing 606 is one of my projects.</p>
            </div>
          </div>
          <div className="developer-contact-panel">
            {status === 'sent' ? <div className="developer-form-success" role="status">
              <span className="developer-success-icon" aria-hidden="true">✓</span>
              <h2>Message submitted.</h2>
              <p>Thanks for reaching out. If this is the first submission, email delivery may require the form owner's one-time activation.</p>
              <button type="button" onClick={() => setStatus('idle')}>SEND ANOTHER MESSAGE →</button>
            </div> : <form className="developer-contact-form" onSubmit={send}>
              <p className="developer-form-kicker">LET'S CONNECT</p>
              <h2>Tell me about your project.</h2>
              <div className="developer-form-two">
                <label>Your name<input name="name" autoComplete="name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" /></label>
                <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={200} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label>
              </div>
              <label>What can I help with?
                <select name="project" value={project} onChange={e=>setProject(e.target.value)}>
                  <option>Website design &amp; development</option>
                  <option>Updating an existing website</option>
                  <option>IT or technical question</option>
                  <option>Something else</option>
                </select>
              </label>
              <label>Your message<textarea name="message" rows={6} required minLength={10} maxLength={4000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell me a little about what you have in mind..." /></label>
              <div className="developer-honey" aria-hidden="true"><label>Leave this blank<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e=>setHoneypot(e.target.value)} /></label></div>
              {error && <p role="alert" className="developer-form-error">{error} <a href={mailto}>Email me instead</a>.</p>}
              <button className="developer-send" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'SENDING…' : 'SEND MESSAGE'} <span aria-hidden="true">↗</span></button>
              <p className="developer-form-note">Messages are sent to Adam using FormSubmit, a third-party form service. By sending a message, you agree to share the details you enter for a reply. No account is needed.</p>
            </form>}
          </div>
        </div>
      </div>
      <p className="developer-footnote">An unlisted page. Found via the website credit.</p>
    </div>
  </section>;
}
