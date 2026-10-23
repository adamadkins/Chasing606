// Small color choices under a product card: preview a colorway without opening the product.
export default function ColorDots({ product, selected, onSelect }) {
  return (
    <div className="color-dots" role="group" aria-label={`Preview colors for ${product.name}`}>
      {product.colors.map(color => (
        <button
          key={color.name}
          type="button"
          className="color-dot"
          title={color.name}
          aria-label={color.name}
          aria-pressed={selected === color.name}
          style={{ '--swatch': color.hex ?? '#8a8d80' }}
          onClick={() => onSelect(color.name)}
        />
      ))}
      <span className="color-dots__name" aria-hidden="true">{selected}</span>
    </div>
  );
}
