import { SHOP_URL } from './shop';
import React, { useEffect } from 'react';
import Icon from './Icon';
import SocialLinks from './SocialLinks';
import whitetailBuckImg from './assets/images/whitetail_buck_1792096498234.jpg';

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="about-page page-shell">
      <section className="about-hero">
        <div className="about-hero-content">
          <p className="eyebrow"><span className="eyebrow-dot"/> OUR STORY · CHASING 606</p>
          <h1>Every good story<br/>starts <em>outdoors.</em></h1>
          <p className="about-hero-lead">
            From the heart of 606, we follow the trail of suburban giants. Guided by sign, silence, and the patient pursuit of heavy antlers.
          </p>
          <div className="about-scripture-badge">
            <span className="scripture-ref">Proverbs 12:27</span>
            <span className="scripture-text">"The lazy do not roast any game, but the diligent prize their possession."</span>
          </div>
          <div className="about-hero-actions">
            <a href={SHOP_URL} className="button cream">
              EXPLORE THE GEAR <Icon/>
            </a>
            <a href="https://www.youtube.com/@Chasing606" target="_blank" rel="noreferrer" className="button story-watch">
              WATCH ON YOUTUBE <Icon name="play"/>
            </a>
          </div>
        </div>
        <div className="about-hero-image-wrap">
          <img
            src={whitetailBuckImg || "/images/whitetail_buck.jpg"}
            alt="Trophy whitetail buck in autumn timber"
            className="about-hero-img"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            referrerPolicy="no-referrer"
            onError={(e) => {
              if (e.currentTarget.src !== window.location.origin + '/images/whitetail_buck.jpg' && !e.currentTarget.src.includes('/images/whitetail_buck.jpg')) {
                e.currentTarget.src = '/images/whitetail_buck.jpg';
              } else {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=1400&q=85';
              }
            }}
          />
          <div className="about-hero-tag">
            <span>THE HEART OF 606</span>
            <span>CHASING 606</span>
          </div>
        </div>
      </section>

      <section className="about-narrative">
        <div className="about-grid">
          <div className="about-card">
            <span className="card-num">01</span>
            <h2>Hunting Suburban Giants</h2>
            <p>
              The 606 area code is unique hunting ground. Here, mature whitetail bucks thrive in the tight timber pockets, drainage corridors, and woodlots bordering suburban neighborhoods.
            </p>
            <p>
              These deer are veterans. They know the sounds of car doors, the shift of human wind patterns, and every safe route through the timber. Harvesting a suburban giant demands next-level patience, pinpoint scent control, and relentless scouting.
            </p>
          </div>

          <div className="about-card">
            <span className="card-num">02</span>
            <h2>Sign, Silence & The Long Hours</h2>
            <p>
              Success isn't measured in quick hunts; it's earned in frosty treestands before sunrise, countless miles glassing field edges, and reading the subtle story told by fresh rubs and scrapes.
            </p>
            <p>
              We honor the animal and respect the outdoors. When you spend enough time in the timber, you realize that the hunt is less about the shot and more about the discipline and stories forged along the way.
            </p>
          </div>

          <div className="about-card">
            <span className="card-num">03</span>
            <h2>Captured On Film</h2>
            <p>
              Chasing 606 was created to document the real, unscripted reality of archery hunting. On our YouTube channel, we bring you along for the true highs and lows of each season.
            </p>
            <p>
              The cold mornings where nothing moves, the close encounters where a branch deflected an arrow, and the unforgettable moments when preparation and timing align into a hunt of a lifetime.
            </p>
          </div>

          <div className="about-card">
            <span className="card-num">04</span>
            <h2>Gear For The Journey</h2>
            <p>
              Our upcoming apparel collection is built with the same grounded mindset. Premium materials, comfortable cuts, and understated outdoor designs made for early mornings in the stand, scouting trails, and everyday life.
            </p>
            <p>
              Wear the story wherever the next adventure takes you.
            </p>
          </div>
        </div>
      </section>

      <section className="about-values-banner">
        <div className="values-content">
          <p className="eyebrow">THE 606 CODE</p>
          <h2>Patience. Respect. The Pursuit.</h2>
          <div className="values-row">
            <div className="value-item">
              <h3>SIGN</h3>
              <p>Learning the woods by foot, tracking scrapes, and understanding movement patterns.</p>
            </div>
            <div className="value-item">
              <h3>SILENCE</h3>
              <p>Entering undetected, mastering wind direction, and holding still through the cold.</p>
            </div>
            <div className="value-item">
              <h3>STEWARDSHIP</h3>
              <p>Respecting wildlife, ethical shots, and giving thanks for the harvest.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-cta-section">
        <h2>Join the chase.</h2>
        <p>Follow along on YouTube, check out our upcoming collection, or send us a story from your own field.</p>
        <div className="about-cta-buttons">
          <a href={SHOP_URL} className="button story-watch">
            EXPLORE MERCHANDISE <Icon/>
          </a>
          <a href="/contact" className="button cream">
            CONTACT US <Icon/>
          </a>
        </div>
        <div className="about-social-row">
          <SocialLinks/>
        </div>
      </section>
    </div>
  );
}
