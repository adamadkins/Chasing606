import { useEffect, useRef } from 'react';
import useModalDialog from '../../../hooks/useModalDialog';
import usePhotoZoom from './usePhotoZoom';

/** Full-screen photo viewer, opened from the product gallery. */
export default function Lightbox({ images, index, onIndexChange, label, onClose }) {
  const dialog = useRef(null);
  useModalDialog(dialog, onClose);
  const many = images.length > 1;

  // Gestures and keys both call the latest `go`, without re-subscribing every render.
  const goRef = useRef(null);
  const { view, reset, viewport, handlers } = usePhotoZoom({ onSwipe: direction => goRef.current(direction) });
  useEffect(() => {
    goRef.current = direction => {
      if (!many) return;
      reset();
      onIndexChange((index + direction + images.length) % images.length);
    };
  });
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'ArrowRight') goRef.current(1);
      if (event.key === 'ArrowLeft') goRef.current(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-label={`Enlarged photos of ${label}`}
      onClick={event => { if (!event.target.closest('.lightbox__content, .lightbox__close')) dialog.current.close(); }}
    >
      <button type="button" className="lightbox__close" aria-label="Close enlarged photo" onClick={() => dialog.current.close()}>
        <span aria-hidden="true" />
      </button>
      <div className="lightbox__content">
        <div className="lightbox__viewport" ref={viewport} {...handlers}>
          <img
            src={images[index]}
            alt={`${label}, photo ${index + 1} of ${images.length}`}
            draggable="false"
            style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
          />
        </div>
        {many && (
          <div className="lightbox__controls">
            <button type="button" onClick={() => goRef.current(-1)} aria-label="Previous photo">‹</button>
            <span aria-live="polite">{index + 1} / {images.length}</span>
            <button type="button" onClick={() => goRef.current(1)} aria-label="Next photo">›</button>
          </div>
        )}
      </div>
    </dialog>
  );
}
