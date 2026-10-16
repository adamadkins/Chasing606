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
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduceMotion(preference.matches);
      if (preference.matches) setIndex(0);
    };
    sync();
    preference.addEventListener?.('change', sync);
    return () => preference.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex(previous => (previous + 1) % endings.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <Heading id={id} className="story-rotating-headline">
      Every good story<br />
      starts{' '}
      <span className="story-ending-slot">
        <em key={index} className={reduceMotion ? '' : 'story-ending-enter'}>{endings[index]}</em>
      </span>
    </Heading>
  );
}
