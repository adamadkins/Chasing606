async function read(response){if(!response.ok)throw new Error('The store is temporarily unavailable.');return response.json();}
export async function getCommerce(){return read(await fetch('/api/commerce'));}
export async function getProducts(){const data=await read(await fetch('/api/products'));return data.products;}
export async function getProduct(id){return (await getProducts()).find(product=>product.id===id)??null;}
export async function createCheckout(lines){const response=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lines})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Checkout is unavailable.');return data.checkoutUrl;}
export function variantFor(product,label){return product?.variants?.find(v=>v.label===label);}
export function canAdd(product,label){const variant=variantFor(product,label);return Boolean(product?.available&&label&&(product.variants?variant?.available:product.sizes.includes(label)));}
