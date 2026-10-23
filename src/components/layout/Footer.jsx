import { SITE } from '../../config/site';
import { Link } from '../../lib/router';
import SocialLinks from '../ui/SocialLinks';
import Logo from './Logo';
import './Footer.css';

const LINK_GROUPS = [
  { title: 'Explore', links: [['/merch', 'Merch'], ['/about', 'Our story'], ['/contact', 'Contact']] },
  { title: 'Shop help', links: [['/shipping-returns', 'Shipping & returns'], ['/contact', 'Order questions']] },
  { title: 'Legal', links: [['/privacy', 'Privacy policy'], ['/terms', 'Terms of use']] }
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link href="/" aria-label="Chasing 606 home"><Logo /></Link>
          <p>{SITE.tagline}</p>
        </div>

        <nav className="footer-nav" aria-label="Footer navigation">
          {LINK_GROUPS.map(group => (
            <div className="footer-links" key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map(([href, label]) => <Link key={label} href={href}>{label}</Link>)}
            </div>
          ))}
        </nav>

        <SocialLinks className="footer-social" />

        <div className="footer-copyright">
          <span>© {new Date().getFullYear()} {SITE.name}</span>
          <Link className="footer-credit" href="/behind-the-build">Website Designed &amp; Developed by Adam Adkins</Link>
        </div>
      </div>
    </footer>
  );
}
