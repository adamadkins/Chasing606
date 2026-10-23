import { SITE } from '../config/site';
import useFormSubmit, { readForm } from '../hooks/useFormSubmit';
import Icon from '../components/ui/Icon';
import SocialLinks from '../components/ui/SocialLinks';
import './Contact.css';

const TOPICS = ['General question', 'Merchandise', 'Partnerships', 'A story from the field'];

export default function Contact() {
  const { status, send, reset } = useFormSubmit(SITE.email);

  function submit(event) {
    event.preventDefault();
    const { website, ...fields } = readForm(event.currentTarget);
    if (website) return; // Filled in by a bot, not a person.
    send({ ...fields, _subject: `${SITE.name} | ${fields.topic}`, _honey: '' });
  }

  return (
    <section className="contact page-shell">
      <div className="page-heading">
        <p className="eyebrow">Let’s talk</p>
        <h1>Contact us.</h1>
        <p>Questions about merch, our videos, or working together? Send us a message.</p>
      </div>

      <div className="contact__grid">
        <div className="contact__info">
          <h2>Get in touch.</h2>
          <a className="contact__email" href={`mailto:${SITE.email}`}>{SITE.email} <Icon /></a>
          <p>For merchandise questions, include the item name and any order number so we can help.</p>
          <div className="contact__social">
            <p className="eyebrow">Come along for the hunt</p>
            <SocialLinks />
          </div>
        </div>

        <div className="contact__panel">
          {status === 'sent' ? (
            <div className="contact__success" role="status">
              <span className="contact__success-icon" aria-hidden="true">✓</span>
              <h2>Message submitted.</h2>
              <p>Thanks for the message. We'll reply as soon as we can.</p>
              <button type="button" className="btn btn--dark" onClick={reset}>SEND ANOTHER MESSAGE <Icon /></button>
            </div>
          ) : (
            <form className="contact__form" onSubmit={submit}>
              <p className="contact__form-eyebrow">Message form</p>
              <h2>What’s on your mind?</h2>
              <div className="contact__row">
                <label>Your name
                  <input name="name" type="text" autoComplete="name" placeholder="Your name" required maxLength={100} />
                </label>
                <label>Email address
                  <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={200} />
                </label>
              </div>
              <label>What’s it about?
                <select name="topic" defaultValue={TOPICS[0]}>
                  {TOPICS.map(topic => <option key={topic}>{topic}</option>)}
                </select>
              </label>
              <label>Your message
                <textarea name="message" rows={6} minLength={10} maxLength={4000} placeholder="Tell us what's on your mind..." required />
              </label>
              <div className="honeypot" aria-hidden="true"><label>Leave this blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              {status === 'error' && (
                <p className="contact__error" role="alert">
                  Your message could not be submitted. Please try again or <a href={`mailto:${SITE.email}`}>email us directly</a>.
                </p>
              )}
              <button className="btn btn--dark btn--block" type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'SENDING…' : 'SEND MESSAGE'} <Icon />
              </button>
              <p className="contact__help">
                Messages are delivered through FormSubmit, a third-party form service. You can also email us directly at{' '}
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Please don’t include payment details.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
