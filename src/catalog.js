async function read(response) {
  if (!response.ok) throw new Error('The store is temporarily unavailable.');
  return response.json();
}

export async function getCommerce() {
  try {
    const res = await fetch('/api/commerce');
    if (res.ok) return await res.json();
  } catch {}
  return { mode: 'spring', checkoutEnabled: false, shopUrl: 'https://chasing606.creator-spring.com' };
}

export async function getProducts() {
  const res = await fetch('/api/products');
  const data = await read(res);
  if (!Array.isArray(data.products)) throw new Error('The collection could not be loaded.');
  return data.products;
}

export async function getProduct(id) {
  return (await getProducts()).find(product => product.id === id) ?? null;
}

export async function createCheckout(lines) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Checkout is unavailable.');
  return data.checkoutUrl;
}

export function variantFor(product, size, color) {
  if (!product?.variants || !product.variants.length) return null;
  if (color && size) {
    const exact = product.variants.find(v =>
      (v.size === size || v.label?.includes(size)) &&
      (v.color?.toLowerCase() === color.toLowerCase() || v.label?.toLowerCase().includes(color.toLowerCase()))
    );
    if (exact) return exact;
  }
  if (size) {
    const bySize = product.variants.find(v => v.size === size || v.label === size || v.label?.endsWith(`/ ${size}`) || v.label?.endsWith(`, ${size}`));
    if (bySize) return bySize;
  }
  return product.variants[0];
}

export function canAdd(product, size, color) {
  if (!product || !product.available) return false;
  if (!size && product.sizes?.length > 1) return false;
  if (product.variants?.length) {
    const variant = variantFor(product, size, color);
    return Boolean(variant && variant.available !== false);
  }
  return true;
}
