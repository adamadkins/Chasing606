// A pretend shop for development: invented products, a fake payment step, and a
// fake supplier. It lets the whole bag → checkout → order flow run with no
// accounts or keys. Enabled only with SHOP_MODE=demo; never used in production.

const svg = body => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280"><rect width="320" height="280" fill="#f3f2ec"/>${body}</svg>`)}`;
const label = (y, color) => `<text x="160" y="${y}" fill="${color}" text-anchor="middle" font-family="Arial" font-weight="800" font-size="30">606</text>`;

const garment = {
  tee: (fill, ink) => svg(`<path fill="${fill}" d="M111 58 68 77 31 139l43 25 20-31-4 115h140l-4-115 20 31 43-25-37-62-43-19-49 13Z"/>${label(150, ink)}`),
  hoodie: (fill, ink) => svg(`<path fill="${fill}" d="M111 58 68 77 31 139l43 25 20-31-4 115h140l-4-115 20 31 43-25-37-62-43-19-49 13Z"/><path fill="${fill}" stroke="#0002" d="M112 65c-8-67 104-67 96 0l-48 23Z"/>${label(160, ink)}`),
  hat: (fill, ink) => svg(`<path fill="${fill}" d="M83 168c0-71 28-104 77-104s77 33 77 104Z"/><path fill="#0003" d="M93 162c48-13 98-9 145 4 42 12 31 32-10 36-46 5-91-3-135-21Z"/>${label(135, ink)}`),
  sticker: (fill, ink) => svg(`<circle cx="160" cy="140" r="82" fill="${fill}" stroke="#0003" stroke-width="4"/>${label(150, ink)}`)
};

const sizes = (list, extra = {}) => list.map(size => ({ size, extra: extra[size] ?? 0 }));

function product({ id, name, type, category, description, kind, colors, sizeList, base, soldOut = false, outOfSize = [] }) {
  let nextVariant = Number(id.slice(-3)) * 100;
  const variants = [];
  for (const color of colors) {
    for (const { size, extra } of sizeList) {
      variants.push({ id: ++nextVariant, color: color.name, size, price: base + extra, available: !soldOut && !outOfSize.includes(`${color.name}/${size}`) });
    }
  }
  const purchasable = variants.filter(variant => variant.available);
  return {
    id, name, type, category, description, currency: 'USD',
    price: Math.min(...(purchasable.length ? purchasable : variants).map(variant => variant.price)),
    available: purchasable.length > 0,
    colors: colors.map(color => ({ name: color.name, hex: color.hex, images: [garment[kind](color.hex, color.ink)] })),
    sizes: [...new Set(sizeList.map(entry => entry.size))],
    variants
  };
}

const APPAREL = sizes(['S', 'M', 'L', 'XL', '2XL'], { '2XL': 2 });

export const DEMO_PRODUCTS = [
  product({ id: 'demo000001', name: 'CHASING 606 CLASSIC', type: 'Heavyweight tee', category: 'T-Shirts', kind: 'tee', base: 24.99, sizeList: APPAREL, outOfSize: ['Black/XL'],
    description: 'Demo product. A soft heavyweight tee with the classic Chasing 606 logo.',
    colors: [{ name: 'Black', hex: '#1a1a1a', ink: '#e8e4d4' }, { name: 'Forest Green', hex: '#2f4a33', ink: '#e8e4d4' }, { name: 'Safety Orange', hex: '#e8620f', ink: '#1a1a1a' }] }),
  product({ id: 'demo000002', name: "CHASING 606 HUNTER'S ORANGE", type: 'Pullover hoodie', category: 'Hoodies & Sweatshirts', kind: 'hoodie', base: 44.99, sizeList: APPAREL,
    description: 'Demo product. A warm pullover in blaze orange.',
    colors: [{ name: 'Safety Orange', hex: '#e8620f', ink: '#1a1a1a' }, { name: 'Black', hex: '#1a1a1a', ink: '#e8e4d4' }] }),
  product({ id: 'demo000003', name: 'CHASING 606 TRUCKER HAT', type: 'Embroidered trucker hat', category: 'Hats', kind: 'hat', base: 27, sizeList: sizes(['One size']),
    description: 'Demo product. Mesh-back trucker with the logo embroidered on the front.',
    colors: [{ name: 'Black', hex: '#1a1a1a', ink: '#e8e4d4' }, { name: 'Khaki', hex: '#b9a77a', ink: '#2a2a1a' }] }),
  product({ id: 'demo000004', name: 'CHASING 606 STICKER', type: 'Die cut sticker', category: 'Stickers', kind: 'sticker', base: 4.99, sizeList: sizes(['One size']),
    description: 'Demo product. Weatherproof vinyl sticker.',
    colors: [{ name: 'Standard', hex: '#ffffff', ink: '#c62f1b' }] }),
  product({ id: 'demo000005', name: 'CHASING 606 DUCK CAMO', type: 'All-over print tee', category: 'T-Shirts', kind: 'tee', base: 32.99, sizeList: APPAREL, soldOut: true,
    description: 'Demo product, sold out.',
    colors: [{ name: 'Standard', hex: '#6d5a3a', ink: '#e8e4d4' }] })
];

/** Everything lives in memory, so it resets when the dev server restarts. */
export function demoServices() {
  const sessions = new Map();
  const supplierOrders = [];
  let counter = 0;

  return {
    mode: 'demo',
    automaticTax: false,
    catalog: { load: async () => ({ products: DEMO_PRODUCTS }) },
    payments: {
      async createSession(input) {
        const id = `cs_test_demo${Date.now().toString(36)}${(++counter).toString(36).padStart(4, '0')}`;
        const subtotal = input.lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
        sessions.set(id, { id, status: 'open', paid: false, email: '', amountTotalCents: subtotal + input.shipping.cents, cart: input.cart, recipient: null });
        return { id, clientSecret: `${id}_secret_demo` };
      },
      async retrieveSession(id) {
        const session = sessions.get(id);
        if (!session) throw Object.assign(new Error('Unknown demo session.'), { status: 404 });
        return structuredClone({ ...session, recipient: session.recipient ?? { name: '', email: '', phone: '', address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: '' } } });
      },
      /** Stands in for the customer finishing Stripe's payment form. */
      async completeDemoPayment(id, recipient) {
        const session = sessions.get(id);
        if (!session) throw Object.assign(new Error('Unknown demo session.'), { status: 404 });
        Object.assign(session, { status: 'complete', paid: true, email: recipient.email, recipient });
      }
    },
    fulfiller: {
      orders: supplierOrders,
      async createOrder(order) {
        const id = `demo-order-${supplierOrders.length + 1}`;
        supplierOrders.push({ id, external: order.id, lines: order.lines, recipient: order.recipient, submitted: false });
        return { id };
      },
      async submitOrder(id) {
        supplierOrders.find(order => order.id === id).submitted = true;
      }
    }
  };
}
