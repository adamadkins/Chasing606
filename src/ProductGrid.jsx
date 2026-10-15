import React, { useEffect, useRef } from 'react';
export default function ProductGrid({ animationKey, children }) {
  const grid = useRef(null);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches || !('IntersectionObserver' in window)) return;
    const cards = [...grid.current.querySelectorAll('.product')];
    cards.forEach((card, index) => {
      card.style.setProperty('--reveal-delay', `${(index % 4) * 75}ms`);
      card.classList.remove('is-revealed');
      card.classList.add('will-reveal');
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold:0.08 });
    cards.forEach(card => observer.observe(card));
    const revealAll = () => { if (media.matches) { cards.forEach(card => card.classList.add('is-revealed')); observer.disconnect(); } };
    media.addEventListener('change', revealAll);
    return () => { observer.disconnect(); media.removeEventListener('change', revealAll); cards.forEach(card => { card.classList.remove('will-reveal', 'is-revealed'); card.style.removeProperty('--reveal-delay'); }); };
  }, [animationKey]);
  return <div className="products" ref={grid}>{children}</div>;
}
