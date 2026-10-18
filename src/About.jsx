import React, { useEffect } from 'react';
import Icon from './Icon';
import SocialLinks from './SocialLinks';

const image = (name) => `/images/about-us/${name}.jpeg`;

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
    const elements = Array.from(document.querySelectorAll('.about-editorial .about-reveal'));
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="about-page about-editorial page-shell">
      <section className="about-editorial-hero">
        <div className="about-editorial-hero-photo">
          <img src={image('IMG_1757')} alt="Hunter carrying a wild turkey through a green Kentucky field" fetchPriority="high" />
        </div>
        <div className="about-editorial-hero-shade" />
        <div className="about-editorial-hero-copy about-reveal">
          <p className="about-editorial-kicker">EASTERN KENTUCKY / THE 606</p>
          <h1>MORE THAN<br />THE <em>HARVEST.</em></h1>
          <p>Early mornings. Long sits. Stories worth bringing home. This is Chasing 606.</p>
          <a href="#our-story" className="about-editorial-discover">GET TO KNOW US <span aria-hidden="true">↓</span></a>
        </div>
        <span className="about-editorial-hero-corner">OUR STORY / 01</span>
      </section>

      <section className="about-editorial-intro" id="our-story">
        <div className="about-editorial-intro-heading about-reveal">
          <p className="about-editorial-kicker">WHO WE ARE</p>
          <h2>ROOTED IN THE<br /><em>OUTDOORS.</em></h2>
        </div>
        <div className="about-editorial-intro-text about-reveal">
          <p>Founded by Austin in 2023, Chasing 606 is an eastern Kentucky hunting team built around a shared passion for the outdoors and the stories that come from time spent in the woods.</p>
          <p>The team is about more than any one person. We're here for the scouting, the preparation, the cold mornings, the close calls, and the moments you don't forget. The camera comes along for all of it, not just the highlight reel.</p>
          <p>Whether we're chasing whitetails in the fall or listening for gobbles in the spring, we're always looking forward to the next hunt.</p>
        </div>
      </section>

      <section className="about-editorial-feature">
        <div className="about-editorial-feature-photo about-reveal">
          <img src={image('IMG_1772')} alt="Hunter with a mature whitetail buck after dark" loading="lazy" />
        </div>
        <div className="about-editorial-feature-copy about-reveal">
          <p className="about-editorial-kicker">THE PURSUIT</p>
          <h2>THE WORK<br />BEHIND <em>EVERY STORY.</em></h2>
          <p>The hunt starts long before the shot. It's checking sign, studying movement, getting the wind right, and being willing to go home empty-handed.</p>
          <p>Some days everything comes together. Most days, the woods have something new to teach us.</p>
          <blockquote className="about-editorial-verse">“Whatever you do, work at it with all your heart, as working for the Lord.”<cite>COLOSSIANS 3:23</cite></blockquote>
          <span className="about-editorial-rule">PATIENCE / PREPARATION / RESPECT</span>
        </div>
      </section>

      <section className="about-editorial-gallery about-editorial-field-story" aria-label="The people and memories behind Chasing 606">
        <div className="about-editorial-gallery-heading about-reveal">
          <div>
            <p className="about-editorial-kicker">FROM THE FIELD</p>
            <h2>THE MOMENTS<br /><em>IN BETWEEN.</em></h2>
          </div>
          <p>Every season looks a little different. Every trip adds another chapter.</p>
        </div>
        <div className="about-editorial-field-feature">
          <div className="about-editorial-field-image about-reveal">
            <img src={image('IMG_1753')} alt="Two hunters sharing a moment with a whitetail buck" loading="lazy" />
          </div>
          <div className="about-editorial-field-copy about-reveal">
            <p className="about-editorial-kicker">BEYOND THE HARVEST</p>
            <h3>IT'S WHO WE<br /><em>SHARE IT WITH.</em></h3>
            <p>Some of the best parts of hunting happen between the big moments: the conversations on the way in, the hours spent waiting, and the shared excitement when a season's worth of effort finally comes together.</p>
            <p>Those are the stories we want to remember, and the ones we're glad to share.</p>
          <blockquote className="about-editorial-field-quote">“To me, hunting is a privilege and a blessing. I keep my faith in God, and He blesses me with a bountiful harvest.”<cite>BAYLEE MAYHEW</cite></blockquote>
          </div>
        </div>
        <div className="about-editorial-field-pair about-reveal">
          <img src={image('IMG_0377')} alt="Whitetail buck photographed during a hunt" loading="lazy" />
          <img src={image('IMG_1672')} alt="Hunter sharing a moment from the field after dark" loading="lazy" />
        </div>
      </section>

      <section className="about-editorial-belief">
        <div className="about-editorial-belief-photo about-reveal"><img src={image('IMG_1751')} alt="Chasing 606 hunter in the outdoors" loading="lazy" /></div>
        <div className="about-editorial-belief-copy about-reveal">
          <p className="about-editorial-kicker">WHAT MATTERS TO US</p>
          <h2>RESPECT THE LAND.<br /><em>ENJOY THE CHASE.</em></h2>
          <p>We believe in putting in the time, taking ethical shots, respecting wildlife, and being grateful for the opportunity to hunt. Success isn't measured only by what comes home with us.</p>
          <blockquote>“The quiet pull of the woods was about something far deeper than the harvest itself.”<cite>AUSTIN ADKINS / FOUNDER, CHASING 606</cite></blockquote>
          <blockquote className="about-editorial-verse">“Let the fields be jubilant, and everything in them; let all the trees of the forest sing for joy.”<cite>PSALM 96:12</cite></blockquote>
        </div>
      </section>

      <section className="about-editorial-close">
        <img src={image('IMG_1759')} alt="Chasing 606 hunting memories" loading="lazy" />
        <div className="about-editorial-close-content about-reveal">
          <p className="about-editorial-kicker">COME ALONG FOR THE RIDE</p>
          <h2>THE NEXT STORY<br /><em>IS OUT THERE.</em></h2>
          <p>Follow the hunts, see what we're working on, and be part of the Chasing 606 story.</p>
          <blockquote className="about-editorial-verse about-editorial-verse-close">“But small is the gate and narrow the road that leads to life, and only a few find it.”<cite>MATTHEW 7:14</cite></blockquote>
          <div className="about-editorial-actions">
            <a href="https://www.youtube.com/@Chasing606" target="_blank" rel="noreferrer" className="button cream">WATCH ON YOUTUBE <Icon name="play" /></a>
            <a href="/merch" className="button story-watch">SHOP THE GEAR <Icon /></a>
          </div>
          <div className="about-social-row"><SocialLinks /></div>
        </div>
      </section>
    </main>
  );
}
