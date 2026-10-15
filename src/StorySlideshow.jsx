import React, { useState, useEffect } from 'react';
import whitetailBuckImg from './assets/images/whitetail_buck_1792096498234.jpg';
import wildTurkeyImg from './assets/images/wild_turkey_1792096499683.jpg';
import timberBuckFrostImg from './assets/images/timber_buck_frost_1792096499267.jpg';

// Photos for the Our Story section — bundled with Vite and mirrored to public/images for universal mobile & production support
export const defaultStoryPhotos = [
  {
    id: 'trophy-buck',
    src: whitetailBuckImg,
    publicSrc: '/images/whitetail_buck.jpg',
    fallbackSrc: 'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=1800&q=85',
    alt: 'Trophy whitetail buck with heavy antlers in the autumn timber',
  },
  {
    id: 'wild-turkey',
    src: wildTurkeyImg,
    publicSrc: '/images/wild_turkey.jpg',
    fallbackSrc: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1800&q=85',
    alt: 'Wild tom turkey strutting with fanned feathers along the timber line',
  },
  {
    id: 'suburban-frost-buck',
    src: timberBuckFrostImg,
    publicSrc: '/images/timber_buck_frost.jpg',
    fallbackSrc: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1800&q=85',
    alt: 'Mature whitetail buck moving along a frosty timber creek at dawn',
  },
  {
    id: 'hardwood-trail',
    src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=85',
    publicSrc: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=85',
    fallbackSrc: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=85',
    alt: 'Deep autumn hardwood forest trail in the heart of 606',
  },
];

export default function StorySlideshow({ photos = defaultStoryPhotos }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % photos.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [photos.length]);

  return (
    <div className="story-cinematic-stage" aria-roledescription="carousel" aria-label="Our Story photograph slideshow">
      {photos.map((photo, i) => (
        <div
          key={photo.id}
          className={`story-cinematic-slide${i === index ? ' is-active' : ''}`}
          aria-hidden={i !== index}
        >
          <img
            src={photo.src || photo.publicSrc}
            alt={photo.alt}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding={i === 0 ? 'sync' : 'async'}
            fetchPriority={i === 0 ? 'high' : 'auto'}
            referrerPolicy="no-referrer"
            className="story-cinematic-image"
            onError={(e) => {
              if (photo.publicSrc && e.currentTarget.src !== window.location.origin + photo.publicSrc && !e.currentTarget.src.includes(photo.publicSrc)) {
                e.currentTarget.src = photo.publicSrc;
              } else if (photo.fallbackSrc && e.currentTarget.src !== photo.fallbackSrc) {
                e.currentTarget.src = photo.fallbackSrc;
              }
            }}
          />
        </div>
      ))}

      {/* Gradient fade blending left edge seamlessly into dark background */}
      <div className="story-cinematic-fade" aria-hidden="true" />

      {/* Subtle indicator dots */}
      {photos.length > 1 && (
        <div className="story-cinematic-dots" aria-label="Select photo">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              className={`story-dot${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
