import { useRef } from 'react';
import useReveal from '../hooks/useReveal';
import Icon from '../components/ui/Icon';
import SocialLinks from '../components/ui/SocialLinks';
import { SITE } from '../config/site';
import { Link } from '../lib/router';
import baylee from '../assets/images/about-baylee.webp';
import buckAfterDark from '../assets/images/about-buck-after-dark.webp';
import buckField from '../assets/images/about-buck-field.webp';
import fieldAfterDark from '../assets/images/about-field-after-dark.webp';
import heroTurkey from '../assets/images/about-hero-turkey.webp';
import hunterOutdoors from '../assets/images/about-hunter-outdoors.webp';
import memories from '../assets/images/about-memories.webp';
import twoHunters from '../assets/images/about-two-hunters.webp';
import './About.css';

function Verse({ cite, children, className = '' }) {
  return (
    <blockquote className={`about-verse ${className}`.trim()}>
      <p>{children}</p>
      <cite>{cite}</cite>
    </blockquote>
  );
}

export default function About() {
  const page = useRef(null);
  useReveal(page);

  return (
    <article className="about" ref={page}>
      <section className="about-hero" aria-labelledby="about-title">
        <img className="about-hero__photo" src={heroTurkey} alt="Hunter carrying a wild turkey through a green Kentucky field" fetchPriority="high" />
        <div className="about-hero__shade" />
        <div className="about-hero__copy">
          <p className="about-kicker">Eastern Kentucky / The 606</p>
          <h1 id="about-title">MORE THAN<br />THE <em>HARVEST.</em></h1>
          <p>Early mornings. Long sits. Stories worth bringing home. This is Chasing 606.</p>
          <Link href="/about#our-story" className="about-hero__discover">GET TO KNOW US <span aria-hidden="true">↓</span></Link>
        </div>
        <span className="about-hero__corner" aria-hidden="true">OUR STORY / 01</span>
      </section>

      <section className="about-intro topo" id="our-story">
        <div data-reveal>
          <p className="about-kicker">Who we are</p>
          <h2>ROOTED IN THE<br /><em>OUTDOORS.</em></h2>
        </div>
        <div className="about-intro__text" data-reveal>
          <p>Founded by Austin in 2023, Chasing 606 is an eastern Kentucky hunting team built around a shared passion for the outdoors and the stories that come from time spent in the woods.</p>
          <p>The team is about more than any one person. We're here for the scouting, the preparation, the cold mornings, the close calls, and the moments you don't forget. The camera comes along for all of it, not just the highlight reel.</p>
          <p>Whether we're chasing whitetails in the fall or listening for gobbles in the spring, we're always looking forward to the next hunt.</p>
        </div>
      </section>

      <section className="about-split">
        <div className="about-split__photo" data-reveal="left">
          <img src={buckAfterDark} alt="Hunter with a mature whitetail buck after dark" loading="lazy" />
        </div>
        <div className="about-split__copy" data-reveal>
          <p className="about-kicker">The pursuit</p>
          <h2>THE WORK<br />BEHIND <em>EVERY STORY.</em></h2>
          <p>The hunt starts long before the shot. It's checking sign, studying movement, getting the wind right, and being willing to go home empty-handed.</p>
          <p>Some days everything comes together. Most days, the woods have something new to teach us.</p>
          <Verse cite="COLOSSIANS 3:23">“Whatever you do, work at it with all your heart, as working for the Lord.”</Verse>
          <span className="about-rule">PATIENCE / PREPARATION / RESPECT</span>
        </div>
      </section>

      <section className="about-field topo" aria-label="The people and memories behind Chasing 606">
        <div className="about-field__heading" data-reveal>
          <div>
            <p className="about-kicker">From the field</p>
            <h2>THE MOMENTS<br /><em>IN BETWEEN.</em></h2>
          </div>
          <p>Every season looks a little different. Every trip adds another chapter.</p>
        </div>
        <div className="about-field__feature">
          <div className="about-field__image" data-reveal="left">
            <img src={twoHunters} alt="Two hunters sharing a moment with a whitetail buck" loading="lazy" />
          </div>
          <div className="about-field__copy" data-reveal>
            <p className="about-kicker">Beyond the harvest</p>
            <h3>IT'S WHO WE<br /><em>SHARE IT WITH.</em></h3>
            <p>Some of the best parts of hunting happen between the big moments: the conversations on the way in, the hours spent waiting, and the shared excitement when a season's worth of effort finally comes together.</p>
            <p>Those are the stories we want to remember, and the ones we're glad to share.</p>
          </div>
        </div>
        <div className="about-field__pair" data-reveal>
          <img src={buckField} alt="Whitetail buck photographed during a hunt" loading="lazy" />
          <img src={fieldAfterDark} alt="Hunter sharing a moment from the field after dark" loading="lazy" />
        </div>
      </section>

      <section className="about-baylee" aria-label="Baylee Mayhew on faith and hunting">
        <div className="about-baylee__photo" data-reveal>
          <img src={baylee} alt="Baylee Mayhew with a whitetail buck in the snowy woods" loading="lazy" />
        </div>
        <div className="about-baylee__copy" data-reveal>
          <p className="about-kicker">Faith in the field</p>
          <blockquote>
            <p>“To me, hunting is a privilege and a blessing. I keep my faith in God, and He blesses me with a bountiful harvest.”</p>
            <cite>BAYLEE MAYHEW</cite>
          </blockquote>
        </div>
      </section>

      <section className="about-split about-belief topo">
        <div className="about-split__photo" data-reveal="left"><img src={hunterOutdoors} alt="Chasing 606 hunter in the outdoors" loading="lazy" /></div>
        <div className="about-split__copy" data-reveal>
          <p className="about-kicker">What matters to us</p>
          <h2>RESPECT THE LAND.<br /><em>ENJOY THE CHASE.</em></h2>
          <p>We believe in putting in the time, taking ethical shots, respecting wildlife, and being grateful for the opportunity to hunt. Success isn't measured only by what comes home with us.</p>
          <blockquote className="about-quote">
            <p>“The quiet pull of the woods was about something far deeper than the harvest itself.”</p>
            <cite>AUSTIN ADKINS / FOUNDER, CHASING 606</cite>
          </blockquote>
          <Verse cite="PSALM 96:12">“Let the fields be jubilant, and everything in them; let all the trees of the forest sing for joy.”</Verse>
        </div>
      </section>

      <section className="about-close">
        <img src={memories} alt="" loading="lazy" />
        <div className="about-close__content" data-reveal>
          <p className="about-kicker">Come along for the ride</p>
          <h2>THE NEXT STORY<br /><em>IS OUT THERE.</em></h2>
          <p>Follow the hunts, see what we're working on, and be part of the Chasing 606 story.</p>
          <Verse className="about-verse--centered" cite="MATTHEW 7:14">“But small is the gate and narrow the road that leads to life, and only a few find it.”</Verse>
          <div className="about-close__actions">
            <a href={SITE.youtubeChannelUrl} target="_blank" rel="noreferrer" className="btn btn--light">WATCH ON YOUTUBE <Icon name="play" /></a>
            <Link href="/merch" className="btn btn--dark">SHOP THE GEAR <Icon /></Link>
          </div>
          <SocialLinks className="about-close__social" />
        </div>
      </section>
    </article>
  );
}
