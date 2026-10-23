import { useRef, useState } from 'react';
import { imageAtSize } from '../../../lib/catalog';
import Icon from '../../ui/Icon';
import Lightbox from './Lightbox';

/** Photos for one colorway. Remount (via `key`) to reset to the first photo. */
export default function Gallery({ images, name, color, available }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef(null);
  const swiped = useRef(false);
  const many = images.length > 1;
  const step = direction => setIndex(current => (current + direction + images.length) % images.length);

  const onTouchEnd = event => {
    if (touchStartX.current == null) return;
    const dx = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (many && Math.abs(dx) > 45) { swiped.current = true; step(dx < 0 ? 1 : -1); }
  };
  const openZoom = () => {
    if (swiped.current) { swiped.current = false; return; }
    setZoomed(true);
  };

  return (
    <div className="gallery">
      <div
        className="gallery__stage"
        onTouchStart={event => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={onTouchEnd}
      >
        {images.length ? (
          <button type="button" className="gallery__zoom" aria-label={`Enlarge photo ${index + 1} of ${name}`} title="Tap to enlarge" onClick={openZoom}>
            <img src={imageAtSize(images[index], 900)} alt={`${name}, ${color}`} />
          </button>
        ) : (
          <div className="gallery__empty"><Icon name="bag" /><span>Photo coming soon</span></div>
        )}

        {many && (
          <>
            <button type="button" className="gallery__arrow gallery__arrow--prev" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>
            <button type="button" className="gallery__arrow gallery__arrow--next" aria-label="Next photo" onClick={() => step(1)}>›</button>
            <span className="gallery__counter">{index + 1} / {images.length}</span>
          </>
        )}
        <span className={`gallery__badge${available ? '' : ' is-sold-out'}`}>{available ? 'In stock' : 'Sold out'}</span>
      </div>

      {many && (
        <div className="gallery__thumbs">
          {images.map((image, i) => (
            <button key={image} type="button" className={i === index ? 'is-active' : ''} aria-label={`View photo ${i + 1}`} aria-pressed={i === index} onClick={() => setIndex(i)}>
              <img src={imageAtSize(image, 200)} alt="" />
            </button>
          ))}
        </div>
      )}

      {zoomed && (
        <Lightbox images={images} index={index} onIndexChange={setIndex} label={`${name}, ${color}`} onClose={() => setZoomed(false)} />
      )}
    </div>
  );
}
