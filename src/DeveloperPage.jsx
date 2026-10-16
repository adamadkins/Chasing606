import React from 'react';

// An unlisted credit page. It is intentionally absent from navigation and site menus.
export default function DeveloperPage() {
  return (
    <section className="developer-page" aria-labelledby="developer-title">
      <div className="developer-glow" aria-hidden="true" />
      <div className="developer-shell">
        <a className="developer-back" href="/">← BACK TO CHASING 606</a>
        <div className="developer-card">
          <div className="developer-card-top">
            <p className="developer-kicker"><span className="developer-kicker-dot" /> BEHIND THE BUILD</p>
            <span className="developer-edition">EST. 2026 / ONE OF ONE</span>
          </div>
          <div className="developer-hero">
            <div className="developer-intro">
              <span className="developer-overline">THE PERSON BEHIND THE PIXELS</span>
              <h1 id="developer-title">Adam<br/><em>Adkins.</em></h1>
              <p className="developer-role">WEBSITE DESIGNER &amp; DEVELOPER</p>
              <p className="developer-lead">I build digital experiences that look good, feel intentional, and work the way people expect them to.</p>
            </div>
            <div className="developer-monogram" aria-label="Adam Adkins monogram"><span>A</span><span>A</span><small>DESIGN / DEVELOPMENT</small></div>
          </div>
          <div className="developer-divider"><span>01 / THE STORY</span><span>CRAFT OVER CLUTTER</span></div>
          <div className="developer-story-grid">
            <div>
              <h2>A little about me.</h2>
              <p>I'm an information systems professional and developer based in Kentucky. My background in technology, troubleshooting, and business systems shapes the way I approach web design: make it useful first, then make every detail count.</p>
              <p>Chasing 606 was an opportunity to bring that approach to a brand rooted in the outdoors. From the layout and mobile experience to the merchandise catalog and integrations, the goal was a website that feels like the brand it represents.</p>
            </div>
            <div className="developer-details">
              <div><span>FOCUS</span><strong>Web design &amp; development</strong></div>
              <div><span>BACKGROUND</span><strong>Information systems &amp; IT</strong></div>
              <div><span>BASED IN</span><strong>Kentucky, USA</strong></div>
              <div><span>FEATURED PROJECT</span><strong>Chasing 606</strong></div>
            </div>
          </div>
          <div className="developer-signoff">
            <p>Built with purpose.<br/><em>Down to the details.</em></p>
            <a href="/">EXPLORE CHASING 606 <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <p className="developer-footnote">A little hidden corner of the internet. Thanks for finding it.</p>
      </div>
    </section>
  );
}
