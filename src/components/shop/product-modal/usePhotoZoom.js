import { useRef, useState } from 'react';

const MAX_SCALE = 4;
const SWIPE_DISTANCE = 50;

const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
const IDENTITY = { scale: 1, x: 0, y: 0 };

/**
 * Touch gestures for the enlarged photo: pinch to zoom, drag to pan when
 * zoomed, swipe to change photo when not, double-click to toggle zoom.
 */
export default function usePhotoZoom({ onSwipe }) {
  const [view, setViewState] = useState(IDENTITY);
  const viewRef = useRef(IDENTITY);
  const viewport = useRef(null);
  const gesture = useRef(null);

  const setView = next => { viewRef.current = next; setViewState(next); };
  const reset = () => setView(IDENTITY);

  // Keep the zoomed photo from being dragged completely out of its frame.
  const clamp = (scale, x, y) => {
    const element = viewport.current;
    if (!element || scale <= 1) return IDENTITY;
    const limitX = element.clientWidth * (scale - 1) / 2;
    const limitY = element.clientHeight * (scale - 1) / 2;
    return { scale, x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
  };

  const handlers = {
    onTouchStart(event) {
      const { touches } = event;
      if (touches.length === 2) {
        gesture.current = { mode: 'pinch', distance: distance(touches[0], touches[1]), initial: { ...viewRef.current } };
      } else if (touches.length === 1) {
        gesture.current = {
          mode: viewRef.current.scale > 1 ? 'pan' : 'swipe',
          x: touches[0].clientX, y: touches[0].clientY, initial: { ...viewRef.current }
        };
      }
    },
    onTouchMove(event) {
      const current = gesture.current;
      if (!current) return;
      if (current.mode === 'pinch' && event.touches.length === 2) {
        const ratio = distance(event.touches[0], event.touches[1]) / Math.max(1, current.distance);
        const scale = Math.max(1, Math.min(MAX_SCALE, current.initial.scale * ratio));
        setView(clamp(scale, current.initial.x, current.initial.y));
      } else if (current.mode === 'pan' && event.touches.length === 1) {
        const finger = event.touches[0];
        setView(clamp(current.initial.scale, current.initial.x + finger.clientX - current.x, current.initial.y + finger.clientY - current.y));
      }
    },
    onTouchEnd(event) {
      const current = gesture.current;
      gesture.current = null;
      if (event.touches.length > 0 || current?.mode !== 'swipe' || viewRef.current.scale > 1) return;
      const finger = event.changedTouches[0];
      if (!finger) return;
      const dx = finger.clientX - current.x;
      const dy = finger.clientY - current.y;
      if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.25) onSwipe(dx < 0 ? 1 : -1);
    },
    onTouchCancel() { gesture.current = null; },
    onDoubleClick() { setView(viewRef.current.scale > 1 ? IDENTITY : { scale: 2, x: 0, y: 0 }); }
  };

  return { view, reset, viewport, handlers };
}
