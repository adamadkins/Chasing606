import { useLayoutEffect, useRef, useState } from 'react';
import logo from '../../assets/images/logo.webp';
import './Intro.css';

// A once-per-session welcome: the logo medallion fades in, then flies to its
// place in the header. Skipped for reduced motion, deep links, and repeat visits.

const SEEN_KEY = 'chasing606-intro-seen';
const MAX_DURATION_MS = 4500;

function shouldPlay() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.location.hash) return false;
  try { return sessionStorage.getItem(SEEN_KEY) !== 'yes'; } catch { return true; }
}

const orientation = () => window.screen?.orientation?.type || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');

export default function Intro() {
  const [active, setActive] = useState(shouldPlay);
  const layer = useRef(null);
  const image = useRef(null);
  const backdrop = useRef(null);
  const medallion = useRef(null);

  useLayoutEffect(() => {
    if (!active) return undefined;
    const target = document.querySelector('.header-brand');
    if (!target) {
      const timer = setTimeout(() => setActive(false), 0);
      return () => clearTimeout(timer);
    }
    try { sessionStorage.setItem(SEEN_KEY, 'yes'); } catch { /* Private browsing may disable storage. */ }

    const saved = {
      visibility: target.style.visibility,
      opacity: target.style.opacity,
      transition: target.style.transition,
      boxShadow: target.style.boxShadow,
      overflow: document.body.style.overflow,
      focus: document.activeElement
    };
    target.style.visibility = 'hidden';
    target.style.transition = 'none';
    document.body.style.overflow = 'hidden';
    const siblings = [...layer.current.parentElement.children].filter(node => node !== layer.current);
    const previousInert = siblings.map(node => node.inert);
    siblings.forEach(node => { node.inert = true; });
    layer.current.focus({ preventScroll: true });

    let cancelled = false;
    const animations = [];
    const finish = () => { if (!cancelled) setActive(false); };
    const timeout = setTimeout(finish, MAX_DURATION_MS);

    // Rotating or resizing mid-intro would leave the flight path wrong: just stop.
    const startOrientation = orientation();
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (Math.abs(window.innerWidth - lastWidth) > 90 || orientation() !== startOrientation) finish();
      lastWidth = window.innerWidth;
    };
    const onKeyDown = event => {
      if (event.key === 'Escape') finish();
      if (event.key === 'Tab') { event.preventDefault(); layer.current?.focus(); }
    };
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKeyDown);
    motion.addEventListener('change', finish);

    async function play() {
      try {
        await image.current?.decode?.().catch(() => {});
        if (cancelled) return;
        if (!medallion.current?.animate || !backdrop.current?.animate) { finish(); return; }

        const from = medallion.current.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        if (!from.width || !to.width) { finish(); return; }
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const scale = to.width / from.width;
        const finalShadow = getComputedStyle(target).boxShadow;
        const centered = 'translate(-50%, -50%)';

        animations.push(medallion.current.animate(
          [{ opacity: 0, transform: `${centered} scale(0.9)` }, { opacity: 1, transform: `${centered} scale(1)` }],
          { duration: 340, easing: 'ease-out', fill: 'forwards' }
        ));
        animations.push(backdrop.current.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { delay: 650, duration: 950, easing: 'ease-in-out', fill: 'forwards' }
        ));
        const flight = medallion.current.animate(
          [{ transform: `${centered} scale(1)` }, { transform: `${centered} translate(${dx}px, ${dy}px) scale(${scale})` }],
          { delay: 650, duration: 1100, easing: 'cubic-bezier(.65, 0, .2, 1)', fill: 'forwards' }
        );
        animations.push(flight);
        await flight.finished;
        if (cancelled) return;

        // Reveal the real header logo underneath, then fade the flying copy away,
        // so the handoff never shows a gap.
        target.style.opacity = '1';
        target.style.visibility = 'visible';
        target.style.boxShadow = 'none';
        const outgoing = medallion.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out', fill: 'forwards' });
        animations.push(outgoing);
        await outgoing.finished;
        if (!cancelled) {
          target.style.boxShadow = finalShadow;
          finish();
        }
      } catch {
        finish();
      }
    }
    play();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      // Restore the real logo before cancelling the overlay animations so a
      // frame can never reveal the hero through it.
      target.style.visibility = saved.visibility;
      target.style.opacity = saved.opacity;
      target.style.boxShadow = saved.boxShadow;
      animations.forEach(animation => animation.cancel());
      target.style.transition = saved.transition;
      document.body.style.overflow = saved.overflow;
      siblings.forEach((node, index) => { node.inert = previousInert[index]; });
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKeyDown);
      motion.removeEventListener('change', finish);
      if (saved.focus instanceof HTMLElement && saved.focus !== document.body) saved.focus.focus({ preventScroll: true });
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="brand-intro" ref={layer} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Welcome to Chasing 606">
      <div ref={backdrop} className="intro-backdrop" />
      <div ref={medallion} className="intro-medallion">
        <img ref={image} src={logo} width="560" height="606" alt="Chasing 606" loading="eager" decoding="sync" />
      </div>
    </div>
  );
}
