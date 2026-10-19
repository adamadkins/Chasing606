import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { variantFor, canAdd } from './catalog';

const money = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const COLOR_SWATCH_MAP = {
  'black': '#080808',
  'white': '#ffffff',
  'french navy': '#243650',
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

export default function ProductModal({ product, onClose, onAddToCart, commerce, previewOnly = false }) {
  if (!product) return null;

  // Lock background scrolling while this dialog is mounted. Using a fixed body
  // also prevents iOS Safari from moving the page behind the modal.
  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      htmlOverflow: html.style.overflow
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      html.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

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
  const galleryColorKey = Object.keys(product.galleryByColor || {}).find(key => key.toLowerCase() === selectedColor.toLowerCase());
  const generatedColorImages = galleryColorKey ? product.galleryByColor[galleryColorKey] : [];
  const colorImages = [...new Set(
    generatedColorImages?.length
      ? generatedColorImages
      : matchingVariants.flatMap(v => v.images?.length ? v.images : (v.image ? [v.image] : []))
  )];
  // Fourthwall's Comfort Colors tee provides four garment-only renders first,
  // followed by model front/back. Skip the extra garment poses (including folded sleeve).
  // Other products retain up to four photos until their layouts are explicitly mapped.
  const preferredIndexes = product.slug === 'chasing-606-comfort-colors-tee' ? [0, 1, 4, 5] : [0, 1, 2, 3];
  const availableGalleryImages = preferredIndexes.map(index => colorImages[index]).filter(Boolean);
  // The migration preview mirrors Fourthwall's four-view gallery. Keep empty
  // slots visible when Printful has not supplied a front/back or model mockup.
  const galleryImages = previewOnly
    ? [...availableGalleryImages, ...Array(Math.max(0, 4 - availableGalleryImages.length)).fill(null)].slice(0, 4)
    : availableGalleryImages;
  const [galleryIndex, setGalleryIndex] = useState(0);
  const touchStartX = useRef(null);
  const swipedGallery = useRef(false);
  const lightboxTouch = useRef(null);
  const [photoZoom, setPhotoZoom] = useState({ scale: 1, x: 0, y: 0 });
  const photoZoomRef = useRef({ scale: 1, x: 0, y: 0 });
  const photoViewport = useRef(null);
  const setPhotoView = next => { photoZoomRef.current = next; setPhotoZoom(next); };
  const resetPhotoView = () => setPhotoView({ scale: 1, x: 0, y: 0 });
  const touchDistance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const keepInBounds = (scale, x, y) => {
    const el = photoViewport.current;
    if (!el || scale <= 1) return { scale: 1, x: 0, y: 0 };
    const limitX = el.clientWidth * (scale - 1) / 2;
    const limitY = el.clientHeight * (scale - 1) / 2;
    return { scale, x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
  };
  const startLightboxTouch = event => {
    const touches = event.touches;
    if (touches.length === 2) {
      lightboxTouch.current = {
        mode: 'pinch', distance: touchDistance(touches[0], touches[1]),
        initial: { ...photoZoomRef.current }
      };
    } else if (touches.length === 1) {
      lightboxTouch.current = {
        mode: photoZoomRef.current.scale > 1 ? 'pan' : 'swipe',
        x: touches[0].clientX, y: touches[0].clientY,
        initial: { ...photoZoomRef.current }
      };
    }
  };
  const moveLightboxTouch = event => {
    const gesture = lightboxTouch.current;
    if (!gesture) return;
    if (gesture.mode === 'pinch' && event.touches.length === 2) {
      const nextScale = Math.max(1, Math.min(4, gesture.initial.scale * touchDistance(event.touches[0], event.touches[1]) / Math.max(1, gesture.distance)));
      setPhotoView(keepInBounds(nextScale, gesture.initial.x, gesture.initial.y));
    } else if (gesture.mode === 'pan' && event.touches.length === 1) {
      const finger = event.touches[0];
      setPhotoView(keepInBounds(gesture.initial.scale, gesture.initial.x + finger.clientX - gesture.x, gesture.initial.y + finger.clientY - gesture.y));
    }
  };
  const endLightboxTouch = event => {
    const gesture = lightboxTouch.current;
    if (event.touches.length > 0) {
      lightboxTouch.current = null;
      return;
    }
    lightboxTouch.current = null;
    if (gesture?.mode !== 'swipe' || photoZoomRef.current.scale > 1 || galleryImages.length < 2) return;
    const finger = event.changedTouches[0];
    if (!finger) return;
    const dx = finger.clientX - gesture.x;
    const dy = finger.clientY - gesture.y;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.25) changePhoto(dx < 0 ? 1 : -1);
  };
  const [zoomOpen, setZoomOpen] = useState(false);
  const displayedImage = previewOnly
    ? galleryImages[galleryIndex]
    : galleryImages[galleryIndex] || galleryImages[0] || getImageForColor(product, selectedColor);
  useEffect(() => { setGalleryIndex(0); resetPhotoView(); }, [selectedColor, product.id]);
  const changePhoto = direction => {
    resetPhotoView();
    setGalleryIndex(index => (index + direction + galleryImages.length) % galleryImages.length);
  };
  useEffect(() => {
    if (!zoomOpen) return;
    const onKeyDown = event => {
      if (event.key === 'Escape') setZoomOpen(false);
      if (event.key === 'ArrowRight' && galleryImages.length > 1) changePhoto(1);
      if (event.key === 'ArrowLeft' && galleryImages.length > 1) changePhoto(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomOpen, galleryImages.length]);


  function handleAdd() {
    if (!isAvailable || previewOnly) return;
    onAddToCart(product.id, selectedSize, selectedColor, quantity, displayedImage);
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 450);
  }

  function handleBuyNow() {
    if (!isAvailable || previewOnly) return;
    onAddToCart(product.id, selectedSize, selectedColor, quantity, displayedImage, true);
    onClose();
  }

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div
        className="product-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
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
          <div className="product-modal-mobile-heading">
            <p className="modal-eyebrow">CHASING 606 · THE COLLECTION</p>
            <h2 className="modal-title" id="modal-product-title-mobile">{product.name}</h2>
            <div className="modal-price-row">
              <span className="modal-price-amount">{money(currentPrice, currentCurrency)}</span>
              <span className="modal-currency-tag">{currentCurrency}</span>
            </div>
          </div>
          {/* Left Column: Visual Gallery */}
          <div className="product-modal-visuals">
            <div className="product-modal-hero-frame" onTouchStart={e => { touchStartX.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => { if (touchStartX.current == null) return; const dx = e.changedTouches[0].clientX - touchStartX.current; if (Math.abs(dx) > 45 && galleryImages.length > 1) { swipedGallery.current = true; changePhoto(dx < 0 ? 1 : -1); } touchStartX.current = null; }}>
              {displayedImage ? (
                <button type="button" className="product-modal-image-open" aria-label={`Enlarge photo ${galleryIndex + 1} of ${product.name}`} title="Tap to enlarge" onClick={() => { if (swipedGallery.current) { swipedGallery.current = false; return; } setZoomOpen(true); }}>
                  <img
                    src={displayedImage}
                    alt={`${product.name} ${selectedColor}`}
                    className="product-modal-hero-img"
                    loading="eager"
                  />
                </button>
              ) : (
                previewOnly ? <div className="product-preview-unavailable"><Icon name="bag" /><span>Preview image not available from Printful</span></div> :
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
              {galleryImages.map((img, idx) => <button key={img || `missing-${idx}`} type="button" className={`product-thumb-btn ${galleryIndex === idx ? 'is-active' : ''} ${!img ? 'is-missing' : ''}`} onClick={() => setGalleryIndex(idx)} aria-label={img ? `View photo ${idx + 1}` : `Photo ${idx + 1} unavailable`} aria-pressed={galleryIndex === idx}>{img ? <img src={img} alt={`${product.name} photo ${idx + 1}`} /> : <span aria-hidden="true">{idx + 1}</span>}</button>)}
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
                className={`button story-watch modal-add-cta ${!isAvailable || previewOnly ? 'unavailable' : ''}`}
                disabled={!isAvailable || previewOnly}
                onClick={handleAdd}
              >
                {addedNotice ? (
                  <span>✓ ADDED TO CART</span>
                ) : !isAvailable ? (
                  <span>OUT OF STOCK</span>
                ) : (
                  <span>ADD TO CART</span>
                )}
              </button>
            </div>

            <div className="modal-buy-now-wrap">
              <button
                type="button"
                className="modal-buy-now-btn"
                disabled={!isAvailable || previewOnly}
                onClick={handleBuyNow}
              >
                BUY NOW
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
        {zoomOpen && displayedImage && createPortal(
          <div className="product-photo-lightbox" role="dialog" aria-modal="true" aria-label={`Enlarged photos of ${product.name}`} onClick={event => { event.stopPropagation(); resetPhotoView(); setZoomOpen(false); }}>
            <button className="product-photo-lightbox-close" type="button" aria-label="Close enlarged photo" onClick={() => { resetPhotoView(); setZoomOpen(false); }}><span className="lightbox-close-mark" aria-hidden="true" /></button>
            <div className="product-photo-lightbox-content" onClick={event => event.stopPropagation()}>
              <div
                className="product-photo-viewport"
                ref={photoViewport}
                onTouchStart={startLightboxTouch}
                onTouchMove={moveLightboxTouch}
                onTouchEnd={endLightboxTouch}
                onTouchCancel={() => { lightboxTouch.current = null; }}
                onDoubleClick={() => {
                  if (photoZoomRef.current.scale > 1) resetPhotoView();
                  else setPhotoView({ scale: 2, x: 0, y: 0 });
                }}
              >
                <img
                  src={displayedImage}
                  alt={`${product.name}, ${selectedColor}, photo ${galleryIndex + 1}`}
                  draggable="false"
                  style={{ transform: `translate3d(${photoZoom.x}px, ${photoZoom.y}px, 0) scale(${photoZoom.scale})` }}
                />
              </div>
              {galleryImages.length > 1 && <div className="product-photo-lightbox-controls">
                <button type="button" onClick={() => changePhoto(-1)} aria-label="Previous photo">‹</button>
                <span>{galleryIndex + 1} / {galleryImages.length}</span>
                <button type="button" onClick={() => changePhoto(1)} aria-label="Next photo">›</button>
              </div>}
            </div>
          </div>, document.body
        )}
      </div>
    </div>
  );
}
