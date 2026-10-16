import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SHOP_URL } from './shop';
import Account from './Account';
import './style.css';
import LatestVideo from './LatestVideo';
import Icon from './Icon';
import Navigation from './Navigation';
import Brand from './Brand';
import Contact from './Contact';
import SocialLinks from './SocialLinks';
import Intro from './Intro';
import About from './About';
import StorySlideshow from './StorySlideshow';
function App(){
const path=location.pathname.replace(/\/$/, '');
const isAccount=path==='/account', isMerch=path==='/merch', isContact=path==='/contact', isAbout=path==='/about'||path==='/story';
const isHome=!isAccount&&!isMerch&&!isContact&&!isAbout;
useEffect(()=>{ document.title = isAccount ? 'Account | Chasing 606' : isMerch ? 'Merch | Chasing 606' : isContact ? 'Contact us | Chasing 606' : isAbout ? 'Our Story | Chasing 606' : 'Chasing 606 — From the heart of 606.'; },[isMerch,isContact,isAbout,isAccount]);
return <><header><a className="header-brand" href="/" aria-label="Chasing 606 home"><Brand header/></a><Navigation/><a className="account-toggle" href="/account" aria-label="Your account"><Icon name="account"/></a><a className="cart-toggle" href={SHOP_URL} aria-label="Visit the Fourthwall shop for your bag and checkout"><Icon name="bag"/></a></header>
<main>{isAccount && <Account/>}{isContact && <Contact/>}{isAbout && <About/>}{isHome && <section className="hero"><div className="hero-content"><p className="eyebrow"><span/> OUT HERE IS WHERE WE BELONG</p><h1>From the heart<br/>of <em>606.</em></h1><p className="hero-mission">We follow the trail of suburban giants — guided by sign, silence, and the rare promise of heavy antlers.</p><p className="hero-scripture">Proverbs 12:27</p><div className="hero-actions"><a className="button cream" href={SHOP_URL}>EXPLORE THE GEAR <span><Icon/></span></a><a className="watch" href="#watch"><span className="play"><Icon name="play"/></span> WATCH THE LATEST</a></div></div><div className="hero-bottom"><span>GUIDED BY SIGN / SILENCE / HEAVY ANTLERS</span></div></section>}
{(isHome || isMerch) && <section id="shop" className={isMerch ? 'shop merch-page' : 'shop'}>
  <div className="section-top"><div><p className="eyebrow">WEAR THE STORY</p>{isMerch ? <h1>The 606 collection.</h1> : <h2>The 606 collection.</h2>}</div><p>For wherever the next adventure takes you.</p></div>
  <div className="fourthwall-shop"><p>Explore the official Chasing 606 shop. Browse the collection and complete your purchase on Fourthwall.</p><a href={SHOP_URL} className="button story-watch">VISIT THE MERCH SHOP <Icon/></a><p className="shop-provider-note">Products, your shopping bag, and checkout are all in one place.</p></div>
</section>}
{isHome && <><LatestVideo/>
<section id="story" className="story-hero" aria-labelledby="story-title">
  <div className="story-hero-content">
    <p className="eyebrow"><span/> OUT HERE IS WHERE WE BELONG</p>
    <h2 id="story-title">Every good story<br/>starts <em>outdoors.</em></h2>
    <p className="story-hero-mission">From the heart of 606, Austin follows the sign and puts in the hours. This is the pursuit of suburban giants — where tight timber meets patience, discipline, and the quiet chase.</p>
    <p className="story-hero-sub">It’s the anticipation before first light. The patience between sightings. And the stories that stay with you long after the hunt.</p>
    <div className="hero-actions">
      <a className="button story-watch" href="/about">READ OUR STORY <span><Icon/></span></a>
    </div>
  </div>
  <div className="story-hero-visual">
    <StorySlideshow/>
  </div>
  <div className="hero-bottom story-hero-bottom">
    <span>GUIDED BY SIGN / SILENCE / HEAVY ANTLERS</span>
  </div>
</section></>}</main><footer className="site-footer">
  <div className="footer-container">
    <div className="footer-brand-section">
      <a href="/" className="footer-logo-link" aria-label="Chasing 606 home">
        <Brand small/>
      </a>
      <p className="footer-tagline">Hunting. Patience. Chasing what matters.</p>
    </div>
    <div className="footer-nav" role="navigation" aria-label="Footer navigation">
      <a href={SHOP_URL}>Merch</a>
      <a href="/about">Our story</a>
      <a href="/contact">Contact us</a>
      <a href="/account">Account</a>
    </div>
    <div className="footer-social-section">
      <SocialLinks/>
    </div>
    <div className="footer-copyright">
      <span>© {new Date().getFullYear()} Chasing 606</span>
    </div>
  </div>
</footer>
<Intro/></>;
}
createRoot(document.getElementById('root')).render(<App/>);
