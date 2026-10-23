import { useRef } from 'react';
import useReveal from '../../hooks/useReveal';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, onOpen, headingLevel }) {
  const grid = useRef(null);
  // Replay the reveal whenever filtering changes which products are shown.
  useReveal(grid, products.map(product => product.id).join());

  return (
    <div className="product-grid" ref={grid}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} onOpen={onOpen} headingLevel={headingLevel} revealDelay={`${(index % 4) * 75}ms`} />
      ))}
    </div>
  );
}
