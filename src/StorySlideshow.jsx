import React, { useState, useEffect } from 'react';

// Photos for the Our Story section — you can easily attach or replace your photos here
export const defaultStoryPhotos = [
  {
    id: 'trophy-buck',
    src: '/src/assets/images/whitetail_buck_1792096498234.jpg',
    alt: 'Trophy whitetail buck with heavy antlers in the autumn timber',
  },
  {
    id: 'wild-turkey',
    src: '/src/assets/images/wild_turkey_1792096499683.jpg',
    alt: 'Wild tom turkey strutting with fanned feathers along the timber line',
  },
  {
    id: 'suburban-frost-buck',
    src: '/src/assets/images/timber_buck_frost_1792096499267.jpg',
    alt: 'Mature whitetail buck moving along a frosty timber creek at dawn',
  },
  {
    id: 'hardwood-trail',
    src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=85',
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
            src={photo.src}
            alt={photo.alt}
            loading={i === 0 ? 'eager' : 'lazy'}
            referrerPolicy="no-referrer"
            className="story-cinematic-image"
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
