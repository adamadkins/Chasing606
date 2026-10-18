import React from 'react';
import whitetailBuckImg from './assets/images/whitetail_buck_1792096498234.jpg';
import wildTurkeyImg from './assets/images/wild_turkey_1792096499683.jpg';
import timberBuckFrostImg from './assets/images/timber_buck_frost_1792096499267.jpg';

// Photos for the Our Story section — bundled with Vite and mirrored to public/images for universal mobile & production support
export const defaultStoryPhotos = [
  {
    id: 'outdoors',
    src: '/images/IMG_1754.jpeg',
    alt: 'Hunters celebrating together beside a mature whitetail buck outdoors',
  },
  {
    id: 'gobble',
    src: '/images/IMG_1667.jpeg',
    alt: 'Wild turkey displaying its fan in spring grass',
  },
  {
    id: 'before-daylight',
    src: '/images/IMG_8651.jpeg',
    alt: 'Hunter heading into the woods with a headlamp before daylight',
  },
  {
    id: 'on-the-trail',
    src: '/images/Untitled%20design.jpeg',
    alt: 'Two whitetail deer standing together among the trees',
  },
];

export default function StorySlideshow({ photos = defaultStoryPhotos, index = 0, onSelect = () => {} }) {

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
              onClick={() => onSelect(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
