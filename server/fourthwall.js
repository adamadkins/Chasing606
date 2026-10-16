const SHOP = 'https://chasing-606-shop.fourthwall.com';
class StoreError extends Error { constructor(message,status=502){super(message);this.status=status;} }
async function api(env,path,options={},fetcher=fetch){
 const token=env.FOURTHWALL_STOREFRONT_TOKEN?.trim();
 if(!token)throw new StoreError('The shop connection is being set up. Please try again shortly.',503);
 const url=new URL(`https://storefront-api.fourthwall.com/v1/${path}`);url.searchParams.set('storefront_token',token);
 const response=await fetcher(url,{...options,headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new StoreError(response.status===400||response.status===409?'Availability changed. Refresh the collection and review your bag.':'The shop is temporarily unavailable. Please try again.',response.status===400||response.status===409?409:502);
 return response.json();
}
export function normalize(product){
 const variants = (product.variants || []).map(v => {
  const label = v.attributes?.description || v.name || v.id;
  let color = '';
  let size = '';
  if (label.includes(',')) {
   const parts = label.split(',').map(s => s.trim());
   color = parts[0];
   size = parts[1];
  } else if (label.includes('/')) {
   const parts = label.split('/').map(s => s.trim());
   color = parts[0];
   size = parts[1];
  } else {
   size = label;
  }
  return {
   id: v.id,
   label,
   color,
   size,
   price: Number(v.unitPrice.value),
   currencyCode: v.unitPrice.currency,
   available: product.state?.type==='AVAILABLE' && (v.stock?.type==='UNLIMITED' || v.stock?.inStock>0),
   image: v.images?.[0]?.url || null,
   images: (v.images || []).map(i => i.url).filter(Boolean)
  };
 });
 const counts = new Map();
 for (const v of variants) counts.set(v.label, (counts.get(v.label) || 0) + 1);
 for (const v of variants) if (counts.get(v.label) > 1) v.label += ` (${v.id})`;
 const cheapest = variants.reduce((a, v) => !a || v.price < a.price ? v : a, null);
 const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
 const sizes = [...new Set(variants.map(v => v.size || v.label).filter(Boolean))];
 const imagesByColor = {};
 for (const v of variants) {
  if (v.color && v.image && !imagesByColor[v.color]) {
   imagesByColor[v.color] = v.image;
  }
 }
 return {
  id: product.id,
  name: product.name,
  slug: product.slug || product.id,
  description: (product.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  category: product.category?.name || product.collection?.name || (typeof product.category === 'string' ? product.category : '') || 'Gear',
  color: colors.join(', '),
  colors,
  sizes: sizes.length ? sizes : variants.map(v => v.label),
  image: product.images?.[0]?.url || variants.find(v => v.image)?.image || null,
  imagesByColor: Object.keys(imagesByColor).length ? imagesByColor : null,
  imageAlt: product.name,
  images: [...new Set([...(product.images || []).map(i => i.url), ...variants.flatMap(v => v.images || [])].filter(Boolean))],
  price: cheapest?.price ?? 0,
  currencyCode: cheapest?.currencyCode || 'USD',
  available: variants.some(v => v.available),
  variants
 };
}
async function pagedResults(env, path, fetcher) {
 const results=[];
 for(let page=0;page<100;page++){
  const separator=path.includes('?')?'&':'?';
  const data=await api(env,`${path}${separator}page=${page}&size=50`,{},fetcher);
  if(!Array.isArray(data.results))throw new StoreError('The Fourthwall collection could not be loaded.');
  results.push(...data.results);
  if(!data.paging?.hasNextPage)return results;
 }
 throw new StoreError('The Fourthwall collection could not be loaded completely.');
}
export async function products(env,fetcher=fetch){
 const [allProducts, allCollections]=await Promise.all([
  pagedResults(env,'collections/all/products?currency=USD',fetcher),
  pagedResults(env,'collections',fetcher)
 ]);
 const publicProducts=allProducts.filter(p=>p.access?.type==='PUBLIC'&&p.type==='PRODUCT');
 const normalized=publicProducts.map(normalize);
 const byId=new Map(normalized.map(p=>[p.id,p]));
 const collections=allCollections.filter(c=>c.slug&&c.slug!=='all'&&c.name);
 // Fourthwall's product data doesn't include collection memberships. Look up
 // each collection's products so a product may belong to multiple collections.
 for(const collection of collections){
  const members=await pagedResults(env,`collections/${encodeURIComponent(collection.slug)}/products?currency=USD`,fetcher);
  for(const member of members){
   const product=byId.get(member.id);
   if(product){
    product.collections ||= [];
    if(!product.collections.includes(collection.name))product.collections.push(collection.name);
   }
  }
 }
 for(const product of normalized){
  product.collections ||= [];
  product.category=product.collections[0] || '';
 }
 return {mode:'fourthwall',collections:collections.map(c=>({name:c.name,slug:c.slug})),products:normalized};
}
export async function checkout(env,input,fetcher=fetch){
 if(!Array.isArray(input?.lines)||!input.lines.length||input.lines.length>50)throw new StoreError('Choose between 1 and 50 items.',400);
 const merged=new Map();
 for(const line of input.lines){
  if(!line||typeof line.merchandiseId!=='string'||!/^[-a-f0-9]{36}$/i.test(line.merchandiseId)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>10)throw new StoreError('An item or quantity is invalid.',400);
  const q=(merged.get(line.merchandiseId)||0)+line.quantity;if(q>10)throw new StoreError('A maximum of 10 of each option can be ordered.',400);merged.set(line.merchandiseId,q);
 }
 const currentProducts=await pagedResults(env,'collections/all/products?currency=USD',fetcher);const available=new Map(currentProducts.filter(p=>p.access?.type==='PUBLIC'&&p.type==='PRODUCT').map(normalize).flatMap(p=>p.variants).map(v=>[v.id,v]));
 if([...merged.keys()].some(id=>!available.get(id)?.available))throw new StoreError('An item is no longer available. Refresh the collection and review your bag.',409);
 const cart=await api(env,'carts',{method:'POST',body:JSON.stringify({currency:'USD',items:[...merged].map(([variantId,quantity])=>({variantId,quantity}))})},fetcher);
 const actual=new Map((cart.items||[]).map(i=>[i.variant?.id,i.quantity]));
 if(typeof cart.id!=='string'||actual.size!==merged.size||[...merged].some(([id,q])=>actual.get(id)!==q))throw new StoreError('Availability changed. Refresh the collection and review your bag.',409);
 return {checkoutUrl:`${SHOP}/checkout/?${new URLSearchParams({cartCurrency:'USD',cartId:cart.id})}`};
}
export async function handleCommerce(request,env){
 const headers={'Cache-Control':'no-store'};
 try{
  const path=new URL(request.url).pathname;
  if(path==='/api/commerce'&&request.method==='GET')return Response.json({mode:'fourthwall',checkoutEnabled:Boolean(env.FOURTHWALL_STOREFRONT_TOKEN?.trim()),accountUrl:null},{headers});
  if(path==='/api/products'&&request.method==='GET')return Response.json(await products(env),{headers});
  if(path==='/api/checkout'&&request.method==='POST'){
   const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)throw new StoreError('Invalid request origin.',403);
   if(Number(request.headers.get('Content-Length'))>20000)throw new StoreError('Cart is too large.',413);
   const body=await request.text();if(body.length>20000)throw new StoreError('Cart is too large.',413);
   let input;try{input=JSON.parse(body);}catch{throw new StoreError('Invalid cart.',400);}
   return Response.json(await checkout(env,input),{headers});
  }
  return Response.json({error:'Method not allowed.'},{status:405,headers});
 }catch(error){return Response.json({error:error instanceof StoreError?error.message:'The shop is temporarily unavailable. Please try again.'},{status:error instanceof StoreError?error.status:502,headers});}
}
