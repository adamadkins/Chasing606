// Demo catalog adapter. Replace these reads with Shopify Storefront API requests.
// Shopify owns products, variants, inventory, and checkout once connected.
const products = [
  { id: 'field-tee', name: 'The Field Tee', category: 'Tees', price: 28, color: 'Moss', tone: '#6e7755', type: 'tee', sizes: ['S', 'M', 'L', 'XL', '2XL'], available: true, description: 'An everyday staple for early starts, late nights, and everything in between.' },
  { id: 'camp-hoodie', name: 'The Camp Hoodie', category: 'Layers', price: 54, color: 'Oat', tone: '#bcb09a', type: 'hoodie', sizes: ['S', 'M', 'L', 'XL', '2XL'], available: true, description: 'A comfortable layer for cool mornings in the woods and evenings around the fire.' },
  { id: 'trucker', name: 'The 606 Trucker', category: 'Headwear', price: 26, color: 'Timber', tone: '#665545', type: 'hat', sizes: ['One size'], available: false, description: 'A classic cap made to go wherever the next trip takes you.' },
  { id: 'timber-tee', name: 'The Timber Tee', category: 'Tees', price: 28, color: 'Stone', tone: '#a4a399', type: 'tee', sizes: ['S', 'M', 'L', 'XL', '2XL'], available: true, description: 'Easygoing comfort inspired by days with nowhere to be but outside.' },
];
export async function getProducts() { return products; }
export async function getProduct(id) { return products.find(product => product.id === id) ?? null; }
export const catalogMode = 'demo';
