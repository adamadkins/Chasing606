export default function CategoryTabs({ categories, value, onChange, count }) {
  return (
    <div className="category-tabs">
      <div className="category-tabs__list" role="group" aria-label="Filter by category">
        {['', ...categories].map(category => (
          <button
            key={category || 'all'}
            type="button"
            className={category === value ? 'is-active' : ''}
            aria-pressed={category === value}
            onClick={() => onChange(category)}
          >
            {category || 'All gear'}
          </button>
        ))}
      </div>
      <span className="category-tabs__count" aria-live="polite">{count} {count === 1 ? 'item' : 'items'}</span>
    </div>
  );
}
