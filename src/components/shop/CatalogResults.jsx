import { useState } from 'react';
import useCatalog from '../../hooks/useCatalog';
import ProductGrid from './ProductGrid';
import ProductModal from './product-modal/ProductModal';

/** The product grid plus its loading / error / empty states, and the product dialog. */
/** `headingLevel` is the level used for product names, one below the section heading above the grid. */
export default function CatalogResults({ products, onClearFilters, headingLevel }) {
  const catalog = useCatalog();
  const [selected, setSelected] = useState(null);

  if (catalog.status === 'loading') return <p className="catalog-message" role="status">Loading the collection…</p>;
  if (catalog.status === 'error') {
    return (
      <p className="catalog-message" role="alert">
        We couldn’t load the collection.{' '}
        <button type="button" className="catalog-message__action" onClick={catalog.retry}>Try again</button>
      </p>
    );
  }
  if (!catalog.products.length) return <p className="catalog-message">The collection is coming soon. Check back for new gear.</p>;
  if (!products.length) {
    return (
      <p className="catalog-message">
        No gear matches your search.{' '}
        <button type="button" className="catalog-message__action" onClick={onClearFilters}>Clear filters</button>
      </p>
    );
  }

  return (
    <>
      <ProductGrid headingLevel={headingLevel} products={products} onOpen={(product, color) => setSelected({ product, color })} />
      {selected && (
        <ProductModal key={selected.product.id} product={selected.product} initialColor={selected.color} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
