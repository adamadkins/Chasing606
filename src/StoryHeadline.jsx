import React, { useEffect, useState } from 'react';

const endings = ['outdoors.', 'before daylight.', 'in the woods.'];

/**
 * Keeps the original Chasing 606 tagline while cycling through a few
 * short endings. Reduced-motion visitors see the original line only.
 */
export default function StoryHeadline({ as: Heading = 'h2', id }) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduceMotion(Boolean(preference?.matches));
      if (preference?.matches) setIndex(0);
    };
    sync();
    if (preference?.addEventListener) preference.addEventListener('change', sync);
    else preference?.addListener?.(sync);
    return () => {
      if (preference?.removeEventListener) preference.removeEventListener('change', sync);
      else preference?.removeListener?.(sync);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    let timer;
    const start = () => {
      window.clearInterval(timer);
      if (document.visibilityState === 'hidden') return;
      timer = window.setInterval(() => {
        setIndex(previous => (previous + 1) % endings.length);
      }, 3600);
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', start); };
  }, [reduceMotion]);

  return (
    <Heading id={id} className="story-rotating-headline">
      Every good story<br />
      starts{' '}
      <span className={`story-ending-slot ${index === 1 ? 'story-ending-long' : ''}`}>
        <em key={index} className={reduceMotion ? '' : 'story-ending-enter'}>{endings[index]}</em>
      </span>
    </Heading>
  );
}
