import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { STORY_SLIDES } from '../../data/story';
import { Link } from '../../lib/router';
import Icon from '../ui/Icon';
import './StorySection.css';

const ROTATE_EVERY_MS = 5500;

/** "Every good story starts…" — the headline ending, copy, and photo advance together. */
export default function StorySection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const section = useRef(null);
  const slide = STORY_SLIDES[index];

  // Rotates while the tab is visible; stops while someone is hovering or focused inside it.
  useEffect(() => {
    if (paused) return undefined;
    let timer;
    const run = () => {
      clearInterval(timer);
      if (document.visibilityState === 'hidden') return;
      timer = setInterval(() => setIndex(current => (current + 1) % STORY_SLIDES.length), ROTATE_EVERY_MS);
    };
    run();
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
    };
  }, [paused]);

  const animated = reduceMotion ? '' : ' is-animated';

  return (
    <section
      ref={section}
      id="story"
      className="story-hero topo"
      data-reveal
      aria-labelledby="story-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={event => { if (!section.current.contains(event.relatedTarget)) setPaused(false); }}
    >
      <div className="story-hero__content">
        <h2 id="story-title" className="story-headline">
          Every good story<br />
          starts{' '}
          <span className="story-headline__slot">
            <em key={slide.ending} className={`story-headline__ending${animated}`}>{slide.ending}</em>
          </span>
        </h2>
        <div className="story-copy">
          <div key={index} className={`story-copy__slide${animated}`}>
            <p className="story-copy__lead">{slide.lead}</p>
            <p className="story-copy__detail">{slide.detail}</p>
          </div>
        </div>
        <Link className="btn btn--dark" href="/about">ABOUT CHASING 606 <Icon /></Link>
      </div>

      <div className="story-hero__visual" role="group" aria-roledescription="carousel" aria-label="Our story photographs">
        {STORY_SLIDES.map((item, i) => (
          <div key={item.id} className={`story-photo${i === index ? ' is-active' : ''}`} aria-hidden={i !== index}>
            <img
              src={item.photo.src}
              alt={item.photo.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              style={item.photo.position ? { objectPosition: item.photo.position } : undefined}
            />
          </div>
        ))}
        <div className="story-hero__fade" aria-hidden="true" />
        <div className="story-dots" role="group" aria-label="Choose photo">
          {STORY_SLIDES.map((item, i) => (
            <button key={item.id} type="button" className={i === index ? 'is-active' : ''} aria-label={`Show photo ${i + 1} of ${STORY_SLIDES.length}`} aria-current={i === index} onClick={() => setIndex(i)} />
          ))}
        </div>
      </div>

      <p className="story-hero__motto">Guided by sign / silence / heavy antlers</p>
    </section>
  );
}
