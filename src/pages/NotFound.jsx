import Icon from '../components/ui/Icon';
import { Link } from '../lib/router';
import './NotFound.css';

export default function NotFound() {
  return (
    <section className="not-found page-shell">
      <p className="eyebrow">Off the trail</p>
      <h1>Page not found.</h1>
      <p>That page has wandered off. Head back to camp, or browse the gear and the latest hunts.</p>
      <div className="not-found__actions">
        <Link className="btn btn--dark" href="/">BACK TO HOME <Icon /></Link>
        <Link className="text-link" href="/merch">SHOP THE GEAR <Icon /></Link>
      </div>
    </section>
  );
}
