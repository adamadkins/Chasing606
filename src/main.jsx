import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getProducts, getCommerce, variantFor } from './catalog';
import './style.css';
import LatestVideo from './LatestVideo';
import Icon from './Icon';
import Navigation from './Navigation';
import Brand from './Brand';
import Contact from './Contact';
import SocialLinks from './SocialLinks';
import Cart, { useCart } from './Cart';
import ProductGrid from './ProductGrid';
import ProductModal from './ProductModal';
import CheckoutModal from './CheckoutModal';
import Intro from './Intro';
import About from './About';
import StorySlideshow from './StorySlideshow';

const money = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

function ProductArt({ product }) {
  if (product.image) {
    return (
      <div className="product-art product-photo">
        <img src={product.image} alt={product.imageAlt || product.name} loading="lazy" />
      </div>
    );
  }
  if (product.variants && !product.type) {
    return (
      <div className="product-art missing-photo">
        <Icon name="bag" />
        <span>Photo coming soon</span>
      </div>
    );
  }
  return (
    <div
      className={'product-art ' + (product.type || 'tee')}
      style={{ '--garment': product.tone || '#5d6748' }}
      aria-label={`${product.color || ''} ${product.name} concept illustration`}
      role="img"
    >
      <svg viewBox="0 0 320 280" aria-hidden="true">
        <defs>
          <filter id={'shadow-' + product.id}>
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity=".12" />
          </filter>
        </defs>
        <g filter={`url(#shadow-${product.id})`}>
          {product.type === 'hat' ? (
            <>
              <path fill="var(--garment)" d="M83 168c0-71 28-104 77-104s77 33 77 104Z" />
              <path fill="#514436" d="M93 162c48-13 98-9 145 4 42 12 31 32-10 36-46 5-91-3-135-21Z" />
              <path d="M160 65v90M110 83l-7 73M208 83l13 73" stroke="#ffffff25" fill="none" />
            </>
          ) : (
            <>
              <path fill="var(--garment)" d="M111 58 68 77 31 139l43 25 20-31-4 115h140l-4-115 20 31 43-25-37-62-43-19-49 13Z" />
              {product.type === 'hoodie' ? (
                <>
                  <path fill="var(--garment)" stroke="#0002" d="M112 65c-8-67 104-67 96 0l-48 23Z" />
                  <path d="m139 77-3 61m47-61 3 61M124 202l-9 28h90l-9-28Z" fill="none" stroke="#0003" />
                </>
              ) : (
                <path d="M132 59q28 31 56 0" fill="none" stroke="#0003" strokeWidth="9" />
              )}
            </>
          )}
          <text x="160" y={product.type === 'hat' ? 128 : 135} fill="#eee9da" textAnchor="middle" fontFamily="Georgia" fontSize="13" fontWeight="bold">CHASING 606</text>
          <text x="160" y={product.type === 'hat' ? 140 : 148} fill="#eee9da" textAnchor="middle" fontSize="5" letterSpacing="2">CHASING 606</text>
        </g>
      </svg>
      <span className="concept">OFFICIAL 606 GEAR</span>
    </div>
  );
}

