import { useLayoutEffect } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

/**
 * Fades elements marked `data-reveal` in as they scroll into view.
 *
 * Elements are only hidden once this effect has run, so content stays visible
 * if JavaScript fails or the visitor prefers reduced motion. Pass values in
 * `resetKey` that should replay the effect (for example, when a list re-filters).
 */
export default function useReveal(containerRef, resetKey = '') {
  const reduceMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || reduceMotion || !('IntersectionObserver' in window)) return undefined;

    const nodes = [...container.querySelectorAll('[data-reveal]')];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('reveal-hidden');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    for (const node of nodes) {
      node.classList.add('reveal-hidden');
      observer.observe(node);
    }
    return () => {
      observer.disconnect();
      for (const node of nodes) node.classList.remove('reveal-hidden');
    };
  }, [containerRef, reduceMotion, resetKey]);
}
