import { SOCIALS } from '../../config/site';
import './SocialLinks.css';

const ICONS = {
  Facebook: <path d="M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V1.4C17 1.2 16 1 15 1c-3 0-5 2-5 5v3H7v4h3v9Z" fill="currentColor" stroke="none" />,
  Instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>,
  YouTube: <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 6 3-6 3Z" fill="currentColor" stroke="none" /></>
};

export default function SocialLinks({ className = '' }) {
  return (
    <div className={`social-links ${className}`.trim()}>
      {SOCIALS.map(social => (
        <a key={social.name} href={social.href} target="_blank" rel="noreferrer" aria-label={`${social.name} (opens in a new tab)`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{ICONS[social.name]}</svg>
        </a>
      ))}
    </div>
  );
}
