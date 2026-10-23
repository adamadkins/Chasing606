// Pure helpers for the product data returned by /api/products.
//
// Product: { id, name, description, type, category, currency, price, available,
//            shopUrl, colors: [{ name, hex, images }], sizes: [string],
//            variants: [{ color, size, price, available }] }

export async function fetchCatalog(signal) {
  const response = await fetch('/api/products', { signal });
  if (!response.ok) throw new Error('The collection could not be loaded.');
  const data = await response.json();
  if (!Array.isArray(data.products)) throw new Error('The collection could not be loaded.');
  return data.products;
}

/**
 * Spring's mockup service serves any square size from the same URL pattern
 * (`/<id>/1200/1200.jpg`). Ask for no more pixels than will be shown.
 */
export const imageAtSize = (url, size) => url.replace(/\/\d+\/\d+\.jpg$/, `/${size}/${size}.jpg`);

export const findVariant = (product, color, size) =>
  product.variants.find(variant => variant.color === color && variant.size === size) ?? null;

export const colorImages = (product, colorName) =>
  product.colors.find(color => color.name === colorName)?.images ?? [];

/** The photo to show for a color, falling back to any photo the product has. */
export function coverImage(product, colorName) {
  return colorImages(product, colorName)[0] ?? product.colors.find(color => color.images.length)?.images[0] ?? null;
}

export function isSizeAvailable(product, color, size) {
  return Boolean(findVariant(product, color, size)?.available);
}

/** The color and size a product page should start on: first color, first orderable size. */
export function defaultSelection(product) {
  const color = (product.colors.find(c => product.variants.some(v => v.color === c.name && v.available)) ?? product.colors[0])?.name ?? '';
  const size = product.sizes.find(candidate => isSizeAvailable(product, color, candidate)) ?? product.sizes[0] ?? '';
  return { color, size };
}

export const allCategories = products => [...new Set(products.map(product => product.category))].sort();
export const allColors = products => [...new Set(products.flatMap(product => product.colors.map(color => color.name)))].sort();
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
const sizeRank = size => (SIZE_ORDER.includes(size) ? SIZE_ORDER.indexOf(size) : SIZE_ORDER.length);

/** Every size on offer, smallest first; unusual sizes keep the order they were first seen in. */
export const allSizes = products => [...new Set(products.flatMap(product => product.sizes))].sort((a, b) => sizeRank(a) - sizeRank(b));

export const PRICE_STEPS = [25, 50, 75, 100, 150, 200];

export const DEFAULT_QUERY = Object.freeze({
  search: '', category: '', color: '', size: '', stockOnly: false, maxPrice: '', sort: 'featured'
});

export function activeFilterCount(query) {
  return [query.category, query.color, query.size, query.stockOnly, query.maxPrice].filter(Boolean).length;
}

/** Filters and sorts products. `query` uses the keys of DEFAULT_QUERY. */
export function queryProducts(products, query) {
  const search = query.search.trim().toLowerCase();
  const maxPrice = Number(query.maxPrice) || Infinity;

  const matches = products.filter(product => {
    if (query.category && product.category !== query.category) return false;
    if (query.color && !product.colors.some(color => color.name === query.color)) return false;
    if (query.size && !product.sizes.includes(query.size)) return false;
    if (query.stockOnly && !product.variants.some(variant =>
      variant.available && (!query.color || variant.color === query.color) && (!query.size || variant.size === query.size))) return false;
    if (product.price > maxPrice) return false;
    if (search) {
      const haystack = [product.name, product.type, product.category, ...product.colors.map(color => color.name)].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  if (query.sort === 'low') return matches.toSorted((a, b) => a.price - b.price);
  if (query.sort === 'high') return matches.toSorted((a, b) => b.price - a.price);
  // "Featured": storefront order, with sold-out items after everything orderable.
  return matches.toSorted((a, b) => Number(b.available) - Number(a.available));
}
