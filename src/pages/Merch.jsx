import { useMemo, useState } from 'react';
import useCatalog from '../hooks/useCatalog';
import { allCategories, DEFAULT_QUERY, queryProducts } from '../lib/catalog';
import { CategoryTabs, ShopFilters, FilterToggle } from '../components/shop';
import CatalogResults from '../components/shop/CatalogResults';
import '../components/shop/shop.css';

export default function Merch() {
  const { products } = useCatalog();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visible = useMemo(() => queryProducts(products, query), [products, query]);
  const set = patch => setQuery(current => ({ ...current, ...patch }));

  return (
    <section className="shop shop--page page-shell">
      <div className="page-heading">
        <p className="eyebrow">Chasing 606 gear</p>
        <h1>The 606 collection.</h1>
        <p>Shirts, hats, and other Chasing 606 gear.<br />Good for the woods or wherever the day takes you.</p>
      </div>

      <div className="shop-controls">
        <label>
          Find your gear
          <input type="search" value={query.search} onChange={event => set({ search: event.target.value })} placeholder="Search by name, color, or category" />
        </label>
        <label>
          Sort by
          <select value={query.sort} onChange={event => set({ sort: event.target.value })}>
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>

      <FilterToggle query={query} open={filtersOpen} onToggle={() => setFiltersOpen(open => !open)} />

      <div className="shop-layout">
        <ShopFilters products={products} query={query} onChange={setQuery} open={filtersOpen} />
        <div className="shop-results">
          <CategoryTabs categories={allCategories(products)} value={query.category} onChange={category => set({ category })} count={visible.length} />
          <CatalogResults headingLevel={2} products={visible} onClearFilters={() => setQuery(DEFAULT_QUERY)} />
        </div>
      </div>
    </section>
  );
}
