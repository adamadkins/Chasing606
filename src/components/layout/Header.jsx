import { useCallback, useEffect, useRef, useState } from 'react';
import { NAV_LINKS, SITE } from '../../config/site';
import useCart from '../../hooks/useCart';
import useCatalog from '../../hooks/useCatalog';
import { Link, useRouter } from '../../lib/router';
import Icon from '../ui/Icon';
import SocialLinks from '../ui/SocialLinks';
import Logo from './Logo';
import './Header.css';

// Everything outside the open mobile menu, hidden from keyboards and screen readers.
const BACKGROUND = '#root > main, #root > footer, .header-brand, .header-cart';

function useMobileMenu(open, close, trigger, panel) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background = [...document.querySelectorAll(BACKGROUND)];
    const previousInert = background.map(node => node.inert);
    background.forEach(node => { node.inert = true; });

    const onKeyDown = event => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      // Keep Tab inside the menu: the toggle button plus everything in the panel.
      const controls = [trigger.current, ...panel.current.querySelectorAll('a[href], button')];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const desktop = window.matchMedia('(min-width: 851px)');
    const onBreakpoint = () => { if (desktop.matches) close(); };

    document.addEventListener('keydown', onKeyDown);
    desktop.addEventListener('change', onBreakpoint);
    trigger.current.focus();
    const button = trigger.current;

    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((node, index) => { node.inert = previousInert[index]; });
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onBreakpoint);
      button.focus({ preventScroll: true });
    };
  }, [open, close, trigger, panel]);
}

export default function Header() {
  const { path } = useRouter();
  const { checkout } = useCatalog();
  const cart = useCart();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openedOn, setOpenedOn] = useState(null);
  const open = openedOn === path;
  const trigger = useRef(null);
  const panel = useRef(null);
  const close = useCallback(() => setOpenedOn(null), []);

  useMobileMenu(open, close, trigger, panel);

  const current = href => (href === path ? 'page' : undefined);

  return (
    <header className="site-header">
      <Link className="header-brand" href="/" aria-label="Chasing 606 home">
        <Logo />
      </Link>

      <nav className="desktop-nav" aria-label="Main navigation">
        {NAV_LINKS.map(link => (
          <Link key={link.href} href={link.href} aria-current={current(link.href)}>{link.label}</Link>
        ))}
      </nav>

      <button
        ref={trigger}
        type="button"
        className={`menu-button${open ? ' is-open' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpenedOn(open ? null : path)}
      >
        <span>{open ? 'CLOSE' : 'MENU'}</span>
        <span className="menu-morph" aria-hidden="true"><span /><span /><span /></span>
      </button>

      {checkout.mode ? (
        <button type="button" className="header-cart" aria-label={`Open your bag, ${cart.count} ${cart.count === 1 ? 'item' : 'items'}`} onClick={cart.openBag}>
          <Icon name="bag" />
          {cart.count > 0 && <span className="header-cart__count" aria-hidden="true">{cart.count}</span>}
        </button>
      ) : (
        <a className="header-cart" href={SITE.cartUrl} aria-label="View your cart on Spring">
          <Icon name="bag" />
        </a>
      )}

      <div ref={panel} id="mobile-menu" className={`mobile-menu${open ? ' is-open' : ''}`} role="region" aria-label="Navigation menu" inert={!open}>
        <div className="mobile-menu-body">
          <p className="eyebrow">From the heart of 606</p>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {NAV_LINKS.map((link, index) => (
              <Link key={link.href} href={link.href} style={{ '--index': index }} onClick={close} aria-current={current(link.href)}>
                <span className="mobile-nav-number">0{index + 1}</span>
                <span>{link.label}</span>
                <Icon />
              </Link>
            ))}
          </nav>
        </div>
        <SocialLinks className="mobile-menu-social" />
        <p className="mobile-menu-footer">Guided by sign. Grounded in silence.</p>
      </div>
    </header>
  );
}
