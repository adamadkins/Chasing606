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
          <h1>We'd rather be<br/><em>in the woods.</em></h1>
          <p className="about-hero-lead">
            We're a hunting channel based in eastern Kentucky. We spend our time scouting and hunting mature bucks, and we bring a camera along.
          </p>
          <div className="about-scripture-badge">
            <span className="scripture-ref">Proverbs 12:27</span>
            <span className="scripture-text">"The lazy do not roast any game, but the diligent prize their possession."</span>
          </div>
          <div className="about-hero-actions">
            <a href="/merch" className="button cream">
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
              Around eastern Kentucky, you can find mature bucks in small timber lots, creek bottoms, and the woods along neighborhoods. That's where a lot of our hunting happens.
            </p>
            <p>
              Deer living close to people still know how to stay out of sight. We spend plenty of time watching trails, checking wind, and figuring out where they travel.
            </p>
          </div>

          <div className="about-card">
            <span className="card-num">02</span>
            <h2>Long Sits & Fresh Sign</h2>
            <p>
              Most hunts start before daylight. Some mornings we see deer, and some we don't. Either way, we're checking scrapes, watching field edges, and learning something for next time.
            </p>
            <p>
              We believe in taking ethical shots, respecting the land, and putting in the time. The hunt doesn't always end with a deer, but we're glad to be out there.
            </p>
          </div>

          <div className="about-card">
            <span className="card-num">03</span>
            <h2>Our Hunting Videos</h2>
            <p>
              We started Chasing 606 to share our hunts on YouTube. You'll see the scouting, the setups, and what actually happens when we're in the stand.
            </p>
            <p>
              Some videos are packed with action. Others are slow mornings, close calls, and lessons we'll remember next season.
            </p>
          </div>

          <div className="about-card">
            <span className="card-num">04</span>
            <h2>Chasing 606 Gear</h2>
            <p>
              We've got Chasing 606 shirts, hats, and other gear for anyone who follows the channel or just likes being outdoors.
            </p>
            <p>
              Check out the collection and find something you like.
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
        <p>Watch our hunts on YouTube, shop the merch, or get in touch.</p>
        <div className="about-cta-buttons">
          <a href="/merch" className="button story-watch">
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
