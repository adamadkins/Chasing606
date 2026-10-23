import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addToBag, bagIsFull, lineKey, parseStoredBag, priceBag, removeFromBag, setQuantity } from '../lib/cart';
import useCatalog from './useCatalog';

const STORAGE_KEY = 'chasing606-bag-v1';
const CartContext = createContext(null);

function readStorage() {
  try {
    return parseStoredBag(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

/** The shopping bag, remembered in this browser, plus whether the bag drawer is open. */
export function CartProvider({ children }) {
  const { products } = useCatalog();
  const [items, setItems] = useState(readStorage);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // The bag still works for this visit if storage is unavailable.
    }
  }, [items]);

  const priced = useMemo(() => priceBag(items, products), [items, products]);

  const add = useCallback((productId, variantId) => {
    if (bagIsFull(items, lineKey(productId, variantId))) return false;
    setItems(current => addToBag(current, productId, variantId));
    return true;
  }, [items]);

  const value = useMemo(() => ({
    ...priced,
    items,
    open,
    openBag: () => setOpen(true),
    closeBag: () => setOpen(false),
    add,
    canAdd: (productId, variantId) => !bagIsFull(items, lineKey(productId, variantId)),
    setQuantity: (key, quantity) => setItems(current => setQuantity(current, key, quantity)),
    remove: key => setItems(current => removeFromBag(current, key)),
    clear: () => setItems([])
  }), [priced, items, open, add]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export default function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside <CartProvider>');
  return value;
}
