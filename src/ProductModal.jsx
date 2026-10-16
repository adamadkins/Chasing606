import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { variantFor, canAdd } from './catalog';

const money = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const COLOR_SWATCH_MAP = {
  'black': '#080808',
  'white': '#ffffff',
  'pepper': '#514f4c',
  'moss': '#5d6748',
  'oat': '#c5bbaa',
  'stone': '#a3a297',
  'timber': '#665545',
  'timber & moss': '#55493b'
};

export function getImageForColor(prod, color) {
  if (!prod) return '';
  const search = (color || '').trim().toLowerCase();
  if (prod.imagesByColor && search) {
    const directKey = Object.keys(prod.imagesByColor).find(k => k.trim().toLowerCase() === search);
    if (directKey && prod.imagesByColor[directKey]) return prod.imagesByColor[directKey];
  }
  if (prod.variants?.length && search) {
    const matchingVariant = prod.variants.find(
      v => (v.color || '').trim().toLowerCase() === search && v.image
    );
    if (matchingVariant?.image) return matchingVariant.image;
  }
  return prod.image || '';
}

export default function ProductModal({ product, onClose, onAddToCart, commerce }) {
  if (!product) return null;

  // Determine available colors and sizes
  const colors = product.colors || (product.color ? product.color.split(',').map(c => c.trim()) : []);
  const [selectedColor, setSelectedColor] = useState(colors[0] || product.color || '');
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(() => getImageForColor(product, colors[0] || product.color || ''));
  const [addedNotice, setAddedNotice] = useState(false);

  // Sync active image when color changes
  useEffect(() => {
    if (product && selectedColor) {
      const nextImg = getImageForColor(product, selectedColor);
      if (nextImg) setActiveImage(nextImg);
    }
  }, [selectedColor, product]);

  // Find currently matched variant for price and stock
  const currentVariant = variantFor(product, selectedSize, selectedColor);
  const currentPrice = currentVariant?.price ?? product.price ?? 0;
  const currentCurrency = currentVariant?.currencyCode ?? product.currencyCode ?? 'USD';
  const isAvailable = Boolean(currentVariant?.available);

  // Fourthwall typically orders images as garment front/back, then model poses.
  // Only use photos associated with the selected color; avoid mixing colorways.
  const matchingVariants = (product.variants || []).filter(v => !selectedColor || (v.color || '').toLowerCase() === selectedColor.toLowerCase());
  const colorImages = [...new Set(matchingVariants.flatMap(v => v.images?.length ? v.images : (v.image ? [v.image] : [])))];
  // Fourthwall's Comfort Colors tee provides four garment-only renders first,
  // followed by model front/back. Skip the extra garment poses (including folded sleeve).
  // Other products retain up to four photos until their layouts are explicitly mapped.
  const preferredIndexes = product.slug === 'chasing-606-comfort-colors-tee' ? [0, 1, 4, 5] : [0, 1, 2, 3];
  const galleryImages = preferredIndexes.map(index => colorImages[index]).filter(Boolean);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const touchStartX = useRef(null);
  const displayedImage = galleryImages[galleryIndex] || galleryImages[0] || getImageForColor(product, selectedColor);
  useEffect(() => { setGalleryIndex(0); }, [selectedColor, product.id]);
  const changePhoto = direction => setGalleryIndex(index => (index + direction + galleryImages.length) % galleryImages.length);


  function handleAdd() {
    if (!isAvailable) return;
    onAddToCart(product.id, selectedSize, selectedColor, quantity, displayedImage);
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 450);
  }

  function handleBuyNow() {
    if (!isAvailable) return;
    onAddToCart(product.id, selectedSize, selectedColor, quantity, displayedImage, true);
    onClose();
  }

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div
        className="product-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-product-title"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="modal-close-trigger"
          onClick={onClose}
          aria-label="Close product window"
        >
          <Icon name="close" />
        </button>

        <div className="product-modal-grid">
          {/* Left Column: Visual Gallery */}
          <div className="product-modal-visuals">
            <div className="product-modal-hero-frame" onTouchStart={e => { touchStartX.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => { if (touchStartX.current == null) return; const dx = e.changedTouches[0].clientX - touchStartX.current; if (Math.abs(dx) > 45 && galleryImages.length > 1) changePhoto(dx < 0 ? 1 : -1); touchStartX.current = null; }}>
              {displayedImage ? (
                <img
                  src={displayedImage}
                  alt={`${product.name} ${selectedColor}`}
                  className="product-modal-hero-img"
                  loading="eager"
                />
              ) : (
                <div className={`product-art ${product.type || 'tee'}`} style={{ '--garment': product.tone || '#5d6748' }}>
                  <svg viewBox="0 0 320 280" aria-hidden="true">
                    <text x="160" y="140" fill="#eee9da" textAnchor="middle" fontFamily="Georgia" fontSize="13" fontWeight="bold">CHASING 606</text>
                  </svg>
                  <span className="concept">OFFICIAL 606 GEAR</span>
                </div>
              )}
              {galleryImages.length > 1 && <>
                <button type="button" className="product-gallery-arrow prev" aria-label="Previous product photo" onClick={() => changePhoto(-1)}>‹</button>
                <button type="button" className="product-gallery-arrow next" aria-label="Next product photo" onClick={() => changePhoto(1)}>›</button>
                <span className="product-gallery-counter">{galleryIndex + 1} / {galleryImages.length}</span>
              </>}
              <div className="product-modal-badge">
                <span className="stock-indicator-dot" />
                <span>{isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}</span>
              </div>
            </div>

            {galleryImages.length > 1 && <div className="product-modal-thumbnails">
              {galleryImages.map((img, idx) => <button key={img} type="button" className={`product-thumb-btn ${galleryIndex === idx ? 'is-active' : ''}`} onClick={() => setGalleryIndex(idx)} aria-label={`View photo ${idx + 1}`} aria-pressed={galleryIndex === idx}><img src={img} alt={`${product.name} photo ${idx + 1}`} /></button>)}
            </div>}
          </div>

          {/* Right Column: Buying Details */}
          <div className="product-modal-info">
            <div className="modal-header-section">
              <p className="modal-eyebrow">CHASING 606 · THE COLLECTION</p>
              <h2 id="modal-product-title" className="modal-title">{product.name}</h2>
              <div className="modal-price-row">
                <span className="modal-price-amount">{money(currentPrice, currentCurrency)}</span>
                <span className="modal-currency-tag">{currentCurrency}</span>
                <span className="modal-shipping-pill">Free US shipping over $75</span>
              </div>
            </div>

            <p className="modal-description">{product.description}</p>

            {/* Color Selector */}
            {colors.length > 0 && (
              <div className="modal-option-block">
                <div className="modal-option-label">
                  <span>Color:</span>
                  <strong>{selectedColor}</strong>
                </div>
                <div className="modal-color-swatches" role="radiogroup" aria-label="Select color">
                  {colors.map(col => {
                    const hex = COLOR_SWATCH_MAP[col.toLowerCase()] || '#555';
                    const isSelected = selectedColor.toLowerCase() === col.toLowerCase();
                    return (
                      <button
                        key={col}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`modal-color-pill ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedColor(col);
                          const nextImg = getImageForColor(product, col);
                          if (nextImg) setActiveImage(nextImg);
                        }}
                      >
                        <span className="swatch-bubble" style={{ backgroundColor: hex }} />
                        <span className="swatch-name">{col}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="modal-option-block">
                <div className="modal-option-label">
                  <span>Size:</span>
                  <strong>{selectedSize}</strong>
                  {selectedSize.includes('2XL') || selectedSize.includes('3XL') || selectedSize.includes('4XL') ? (
                    <span className="extended-size-note">(+$2-$6 for extended sizes)</span>
                  ) : null}
                </div>
                <div className="modal-size-chips" role="radiogroup" aria-label="Select size">
                  {product.sizes.map(sz => {
                    const isSelected = selectedSize === sz;
                    const variantCheck = variantFor(product, sz, selectedColor);
                    const sizeAvailable = Boolean(variantCheck?.available && (!selectedColor || variantCheck.color === selectedColor));
                    return (
                      <button
                        key={sz}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={!sizeAvailable}
                        className={`modal-size-chip ${isSelected ? 'is-selected' : ''} ${!sizeAvailable ? 'is-disabled' : ''}`}
                        onClick={() => setSelectedSize(sz)}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector & Action CTA */}
            <div className="modal-action-row">
              <div className="modal-qty-stepper">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="qty-number" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(q => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={`button story-watch modal-add-cta ${!isAvailable ? 'unavailable' : ''}`}
                disabled={!isAvailable}
                onClick={handleAdd}
              >
                {addedNotice ? (
                  <span>✓ ADDED TO BAG</span>
                ) : !isAvailable ? (
                  <span>OUT OF STOCK</span>
                ) : (
                  <span>ADD TO BAG — {money(currentPrice * quantity, currentCurrency)}</span>
                )}
              </button>
            </div>

            <div className="modal-buy-now-wrap">
              <button
                type="button"
                className="modal-buy-now-btn"
                disabled={!isAvailable}
                onClick={handleBuyNow}
              >
                BUY NOW WITH FOURTHWALL CHECKOUT ➔
              </button>
            </div>

            {/* Feature Highlights */}
            {product.details && (
              <div className="modal-specs-list">
                <h4>PRODUCT DETAILS & QUALITY GUARANTEE</h4>
                <ul>
                  {product.details.map((detail, i) => (
                    <li key={i}>
                      <span className="spec-check">✓</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                  <li>
                    <span className="spec-check">✓</span>
                    <span>Secure checkout powered by Fourthwall</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
