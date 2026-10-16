import React, { useLayoutEffect, useRef, useState } from 'react';
const seenKey = 'chasing606-intro-seen';
function shouldPlay() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || window.location.hash) return false;
  try { return sessionStorage.getItem(seenKey) !== 'yes'; } catch { return true; }
}
export default function Intro() {
  const [active, setActive] = useState(shouldPlay);
  const layer = useRef(null), logo = useRef(null), backdrop = useRef(null), medallion = useRef(null);
  useLayoutEffect(() => {
    if (!active) return;
    const target = document.querySelector('.header-brand');
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
    const finish = () => { if (!cancelled) { medallion.current?.style.setProperty('opacity', '0'); setActive(false); } };
    const timeout = setTimeout(finish, 4500);
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const orientation = window.screen?.orientation?.type || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    let priorWidth = window.innerWidth;
    const onResize = () => {
      const nextOrientation = window.screen?.orientation?.type || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
      if (Math.abs(window.innerWidth - priorWidth) > 90 || nextOrientation !== orientation) finish();
      priorWidth = window.innerWidth;
    };
    const listenMotion = (handler, add) => {
      if (!preference) return;
      if (preference.addEventListener) preference[add ? 'addEventListener' : 'removeEventListener']('change', handler);
      else if (preference.addListener) preference[add ? 'addListener' : 'removeListener'](handler);
    };
    const keydown = event => { if (event.key === 'Escape') finish(); if (event.key === 'Tab') { event.preventDefault(); layer.current?.focus(); } };
    window.addEventListener('resize', onResize);
    listenMotion(finish, true);
    document.addEventListener('keydown', keydown);
    async function animate() {
      try {
        try {
          if (logo.current && logo.current.decode) {
            await logo.current.decode();
          }
        } catch {
          /* Continue even if decode is not supported or rejected */
        }
        if (cancelled) return;
        if (!medallion.current?.animate || !backdrop.current?.animate) { finish(); return; }
        const start = medallion.current.getBoundingClientRect();
        const end = target.getBoundingClientRect();
        if (!start.width || !end.width) {
          finish();
          return;
        }
        const dx = (end.left + end.width / 2) - (start.left + start.width / 2);
        const dy = (end.top + end.height / 2) - (start.top + start.height / 2);
        const scale = end.width / start.width;
        animations.push(medallion.current.animate([
          { opacity: 0, transform: 'translate(-50%, -50%) scale(0.9)' },
          { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
        ], { duration: 340, easing: 'ease-out', fill: 'forwards' }));
        animations.push(backdrop.current.animate([
          { opacity: 1 },
          { opacity: 0 },
        ], { delay: 650, duration: 950, easing: 'ease-in-out', fill: 'forwards' }));
        const flight = medallion.current.animate([
          { transform: 'translate(-50%, -50%) scale(1)' },
          { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})` },
        ], { delay: 650, duration: 1100, easing: 'cubic-bezier(.65, 0, .2, 1)', fill: 'forwards' });
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
      window.removeEventListener('resize', onResize);
      listenMotion(finish, false);
      document.removeEventListener('keydown', keydown);
      if (oldFocus instanceof HTMLElement && oldFocus !== document.body) oldFocus.focus({ preventScroll:true });
    };
  }, [active]);
  if (!active) return null;
  return (
    <div className="brand-intro" ref={layer} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Welcome to Chasing 606">
      <div ref={backdrop} className="intro-backdrop"/>
      <div ref={medallion} className="intro-medallion">
        <img ref={logo} className="intro-logo" src="/logo.png" width="3100" height="3356" alt="Chasing 606" loading="eager" decoding="sync"/>
      </div>
    </div>
  );
}
