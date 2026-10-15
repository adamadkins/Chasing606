import React, { useLayoutEffect, useRef, useState } from 'react';
const seenKey = 'chasing606-intro-seen';
function shouldPlay() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash) return false;
  try { return sessionStorage.getItem(seenKey) !== 'yes'; } catch { return true; }
}
export default function Intro() {
  const [active, setActive] = useState(shouldPlay);
  const layer = useRef(null), logo = useRef(null), backdrop = useRef(null);
  useLayoutEffect(() => {
    if (!active) return;
    const target = document.querySelector('.header-brand .brand-logo');
    if (!target) { setActive(false); return; }
    try { sessionStorage.setItem(seenKey, 'yes'); } catch { /* Private browsing may disable storage. */ }
    const oldVisibility = target.style.visibility;
    const oldOverflow = document.body.style.overflow;
    const oldFocus = document.activeElement;
    target.style.visibility = 'hidden';
    document.body.style.overflow = 'hidden';
    const siblings = [...layer.current.parentElement.children].filter(node => node !== layer.current);
    const oldInert = siblings.map(node => node.inert);
    siblings.forEach(node => { node.inert = true; });
    layer.current.focus({ preventScroll:true });
    let cancelled = false;
    const animations = [];
    const finish = () => { if (!cancelled) setActive(false); };
    const timeout = setTimeout(finish, 4500);
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const keydown = event => { if (event.key === 'Escape') finish(); if (event.key === 'Tab') { event.preventDefault(); layer.current?.focus(); } };
    window.addEventListener('resize', finish);
    preference.addEventListener('change', finish);
    document.addEventListener('keydown', keydown);
    async function animate() {
      try {
        await logo.current.decode();
        if (cancelled) return;
        const start = logo.current.getBoundingClientRect();
        const end = target.getBoundingClientRect();
        const dx = end.x + end.width / 2 - (start.x + start.width / 2);
        const dy = end.y + end.height / 2 - (start.y + start.height / 2);
        animations.push(logo.current.animate([{ opacity:0 }, { opacity:1 }], { duration:250, fill:'forwards' }));
        animations.push(backdrop.current.animate([{ opacity:1 }, { opacity:0 }], { delay:650, duration:1000, easing:'ease-in-out', fill:'forwards' }));
        const flight = logo.current.animate([
          { transform:'translate(-50%, -50%) scale(1)' },
          { transform:`translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${end.width/start.width}, ${end.height/start.height})` },
        ], { delay:650, duration:1150, easing:'cubic-bezier(.65, 0, .2, 1)', fill:'forwards' });
        animations.push(flight);
        await flight.finished;
        finish();
      } catch { finish(); }
    }
    animate();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      animations.forEach(animation => animation.cancel());
      target.style.visibility = oldVisibility;
      document.body.style.overflow = oldOverflow;
      siblings.forEach((node,index) => { node.inert = oldInert[index]; });
      window.removeEventListener('resize', finish);
      preference.removeEventListener('change', finish);
      document.removeEventListener('keydown', keydown);
      if (oldFocus instanceof HTMLElement && oldFocus !== document.body) oldFocus.focus({ preventScroll:true });
    };
  }, [active]);
  if (!active) return null;
  return <div className="brand-intro" ref={layer} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Welcome to Chasing 606"><div ref={backdrop} className="intro-backdrop"/><img ref={logo} className="intro-logo" src="/logo.png" width="3100" height="3356" alt="Chasing 606"/></div>;
}
