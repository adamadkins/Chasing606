import { useRef, useState } from 'react';
import useCart from '../../../hooks/useCart';
import useCatalog from '../../../hooks/useCatalog';
import useModalDialog from '../../../hooks/useModalDialog';
import { colorImages, defaultSelection, findVariant, isSizeAvailable } from '../../../lib/catalog';
import { formatMoney } from '../../../lib/format';
import Icon from '../../ui/Icon';
import Gallery from './Gallery';
import './ProductModal.css';

export default function ProductModal({ product, initialColor, onClose }) {
  const dialog = useRef(null);
  const closeOnBackdrop = useModalDialog(dialog, onClose);
  const { checkout } = useCatalog();
  const cart = useCart();

  const start = defaultSelection(product);
  const [color, setColor] = useState(product.colors.some(c => c.name === initialColor) ? initialColor : start.color);
  const [size, setSize] = useState(start.size);

  // Switching color keeps the chosen size when that color has it, otherwise picks one that does.
  const chooseColor = next => {
    setColor(next);
    if (!isSizeAvailable(product, next, size)) {
      setSize(product.sizes.find(candidate => isSizeAvailable(product, next, candidate)) ?? size);
    }
  };

  const variant = findVariant(product, color, size);
  const available = Boolean(variant?.available);
  const price = formatMoney(variant?.price ?? product.price, product.currency);
  const hasSizes = product.sizes.length > 1;
  const bagFull = variant ? !cart.canAdd(product.id, variant.id) : false;

  const addToBag = () => {
    if (!variant || !cart.add(product.id, variant.id)) return;
    dialog.current.close();
    cart.openBag();
  };

  return (
    <dialog ref={dialog} className="product-modal" aria-labelledby="product-modal-title" onClick={closeOnBackdrop}>
      <div className="product-modal__panel">
        <button type="button" className="product-modal__close" aria-label="Close product window" onClick={() => dialog.current.close()}>
          <Icon name="close" />
        </button>

        <div className="product-modal__heading">
          <p className="product-modal__eyebrow">Chasing 606 · The collection</p>
          <h2 id="product-modal-title">{product.name}</h2>
          <p className="product-modal__price">
            <span>{price}</span>
            <small>{product.currency}</small>
          </p>
        </div>

        <Gallery key={color} images={colorImages(product, color)} name={product.name} color={color} available={available} />

        <div className="product-modal__details">
          {product.description && <p className="product-modal__description">{product.description}</p>}
          {product.shopUrl && <p className="product-modal__note">Preview current options here, then choose the final color and size securely on Spring.</p>}

          {product.colors.length > 1 && (
            <fieldset className="option">
              <legend>Color: <strong>{color}</strong></legend>
              <div className="option__choices">
                {product.colors.map(option => (
                  <label key={option.name} className="color-pill">
                    <input type="radio" name="color" value={option.name} checked={option.name === color} onChange={() => chooseColor(option.name)} />
                    <span className="color-pill__swatch" style={{ '--swatch': option.hex ?? '#8a8d80' }} />
                    {option.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {hasSizes && (
            <fieldset className="option">
              <legend>Size: <strong>{size}</strong></legend>
              <div className="option__choices">
                {product.sizes.map(option => (
                  <label key={option} className="size-chip">
                    <input
                      type="radio"
                      name="size"
                      value={option}
                      checked={option === size}
                      disabled={!isSizeAvailable(product, color, option)}
                      onChange={() => setSize(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {!available ? (
            <button type="button" className="btn btn--dark btn--block product-modal__cta" disabled>SOLD OUT</button>
          ) : product.shopUrl ? (
            <a className="btn btn--dark btn--block product-modal__cta" href={product.shopUrl}>
              CONTINUE TO SPRING <Icon />
            </a>
          ) : checkout.mode ? (
            <>
              <button type="button" className="btn btn--dark btn--block product-modal__cta" disabled={bagFull} onClick={addToBag}>
                ADD TO BAG · {price} <Icon name="bag" />
              </button>
              {bagFull && <p className="product-modal__fine" role="status">Your bag is full. Check out first, then come back for more.</p>}
            </>
          ) : (
            <button type="button" className="btn btn--dark btn--block product-modal__cta" disabled>COMING SOON</button>
          )}
        </div>
      </div>
    </dialog>
  );
}
