import heroPhoto from '../../assets/images/hero-hunt.webp';
import { Link } from '../../lib/router';
import Icon from '../ui/Icon';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__photo">
        <img src={heroPhoto} alt="A hunter kneeling beside a mature whitetail buck at the edge of a Kentucky field" width="990" height="630" fetchPriority="high" />
      </div>
      <div className="hero__content">
        <p className="eyebrow hero__eyebrow"><span /> Out here is where we belong</p>
        <h1 id="hero-title">From the heart<br />of <em>606.</em></h1>
        <p className="hero__mission">
          We're after mature bucks in the hills and woodlots of eastern Kentucky. Follow our hunts, scouting, and time in the woods.
        </p>
        <p className="hero__scripture">Proverbs 12:27</p>
        <div className="hero__actions">
          <Link className="btn btn--light" href="/merch">EXPLORE THE GEAR <Icon /></Link>
          <Link className="hero__watch" href="/#watch">
            <span className="hero__play"><Icon name="play" /></span> WATCH THE LATEST
          </Link>
        </div>
      </div>
      <p className="hero__motto">Guided by sign / silence / heavy antlers</p>
    </section>
  );
}
