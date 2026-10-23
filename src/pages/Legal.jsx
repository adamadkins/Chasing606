import { SITE } from '../config/site';
import { LEGAL_PAGES, LEGAL_UPDATED } from '../data/legal';
import { Link } from '../lib/router';
import './Legal.css';

export default function Legal({ path }) {
  const page = LEGAL_PAGES[path];
  return (
    <section className="legal page-shell">
      <div className="legal__inner">
        <div className="legal__heading">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}.</h1>
          <p>{page.intro}</p>
          <span className="legal__updated">Last updated: {LEGAL_UPDATED}</span>
        </div>
        <div className="legal__sections">
          {page.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </section>
          ))}
        </div>
        <aside className="legal__help">
          Questions? <a href={`mailto:${SITE.email}`}>Contact Chasing 606</a> or visit our <Link href="/contact">contact page</Link>.
        </aside>
      </div>
    </section>
  );
}
