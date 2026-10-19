import React, { useEffect, useState } from 'react';
import Brand from './Brand';
import Navigation from './Navigation';
import Icon from './Icon';
import ProductModal, { getImageForColor } from './ProductModal';

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function PrintfulPreview() {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [mockupStatus, setMockupStatus] = useState('');

  useEffect(() => {
    document.title = 'Printful Preview | Chasing 606';
    const controller = new AbortController();
    let retryTimer;
    const load = () => fetch('/api/printful/storefront-preview', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Product preview is unavailable.');
        return response.json();
      })
      .then(data => {
        if (!data.product) throw new Error('No preview product found.');
        setProduct(data.product);
        setMockupStatus(data.mockupStatus || '');
        setOpen(true);
        if (data.mockupStatus === 'pending') retryTimer = window.setTimeout(load, 11000);
      })
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message);
      });
    load();
    return () => { controller.abort(); window.clearTimeout(retryTimer); };
  }, []);

  const image = product ? getImageForColor(product, product.colors?.[0]) : '';

  return (
    <>
      <header>
        <a className="header-brand" href="/" aria-label="Chasing 606 home"><Brand header /></a>
        <Navigation />
      </header>
      <main className="printful-preview-page">
        <div className="printful-preview-top">
          <a href="/merch">← BACK TO THE COLLECTION</a>
          <span>PRIVATE WORK-IN-PROGRESS PREVIEW · CHECKOUT DISABLED</span>
        </div>
        <section className="printful-preview-intro">
          <p className="eyebrow">CHASING 606 · PRINTFUL TEST</p>
          <h1>Product preview.</h1>
          <p>This product uses the same customer-facing preview as the live Fourthwall collection.</p>
        </section>
        {error && <p role="alert" className="printful-preview-note">{error}</p>}
        {!error && !product && <p role="status">Loading Printful product…</p>}
        {product && mockupStatus === 'pending' && <p role="status" className="printful-preview-note">Generating the four Printful product views…</p>}
        {product && (
          <div className="printful-preview-product">
            <button className="product" type="button" onClick={() => setOpen(true)} aria-label={`Preview ${product.name}`}>
              <div className="art-wrap">
                <span className="product-badge">PREVIEW</span>
                <div className="product-art product-photo">
                  {image ? <img src={image} alt={product.name} /> : <span>Photo coming soon</span>}
                </div>
                <span className="product-arrow"><Icon /></span>
              </div>
              <div className="product-details"><h2>{product.name}</h2><span>{money(product.price)}</span></div>
            </button>
            <button type="button" className="button story-watch" onClick={() => setOpen(true)}>
              OPEN PRODUCT PREVIEW <Icon />
            </button>
          </div>
        )}
      </main>
      {product && open && (
        <ProductModal
          product={product}
          previewOnly
          commerce={{ mode: 'printful', checkoutEnabled: false }}
          onClose={() => setOpen(false)}
          onAddToCart={() => {}}
        />
      )}
    </>
  );
}
