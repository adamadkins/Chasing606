import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import StorySlideshow, { defaultStoryPhotos } from './StorySlideshow';
import StoryHeadline from './StoryHeadline';

// Keep the image, headline, and supporting text on the same slide.
const stories = [
  {
    ending: 'outdoors.',
    lead: "We spend a lot of time chasing mature whitetails around the 606. It's what gets us out of bed and into the woods.",
    detail: "There's nothing quite like seeing a good buck step into view."
  },
  {
    ending: 'with a gobble.',
    lead: "When spring rolls around, we're listening for gobbles and watching the timber wake up.",
    detail: "Early mornings and a bird answering back are worth the alarm."
  },
  {
    ending: 'before daylight.',
    lead: "Cold mornings, fresh sign, and a buck moving through the timber. That's why we put in the hours.",
    detail: "Some sits are quiet. Others are the ones you remember."
  },
  {
    ending: 'on the trail.',
    lead: "The work starts long before we climb into a stand. We scout, check trails, and learn the ground.",
    detail: "We film what happens along the way, not just the highlights."
  }
];

export default function StorySection() {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!preference) return;
    const update = () => setReduceMotion(preference.matches);
    if (preference.addEventListener) preference.addEventListener('change', update);
    else preference.addListener?.(update);
    return () => {
      if (preference.removeEventListener) preference.removeEventListener('change', update);
      else preference.removeListener?.(update);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || defaultStoryPhotos.length <= 1) return;
    let timer;
    const run = () => {
      window.clearInterval(timer);
      if (document.visibilityState === 'hidden') return;
      timer = window.setInterval(() => setIndex(current => (current + 1) % defaultStoryPhotos.length), 5500);
    };
    run();
    document.addEventListener('visibilitychange', run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
    };
  }, [reduceMotion]);

  const story = stories[index] || stories[0];
  return (
    <section id="story" className="story-hero home-reveal" aria-labelledby="story-title">
      <div className="story-hero-content">
        <StoryHeadline id="story-title" ending={story.ending} reduceMotion={reduceMotion} />
        <div className="story-copy-rotator" aria-live="off">
          <div key={index} className={reduceMotion ? 'story-copy-slide' : 'story-copy-slide story-copy-enter'}>
            <p className="story-hero-mission">{story.lead}</p>
            <p className="story-hero-sub">{story.detail}</p>
          </div>
        </div>
        <div className="hero-actions">
          <a className="button story-watch" href="/about">
            ABOUT CHASING 606 <span><Icon /></span>
          </a>
        </div>
      </div>
      <div className="story-hero-visual">
        <StorySlideshow photos={defaultStoryPhotos} index={index} onSelect={setIndex} />
      </div>
      <div className="hero-bottom story-hero-bottom">
        <span>GUIDED BY SIGN / SILENCE / HEAVY ANTLERS</span>
      </div>
    </section>
  );
}
