import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
const storageKey='chasing606-cart-v1';
export function useCart() {
 const [items,setItems]=useState(()=>{try {const value=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(value)?value.filter(i=>typeof i.id==='string'&&typeof i.size==='string'&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=10):[];}catch{return [];}});
 useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(items));}catch{/* Cart remains usable for this visit if storage is unavailable. */}},[items]);
 function add(id,size){setItems(previous=>{const match=previous.find(i=>i.id===id&&i.size===size);return match?previous.map(i=>i===match?{...i,quantity:Math.min(i.quantity+1,10)}:i):[...previous,{id,size,quantity:1}];});}
 function quantity(id,size,next){setItems(previous=>next<=0?previous.filter(i=>!(i.id===id&&i.size===size)):previous.map(i=>i.id===id&&i.size===size?{...i,quantity:Math.min(next,10)}:i));}
 return {items,add,quantity};
}
export default function Cart({open,onClose,cart,products}) {
 const dialog=useRef(null);
 useEffect(()=>{if(open){dialog.current.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{dialog.current.close();document.body.style.overflow=old;};}},[open]);
 const lines=cart.items.map(item=>({...item,product:products.find(p=>p.id===item.id)})).filter(item=>item.product&&item.product.sizes.includes(item.size));
 const subtotal=lines.reduce((total,line)=>total+line.product.price*line.quantity,0);
 const money=amount=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(amount);
 return <dialog ref={dialog} className="cart-drawer" aria-labelledby="cart-title" onCancel={onClose} onClick={event=>{if(event.target===dialog.current){const rect=dialog.current.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();}}}>
 <div className="cart-heading"><h2 id="cart-title">Your cart.</h2><button onClick={onClose} aria-label="Close cart"><Icon name="close"/></button></div><p className="cart-preview">Collection preview — sample products. Orders aren’t open yet.</p>
 {lines.length?<><div className="cart-lines">{lines.map(line=><article className="cart-line" key={`${line.id}-${line.size}`}><div className="cart-swatch" style={{background:line.product.tone}}><Icon name="bag"/></div><div className="cart-line-info"><h3>{line.product.name}</h3><p>{line.product.color} / {line.size}</p>{!line.product.available&&<p>Out of stock</p>}<div className="quantity-control"><button aria-label={`Decrease ${line.product.name} ${line.size} quantity`} onClick={()=>cart.quantity(line.id,line.size,line.quantity-1)}>−</button><span aria-live="polite">{line.quantity}</span><button disabled={line.quantity>=10} aria-label={`Increase ${line.product.name} ${line.size} quantity`} onClick={()=>cart.quantity(line.id,line.size,line.quantity+1)}>+</button></div><button className="remove-item" onClick={()=>cart.quantity(line.id,line.size,0)}>Remove<span className="sr-only"> {line.product.name} {line.size}</span></button></div><span className="line-price">{money(line.product.price*line.quantity)}</span></article>)}</div><div className="cart-summary"><p><span>Subtotal</span><strong>{money(subtotal)}</strong></p><p className="cart-disclaimer">Sample pricing. Shipping and tax are not calculated.</p><button className="button unavailable" disabled>CHECKOUT OPENS AT LAUNCH</button><a href="/merch" className="cart-continue">Continue browsing</a></div></>:<div className="empty-cart"><Icon name="bag"/><h3>Your next adventure starts here.</h3><p>Your cart is empty. Explore the collection and find your gear.</p><a className="button story-watch" href="/merch">BROWSE THE MERCH <Icon/></a></div>}
 </dialog>;
}
