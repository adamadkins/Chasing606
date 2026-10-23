import { useState } from 'react';
import { coverImage, imageAtSize } from '../../lib/catalog';
import { formatMoney } from '../../lib/format';
import Icon from '../ui/Icon';
import ColorDots from './ColorDots';

export default function ProductCard({ product, onOpen, revealDelay, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  const [color, setColor] = useState(product.colors[0]?.name ?? '');
  const image = coverImage(product, color);

  return (
    <article className="product-card" data-reveal style={{ '--reveal-delay': revealDelay }}>
      <div className="product-card__art">
        {image ? (
          <img src={imageAtSize(image, 600)} alt={`${product.name} in ${color}`} loading="lazy" width="600" height="600" />
        ) : (
          <div className="product-card__placeholder"><Icon name="bag" /><span>Photo coming soon</span></div>
        )}
        <span className="product-card__badge">{product.available ? 'In stock' : 'Sold out'}</span>
        <span className="product-card__arrow"><Icon /></span>
      </div>

      <div className="product-card__details">
        <Heading className="product-card__name">
          <button type="button" className="product-card__open" aria-haspopup="dialog" onClick={() => onOpen(product, color)}>
            {product.name}
          </button>
        </Heading>
        <span className="product-card__price">{formatMoney(product.price, product.currency)}</span>
      </div>

      {product.colors.length > 0 && (
        <ColorDots product={product} selected={color} onSelect={setColor} />
      )}
      <p className="product-card__type">{product.type || product.category}</p>
    </article>
  );
}
