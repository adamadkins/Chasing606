import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import SocialLinks from './SocialLinks';
const links = [{ href:'/merch', label:'Merch' }, { href:'/#watch', label:'Watch the hunts' }, { href:'/about', label:'Our story' }, { href:'/contact', label:'Connect' }];
export default function Navigation() {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    trigger.current.focus();
    // Prevent keyboard and screen-reader interaction with content behind the menu.
    const background = [...document.querySelectorAll('#root > main, #root > footer, .header-brand, .cart-toggle')];
    const previousInert = background.map(node => node.inert);
    background.forEach(node => { node.inert = true; });
    const keydown = event => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const controls = [trigger.current, ...panel.current.querySelectorAll('a[href], button')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const desktop = matchMedia('(min-width: 851px)');
    const resize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', resize);
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((node, index) => { node.inert = previousInert[index]; });
      document.removeEventListener('keydown', keydown);
      desktop.removeEventListener('change', resize);
      trigger.current?.focus({ preventScroll:true });
    };
  }, [open]);
  return <>
    <nav className="desktop-nav" aria-label="Main navigation"><div className="nav-group">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</div></nav>
    <button ref={trigger} className={`menu-button${open ? ' is-open' : ''}`} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(value => !value)}><span>{open ? 'CLOSE' : 'MENU'}</span><span className="menu-morph" aria-hidden="true"><span/><span/><span/></span></button>
    <div ref={panel} id="mobile-navigation" className={`mobile-menu${open ? ' is-open' : ''}`} role="region" aria-label="Navigation menu" aria-hidden={!open} inert={!open}>

      <div className="mobile-menu-body"><p className="eyebrow">FROM THE HEART OF 606</p><nav className="mobile-nav" aria-label="Mobile navigation">{links.map((link, index) => <a key={link.href} href={link.href} style={{ '--index':index }} onClick={() => setOpen(false)}><span className="nav-number">0{index+1}</span><span>{link.label}</span><Icon/></a>)}</nav></div>
      <div className="mobile-menu-social"><SocialLinks/></div>
      <div className="mobile-menu-bottom"><span>GUIDED BY SIGN. GROUNDED IN SILENCE.</span></div>
    </div>
  </>;
}
