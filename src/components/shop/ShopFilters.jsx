import { activeFilterCount, allColors, allSizes, DEFAULT_QUERY, PRICE_STEPS } from '../../lib/catalog';
import { formatMoney } from '../../lib/format';

export const FILTER_PANEL_ID = 'shop-filters';

/** The "Filters" button shown on small screens. */
export function FilterToggle({ query, open, onToggle }) {
  const active = activeFilterCount(query);
  return (
    <button type="button" className="filter-toggle" aria-expanded={open} aria-controls={FILTER_PANEL_ID} onClick={onToggle}>
      <span>Filters{active ? ` · ${active} active` : ''}</span>
      <span className="filter-toggle__icon" aria-hidden="true"><span /><span /><span /></span>
    </button>
  );
}

export default function ShopFilters({ products, query, onChange, open }) {
  const set = patch => onChange({ ...query, ...patch });
  const highestPrice = Math.ceil(Math.max(0, ...products.map(product => product.price)));
  const priceSteps = PRICE_STEPS.filter(step => step <= highestPrice);

  return (
    <aside id={FILTER_PANEL_ID} className={`shop-filters${open ? ' is-open' : ''}`} aria-label="Shop filters">
      <h2>Filter the collection</h2>
      <label>
        Color
        <select value={query.color} onChange={event => set({ color: event.target.value })}>
          <option value="">All colors</option>
          {allColors(products).map(color => <option key={color}>{color}</option>)}
        </select>
      </label>
      <label>
        Size
        <select value={query.size} onChange={event => set({ size: event.target.value })}>
          <option value="">All sizes</option>
          {allSizes(products).map(size => <option key={size}>{size}</option>)}
        </select>
      </label>
      <label>
        Maximum price
        <select value={query.maxPrice} onChange={event => set({ maxPrice: event.target.value })}>
          <option value="">Any price</option>
          {(priceSteps.length ? priceSteps : PRICE_STEPS.slice(0, 1)).map(step => (
            <option key={step} value={step}>Under {formatMoney(step)}</option>
          ))}
        </select>
      </label>
      <label className="shop-filters__check">
        <input type="checkbox" checked={query.stockOnly} onChange={event => set({ stockOnly: event.target.checked })} />
        In stock only
      </label>
      <button type="button" className="shop-filters__clear" onClick={() => onChange({ ...DEFAULT_QUERY, sort: query.sort })}>
        Clear all filters
      </button>
    </aside>
  );
}