function App() {
  const cart = useCart();
  const [commerce, setCommerce] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLines, setCheckoutLines] = useState([]);
  const [checkoutSubtotal, setCheckoutSubtotal] = useState(0);

  const isMerch = location.pathname.replace(/\/$/, '') === '/merch';
  const isContact = location.pathname.replace(/\/$/, '') === '/contact';
  const isAbout = location.pathname.replace(/\/$/, '') === '/about' || location.pathname.replace(/\/$/, '') === '/story';
  const isHome = !isMerch && !isContact && !isAbout;

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('All gear');
  const [colorFilter, setColorFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [stockOnly, setStockOnly] = useState(false);
  const [priceLimit, setPriceLimit] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    document.title = isMerch
      ? 'Merch | Chasing 606'
      : isContact
      ? 'Contact us | Chasing 606'
      : isAbout
      ? 'Our Story | Chasing 606'
      : 'Chasing 606 — From the heart of 606.';
  }, [isMerch, isContact, isAbout]);

  useEffect(() => {
    const refresh = () =>
      getProducts()
        .then(data => {
          setProducts(data);
          setError(false);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));

    refresh();
    window.addEventListener('focus', refresh);
    getCommerce().then(setCommerce).catch(() => {});
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const open = p => {
    setSelected(p);
  };

  const availableColors = [...new Set(products.flatMap(p => p.colors || []).filter(Boolean))].sort();
  const availableSizes = [...new Set(products.flatMap(p => p.sizes || []).filter(Boolean))].sort();
  const maxCatalogPrice = Math.ceil(Math.max(0, ...products.map(p => Math.max(p.price || 0, ...(p.variants || []).map(v => v.price || 0)))));
  const visibleProducts = products
    .filter(p =>
      (filter === 'All gear' || p.category === filter) &&
      (!colorFilter || p.colors?.includes(colorFilter)) &&
      (!sizeFilter || p.sizes?.includes(sizeFilter)) &&
      (!stockOnly || p.variants?.some(v => v.available && (!colorFilter || v.color === colorFilter) && (!sizeFilter || v.size === sizeFilter))) &&
      (!priceLimit || p.price <= Number(priceLimit)) &&
      `${p.name} ${p.color || ''} ${p.category || ''}`.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0));

  const totalCartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header>
        <a className="header-brand" href="/" aria-label="Chasing 606 home">
          <Brand header />
        </a>
        <Navigation />
        <button
          className="cart-toggle"
          aria-label={`Open cart, ${totalCartCount} items`}
          onClick={() => setCartOpen(true)}
        >
          <Icon name="bag" />
          <span>{totalCartCount}</span>
        </button>
      </header>

      <main>
        {isContact && <Contact />}
        {isAbout && <About />}
        {isHome && (
          <section className="hero">
            <div className="hero-content">
              <p className="eyebrow">
                <span /> OUT HERE IS WHERE WE BELONG
              </p>
              <h1>
                From the heart
                <br />
                of <em>606.</em>
              </h1>
              <p className="hero-mission">
                We follow the trail of suburban giants — guided by sign, silence, and the rare promise of heavy antlers.
              </p>
              <p className="hero-scripture">Proverbs 12:27</p>
              <div className="hero-actions">
                <a className="button cream" href="/merch">
                  EXPLORE THE GEAR <span><Icon /></span>
                </a>
                <a className="watch" href="#watch">
                  <span className="play"><Icon name="play" /></span> WATCH THE LATEST
                </a>
              </div>
            </div>
            <div className="hero-bottom">
              <span>GUIDED BY SIGN / SILENCE / HEAVY ANTLERS</span>
            </div>
          </section>
        )}

        {!isContact && !isAbout && (
          <section id="shop" className={isMerch ? 'shop merch-page' : 'shop'}>
            <div className="section-top">
              <div>
                <p className="eyebrow">WEAR THE STORY</p>
                {isMerch ? <h1>The 606 collection.</h1> : <h2>The 606 collection.</h2>}
              </div>
              <p>
                Heavyweight apparel and field gear built for pursuit.<br />
                Crafted for comfort in the stand and around camp.
              </p>
            </div>

            {isMerch && (
              <div className="catalog-controls">
                <label>
                  Find your gear
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, color, or category"
                  />
                </label>
                <label>
                  Sort by
                  <select value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="featured">Featured</option>
                    <option value="low">Price: low to high</option>
                    <option value="high">Price: high to low</option>
                  </select>
                </label>
              </div>
            )}

            {isMerch && <div className="merch-layout"><aside className="merch-sidebar" aria-label="Shop filters">
              <h3>FILTER THE COLLECTION</h3>
              <label>Category<select value={filter} onChange={e => setFilter(e.target.value)}><option>All gear</option>{[...new Set(products.map(p => p.category).filter(Boolean))].map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Color<select value={colorFilter} onChange={e => setColorFilter(e.target.value)}><option value="">All colors</option>{availableColors.map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Size<select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}><option value="">All sizes</option>{availableSizes.map(sz => <option key={sz}>{sz}</option>)}</select></label>
              <label>Maximum price<select value={priceLimit} onChange={e => setPriceLimit(e.target.value)}><option value="">Any price</option>{[25,50,75,100,150,200,250,500].filter(n => n <= maxCatalogPrice || n === 25).map(n => <option value={n} key={n}>Under {money(n)}</option>)}</select></label>
              <label className="merch-stock-filter"><input type="checkbox" checked={stockOnly} onChange={e => setStockOnly(e.target.checked)}/> In stock only</label>
              <button type="button" onClick={() => {setFilter('All gear');setColorFilter('');setSizeFilter('');setStockOnly(false);setPriceLimit('');setSearch('');}}>Clear all filters</button>
            </aside><div className="merch-results">
            }
            <div className="shop-toolbar">
              <div className="filters" aria-label="Filter products">
                {['All gear', ...new Set(products.map(p => p.category).filter(Boolean))].map(f => (
                  <button
                    key={f}
                    className={f === filter ? 'active' : ''}
                    onClick={() => setFilter(f)}
                    aria-pressed={f === filter}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="shop-collection-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'item' : 'items'}</span>
            </div>

            {loading ? (
              <p role="status">Loading the collection…</p>
            ) : error ? (
              <p role="alert">We couldn’t load the collection. Please refresh to try again.</p>
            ) : (
              <ProductGrid
                animationKey={`${filter}:${colorFilter}:${sizeFilter}:${stockOnly}:${priceLimit}:${search}:${sort}:${visibleProducts.map(p => p.id).join(',')}`}
              >
                {visibleProducts.map(p => (
                  <button className="product" key={p.id} onClick={() => open(p)}>
                    <div className="art-wrap">
                      <span className="product-badge">
                        {p.available ? 'IN STOCK' : 'COMING SOON'}
                      </span>
                      <ProductArt product={p} />
                      <span className="product-arrow">
                        <Icon />
                      </span>
                    </div>
                    <div className="product-details">
                      <h3>{p.name}</h3>
                      <span>{money(p.price, p.currencyCode)}</span>
                    </div>
                    <p>
                      {p.color || ''} {p.category ? <span> / {p.category}</span> : null}
                    </p>
                  </button>
                ))}
              </ProductGrid>
            )}

            {!loading && !error && products.length === 0 && (
              <p className="empty-catalog">The collection is coming soon. Check back for new gear.</p>
            )}

            {!error && products.length > 0 && visibleProducts.length === 0 && (
              <p className="empty-catalog">
                No gear matches your search.{' '}
                <button
                  onClick={() => {
                    setSearch('');
                    setFilter('All gear');
                    setColorFilter(''); setSizeFilter(''); setStockOnly(false); setPriceLimit('');
                  }}
                >
                  Clear filters
                </button>
              </p>
            )}

            {isMerch && </div></div>}
            {isHome && (
              <div className="collection-link">
                <a href="/merch" className="button story-watch">
                  VIEW ALL MERCH <Icon />
                </a>
              </div>
            )}
          </section>
        )}

        {isHome && (
          <>
            <LatestVideo />
            <section id="story" className="story-hero" aria-labelledby="story-title">
              <div className="story-hero-content">
                <p className="eyebrow">
                  <span /> OUT HERE IS WHERE WE BELONG
                </p>
                <h2 id="story-title">
                  Every good story
                  <br />
                  starts <em>outdoors.</em>
                </h2>
                <p className="story-hero-mission">
                  From the heart of 606, Austin follows the sign and puts in the hours. This is the pursuit of suburban giants — where tight timber meets patience, discipline, and the quiet chase.
                </p>
                <p className="story-hero-sub">
                  It’s the anticipation before first light. The patience between sightings. And the stories that stay with you long after the hunt.
                </p>
                <div className="hero-actions">
                  <a className="button story-watch" href="/about">
                    READ OUR STORY <span><Icon /></span>
                  </a>
                </div>
              </div>
              <div className="story-hero-visual">
                <StorySlideshow />
              </div>
              <div className="hero-bottom story-hero-bottom">
                <span>GUIDED BY SIGN / SILENCE / HEAVY ANTLERS</span>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-brand-section">
            <a href="/" className="footer-logo-link" aria-label="Chasing 606 home">
              <Brand small />
            </a>
            <p className="footer-tagline">Hunting. Patience. Chasing what matters.</p>
          </div>
          <div className="footer-nav" role="navigation" aria-label="Footer navigation">
            <a href="/merch">Merch</a>
            <a href="/about">Our story</a>
            <a href="/contact">Connect</a>
          </div>
          <div className="footer-social-section">
            <SocialLinks />
          </div>
          <div className="footer-copyright">
            <span>© {new Date().getFullYear()} Chasing 606</span>
          </div>
        </div>
      </footer>

      {selected && (
        <ProductModal
          product={selected}
          onClose={() => setSelected(null)}
          onAddToCart={(id, size, color, qty, image, buyNow) => {
            cart.add(id, size, color, qty, image);
            if (buyNow) {
              const product = products.find(p => p.id === id);
              const variant = variantFor(product, size, color);
              const line = {
                id,
                size,
                color,
                quantity: qty,
                product,
                variant,
                displayImg: image || product?.image,
                unitPrice: variant?.price ?? product?.price ?? 0,
                currencyCode: variant?.currencyCode ?? product?.currencyCode ?? 'USD'
              };
              setCheckoutLines([line]);
              setCheckoutSubtotal(line.unitPrice * qty);
              setCheckoutOpen(true);
            } else {
              setCartOpen(true);
            }
          }}
          commerce={commerce}
        />
      )}

      <Cart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        products={products}
        commerce={commerce}
        onOpenCheckout={(lines, subtotal) => {
          setCheckoutLines(lines);
          setCheckoutSubtotal(subtotal);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        lines={checkoutLines.length ? checkoutLines : cart.items.map(i => {
          const product = products.find(p => p.id === i.id);
          const variant = variantFor(product, i.size, i.color);
          return {
            ...i,
            product,
            variant,
            displayImg: i.image || product?.image,
            unitPrice: variant?.price ?? product?.price ?? 0,
            currencyCode: variant?.currencyCode ?? product?.currencyCode ?? 'USD'
          };
        }).filter(l => l.product)}
        subtotal={checkoutSubtotal || cart.items.reduce((sum, i) => {
          const product = products.find(p => p.id === i.id);
          const variant = variantFor(product, i.size, i.color);
          return sum + (variant?.price ?? product?.price ?? 0) * i.quantity;
        }, 0)}
        onOrderSuccess={() => {
          cart.clear();
        }}
      />

      <Intro />
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
