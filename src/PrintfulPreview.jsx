import React, { useEffect, useState } from 'react';
import Brand from './Brand';
import Navigation from './Navigation';

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const swatches = { 'French Navy': '#243650', White: '#fff' };

export default function PrintfulPreview() {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [color, setColor] = useState('French Navy');
  const [size, setSize] = useState('S');
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => {
    document.title = 'Printful Preview | Chasing 606';
    const controller = new AbortController();
    fetch('/api/printful/storefront-preview', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('Product preview is unavailable.'); return r.json(); })
      .then(data => { if (!data.product) throw new Error('No preview product found.'); setProduct(data.product); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, []);
  const variant = product?.variants?.find(v => v.color === color && v.size === size);
  const gallery = product?.galleryByColor?.[color] || [];
  const image = gallery[imageIndex] || product?.imagesByColor?.[color] || (color === 'French Navy' ? product?.image : null);
  const changeColor = next => { setColor(next); setImageIndex(0); };
  return (
    <>
      <header><a className="header-brand" href="/" aria-label="Chasing 606 home"><Brand header /></a><Navigation /></header>
      <main className="printful-preview-page">
        <div className="printful-preview-top"><a href="/merch">← BACK TO THE COLLECTION</a><span>PRIVATE WORK-IN-PROGRESS PREVIEW · CHECKOUT DISABLED</span></div>
        {error && <p role="alert">{error}</p>}
        {!error && !product && <p role="status">Loading Printful product…</p>}
        {product && <div className="printful-preview-layout">
          <div className="printful-preview-gallery"><div className="printful-preview-art">{image ? <img src={image} alt={`${product.name} in ${color}, view ${imageIndex + 1}`} /> : <p className="printful-preview-missing">Mockup for {color} is not available from Printful yet.</p>}<span>PRINTFUL TEST PRODUCT</span>{gallery.length > 1 && <div className="printful-preview-gallery-controls"><button type="button" onClick={() => setImageIndex(i => (i - 1 + gallery.length) % gallery.length)} aria-label="Previous image">‹</button><span>{imageIndex + 1} / {gallery.length}</span><button type="button" onClick={() => setImageIndex(i => (i + 1) % gallery.length)} aria-label="Next image">›</button></div>}</div>{gallery.length > 1 && <div className="printful-preview-thumbnails">{gallery.map((src, i) => <button type="button" key={src} className={i === imageIndex ? "selected" : ""} onClick={() => setImageIndex(i)} aria-label={`View image ${i + 1}`}><img src={src} alt="" /></button>)}</div>}</div>
          <section className="printful-preview-details">
            <p className="eyebrow">CHASING 606 · PRODUCT PREVIEW</p>
            <h1>{product.name}</h1>
            <p className="printful-preview-price">{money(variant?.price ?? product.price)}</p>
            <p className="printful-preview-note">This is a preview of the Printful integration. It is not available to purchase here.</p>
            <fieldset><legend>COLOR — {color}</legend><div className="printful-preview-options">{product.colors.map(c => <button type="button" key={c} className={c === color ? 'selected' : ''} onClick={() => changeColor(c)} aria-pressed={c === color}><span className="printful-preview-swatch" style={{ background: swatches[c] || '#777' }} />{c}</button>)}</div></fieldset>
            <fieldset><legend>SIZE — {size}</legend><div className="printful-preview-options">{product.sizes.map(s => <button type="button" key={s} className={s === size ? 'selected' : ''} onClick={() => setSize(s)} aria-pressed={s === size}>{s}</button>)}</div></fieldset>
            <div className="printful-preview-variant">Selected: {color} / {size} · {money(variant?.price ?? product.price)}</div>
            <button className="printful-preview-disabled" type="button" disabled>CHECKOUT COMING SOON</button>
            <p className="printful-preview-note">The live merch collection still uses Fourthwall. Images are retrieved from Printful when available. Missing views are not replaced with images of a different color.</p>
          </section>
        </div>}
      </main>
    </>
  );
}
