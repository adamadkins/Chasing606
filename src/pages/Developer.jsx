import { DEVELOPER } from '../config/site';
import useFormSubmit, { readForm } from '../hooks/useFormSubmit';
import { Link } from '../lib/router';
import portrait from '../assets/images/developer-portrait.webp';
import './Developer.css';

const PROJECTS = ['Website design & development', 'Updating an existing website', 'IT or technical question', 'Something else'];
const MAILTO = `mailto:${DEVELOPER.email}?subject=${encodeURIComponent(`Website inquiry for ${DEVELOPER.name}`)}`;

export default function Developer() {
  const { status, send, reset } = useFormSubmit(DEVELOPER.email);

  function submit(event) {
    event.preventDefault();
    const { honey, ...fields } = readForm(event.currentTarget);
    if (honey) return; // Filled in by a bot, not a person.
    send({ ...fields, _subject: `Website inquiry for ${DEVELOPER.name} | Chasing 606`, _honey: '', _url: window.location.href });
  }

  return (
    <section className="developer" aria-labelledby="developer-title">
      <div className="developer__shell">
        <Link className="developer__back" href="/">← BACK TO CHASING 606</Link>

        <div className="developer__card">
          <div className="developer__card-top">
            <p className="developer__kicker"><span /> BEHIND THE BUILD</p>
            <span className="developer__edition">DESIGN / DEVELOPMENT</span>
          </div>

          <div className="developer__grid">
            <div className="developer__intro">
              <div className="developer__profile">
                <div>
                  <p className="developer__overline">MEET THE DEVELOPER</p>
                  <h1 id="developer-title">Adam<br /><em>Adkins.</em></h1>
                  <p className="developer__role">WEBSITE DESIGNER &amp; DEVELOPER</p>
                </div>
                <img className="developer__portrait" src={portrait} alt="Portrait of Adam Adkins" width="640" height="640" decoding="async" />
              </div>
              <p className="developer__lead">Need a website or help fixing one you've already got? Tell me what you're working on.</p>
              <div className="developer__bio">
                <span>BASED IN KENTUCKY</span>
                <p>I work in IT and build websites. I designed and developed the Chasing 606 site.</p>
              </div>
            </div>

            <div className="developer__panel">
              {status === 'sent' ? (
                <div className="developer__success" role="status">
                  <span aria-hidden="true">✓</span>
                  <h2>Message submitted.</h2>
                  <p>Thanks for the message. The first submission may need email activation before it can be delivered.</p>
                  <button type="button" onClick={reset}>SEND ANOTHER MESSAGE →</button>
                </div>
              ) : (
                <form className="developer__form" onSubmit={submit}>
                  <p className="developer__form-kicker">LET'S CONNECT</p>
                  <h2>What do you need help with?</h2>
                  <div className="developer__row">
                    <label>Your name<input name="name" autoComplete="name" required maxLength={100} placeholder="Your name" /></label>
                    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={200} placeholder="you@example.com" /></label>
                  </div>
                  <label>What can I help with?
                    <select name="project" defaultValue={PROJECTS[0]}>
                      {PROJECTS.map(project => <option key={project}>{project}</option>)}
                    </select>
                  </label>
                  <label>Your message
                    <textarea name="message" rows={6} required minLength={10} maxLength={4000} placeholder="Tell me a little about what you have in mind..." />
                  </label>
                  <div className="honeypot" aria-hidden="true"><label>Leave this blank<input name="honey" tabIndex={-1} autoComplete="off" /></label></div>
                  {status === 'error' && (
                    <p role="alert" className="developer__error">Your message could not be sent. Please try again or <a href={MAILTO}>email me instead</a>.</p>
                  )}
                  <button className="developer__send" type="submit" disabled={status === 'sending'}>
                    {status === 'sending' ? 'SENDING…' : 'SEND MESSAGE'} <span aria-hidden="true">↗</span>
                  </button>
                  <p className="developer__note">Messages are sent to Adam using FormSubmit, a third-party form service. By sending a message, you agree to share the details you enter for a reply. No account is needed.</p>
                </form>
              )}
            </div>
          </div>
        </div>
        <p className="developer__footnote">You found my contact page.</p>
      </div>
    </section>
  );
}
