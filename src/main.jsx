import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getProducts, getCommerce, variantFor, canAdd } from './catalog';
import Account from './Account';
import './style.css';
import LatestVideo from './LatestVideo';
import Icon from './Icon';
import Navigation from './Navigation';
import Brand from './Brand';
import Contact from './Contact';
import SocialLinks from './SocialLinks';
import Cart, { useCart } from './Cart';
import ProductGrid from './ProductGrid';
import Intro from './Intro';
import About from './About';
import StorySlideshow from './StorySlideshow';
const money = (amount,currency='USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
function ProductArt({product}) { if(product.image)return <div className="product-art product-photo"><img src={product.image} alt={product.imageAlt||product.name} loading="lazy"/></div>; if(product.variants)return <div className="product-art missing-photo"><Icon name="bag"/><span>Photo coming soon</span></div>; return <div className={'product-art '+product.type} style={{'--garment':product.tone}} aria-label={`${product.color} ${product.name} concept illustration`} role="img"><svg viewBox="0 0 320 280" aria-hidden="true"><defs><filter id={'shadow-'+product.id}><feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity=".12"/></filter></defs><g filter={`url(#shadow-${product.id})`}>{product.type==='hat'?<><path fill="var(--garment)" d="M83 168c0-71 28-104 77-104s77 33 77 104Z"/><path fill="#514436" d="M93 162c48-13 98-9 145 4 42 12 31 32-10 36-46 5-91-3-135-21Z"/><path d="M160 65v90M110 83l-7 73M208 83l13 73" stroke="#ffffff25" fill="none"/></>:<><path fill="var(--garment)" d="M111 58 68 77 31 139l43 25 20-31-4 115h140l-4-115 20 31 43-25-37-62-43-19-49 13Z"/>{product.type==='hoodie'?<><path fill="var(--garment)" stroke="#0002" d="M112 65c-8-67 104-67 96 0l-48 23Z"/><path d="m139 77-3 61m47-61 3 61M124 202l-9 28h90l-9-28Z" fill="none" stroke="#0003"/></>:<path d="M132 59q28 31 56 0" fill="none" stroke="#0003" strokeWidth="9"/>}</>}<text x="160" y={product.type==='hat'?128:135} fill="#eee9da" textAnchor="middle" fontFamily="Georgia" fontSize="13" fontWeight="bold">CHASING 606</text><text x="160" y={product.type==='hat'?140:148} fill="#eee9da" textAnchor="middle" fontSize="5" letterSpacing="2">CHASING 606</text></g></svg><span className="concept">DESIGN PLACEHOLDER</span></div>; }
function App(){ const cart=useCart(); const [commerce,setCommerce]=useState(null),[commerceError,setCommerceError]=useState(false); const isAccount = location.pathname.replace(/\/$/, "") === "/account"; const [cartOpen,setCartOpen]=useState(false); const isMerch = location.pathname.replace(/\/$/, "") === "/merch"; const isContact = location.pathname.replace(/\/$/, "") === "/contact"; const isAbout = location.pathname.replace(/\/$/, "") === "/about" || location.pathname.replace(/\/$/, "") === "/story"; const isHome = !isMerch && !isContact && !isAbout && !isAccount; const [search,setSearch]=useState(''),[sort,setSort]=useState('featured'); const [products,setProducts]=useState([]),[error,setError]=useState(false),[filter,setFilter]=useState('All gear'),[selected,setSelected]=useState(null),[size,setSize]=useState('');
useEffect(()=>{ document.title = isAccount ? 'Account | Chasing 606' : isMerch ? 'Merch | Chasing 606' : isContact ? 'Contact us | Chasing 606' : isAbout ? 'Our Story | Chasing 606' : 'Chasing 606 — From the heart of 606.'; },[isMerch,isContact,isAbout,isAccount]);
useEffect(()=>{ getProducts().then(setProducts).catch(()=>setError(true)); getCommerce().then(setCommerce).catch(()=>setCommerceError(true)); },[]);
useEffect(()=>{if(!selected)return; const close=e=>{if(e.key==='Escape')setSelected(null)}; document.addEventListener('keydown',close); const old=document.body.style.overflow; document.body.style.overflow='hidden'; return()=>{document.removeEventListener('keydown',close);document.body.style.overflow=old;};},[selected]);
const open=p=>{setSelected(p);setSize('');};
const visibleProducts = products.filter(p=>(filter==='All gear'||p.category===filter)&&`${p.name} ${p.color} ${p.category}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:0);
return <><header><a className="header-brand" href="/" aria-label="Chasing 606 home"><Brand header/></a><Navigation/><a className="account-toggle" href="/account" aria-label="Your account"><Icon name="account"/></a><button className="cart-toggle" aria-label={`Open cart, ${cart.items.reduce((sum,item)=>sum+item.quantity,0)} items`} onClick={()=>setCartOpen(true)}><Icon name="bag"/><span>{cart.items.reduce((sum,item)=>sum+item.quantity,0)}</span></button></header>
<main>{isAccount && <Account commerce={commerce} error={commerceError}/>}{isContact && <Contact/>}{isAbout && <About/>}{isHome && <section className="hero"><div className="hero-content"><p className="eyebrow"><span/> OUT HERE IS WHERE WE BELONG</p><h1>From the heart<br/>of <em>606.</em></h1><p className="hero-mission">We follow the trail of suburban giants — guided by sign, silence, and the rare promise of heavy antlers.</p><p className="hero-scripture">Proverbs 12:27</p><div className="hero-actions"><a className="button cream" href="/merch">EXPLORE THE GEAR <span><Icon/></span></a><a className="watch" href="#watch"><span className="play"><Icon name="play"/></span> WATCH THE LATEST</a></div></div><div className="hero-bottom"><span>GUIDED BY SIGN / SILENCE / HEAVY ANTLERS</span></div></section>}
{!isContact && !isAbout && !isAccount && <section id="shop" className={isMerch ? "shop merch-page" : "shop"}><div className="section-top"><div><p className="eyebrow">WEAR THE STORY</p>{isMerch ? <h1>The 606 collection.</h1> : <h2>The 606 collection.</h2>}</div><p>For wherever the next adventure takes you.<br/>{commerce?.mode==='shopify'?'Find your next favorite.':'Our first collection is on the horizon.'}</p></div>{isMerch && <div className="catalog-controls"><label>Find your gear<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the collection"/></label><label>Sort by<select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div>}<div className="shop-toolbar"><div className="filters" aria-label="Filter products">{['All gear',...new Set(products.map(p=>p.category))].map(f=><button key={f} className={f===filter?'active':''} onClick={()=>setFilter(f)} aria-pressed={f===filter}>{f}</button>)}</div><span>{commerce?.mode==='shopify'?'THE COLLECTION':'PREVIEW COLLECTION'}</span></div>{commerce?.mode==='demo' && <div className="catalog-notice">A look at what’s possible. Sample products and prices — orders aren’t open yet.</div>}{error?<p role="alert">We couldn’t load the collection. Please refresh to try again.</p>:<ProductGrid animationKey={`${filter}:${search}:${sort}:${visibleProducts.map(p=>p.id).join(',')}`}>{visibleProducts.map(p=><button className="product" key={p.id} onClick={()=>open(p)}><div className="art-wrap"><span className="product-badge">{p.available?(commerce?.mode==='shopify'?'AVAILABLE':'COMING SOON'):'OUT OF STOCK'}</span><ProductArt product={p}/><span className="product-arrow"><Icon/></span></div><div className="product-details"><h3>{p.name}</h3><span>{money(p.price,p.currencyCode)}</span></div><p>{p.color} <span> / {p.category}</span></p></button>)}</ProductGrid>}{!error && products.length > 0 && visibleProducts.length === 0 && <p className="empty-catalog">No gear matches your search. <button onClick={()=>{setSearch('');setFilter('All gear');}}>Clear filters</button></p>}{isHome && <div className="collection-link"><a href="/merch" className="button story-watch">VIEW ALL MERCH <Icon/></a></div>}</section>}
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
      <a href="/merch">Merch</a>
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
{selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><dialog open aria-labelledby="product-title" className="product-modal" onClick={e=>e.stopPropagation()}><button autoFocus className="close" onClick={()=>setSelected(null)} aria-label="Close product details"><Icon name="close"/></button><ProductArt product={selected}/><div className="modal-copy"><p className="eyebrow">{commerce?.mode==='shopify'?'CHASING 606':'COLLECTION PREVIEW'}</p><h2 id="product-title">{selected.name}</h2><p>{money(variantFor(selected,size)?.price??selected.price,variantFor(selected,size)?.currencyCode??selected.currencyCode)} · {selected.color}</p><p>{selected.description}</p><fieldset><legend>{selected.variants?'Option':'Size'} {size&&`— ${size}`}</legend>{selected.sizes.map(s=><button className={size===s?'chosen':''} key={s} disabled={Boolean(selected.variants&&!variantFor(selected,s)?.available)} onClick={()=>setSize(s)} aria-pressed={size===s}>{s}</button>)}</fieldset><button className={`button ${canAdd(selected,size) ? 'story-watch' : 'unavailable'}`} disabled={!canAdd(selected,size)} onClick={()=>{if(!canAdd(selected,size))return;cart.add(selected.id,size);setSelected(null);setCartOpen(true);}}>{!selected.available ? 'OUT OF STOCK' : size ? 'ADD TO CART' : selected.variants ? 'SELECT AN OPTION' : 'SELECT A SIZE'}</button>{commerce?.mode==='demo' && <p className="preview-note">This is a sample product. Final designs and details are coming soon. Orders will open when the collection launches.</p>}</div></dialog></div>}<Cart open={cartOpen} onClose={()=>setCartOpen(false)} cart={cart} products={products} commerce={commerce}/><Intro/></>;
}
createRoot(document.getElementById('root')).render(<App/>);
