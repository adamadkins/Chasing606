export class CommerceError extends Error { constructor(message,status=502){super(message);this.status=status;} }
export function configuration(env={}) {
 const domain=(env.SHOPIFY_STORE_DOMAIN||'').trim().toLowerCase();
 const token=env.SHOPIFY_STOREFRONT_ACCESS_TOKEN||'';
 if(domain&&!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain))throw new CommerceError('Store configuration is invalid.',503);
 if(Boolean(domain)!==Boolean(token))throw new CommerceError('Store connection is incomplete.',503);
 const version=env.SHOPIFY_API_VERSION||'2026-10';
 if(!/^20\d{2}-(01|04|07|10)$/.test(version))throw new CommerceError('API version is invalid.',503);
 let accountUrl=null;
 if(domain&&env.SHOPIFY_CUSTOMER_ACCOUNTS_ENABLED==='true'){
  const url=new URL(env.SHOPIFY_CUSTOMER_ACCOUNT_URL||`https://${domain}/account`);
  if(url.protocol!=='https:'||url.username||url.password)throw new CommerceError('Account URL is invalid.',503);
  accountUrl=url.href;
 }
 return {mode:domain?'shopify':'demo',checkoutEnabled:Boolean(domain)&&env.SHOPIFY_CHECKOUT_ENABLED==='true',accountUrl,domain,token,version};
}
export function publicConfiguration(env){const {mode,checkoutEnabled,accountUrl}=configuration(env);return {mode,checkoutEnabled,accountUrl};}
async function graphql(config,query,variables,fetcher=fetch,buyerIp){
 const headers={'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':config.token};
 if(buyerIp)headers['Shopify-Storefront-Buyer-IP']=buyerIp;
 const response=await fetcher(`https://${config.domain}/api/${config.version}/graphql.json`,{method:'POST',headers,body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new CommerceError('The store is temporarily unavailable. Please try again.');
 const body=await response.json();
 if(body.errors?.length||!body.data)throw new CommerceError('The store could not complete this request. Please try again.');
 return body.data;
}
const variantFields='id title availableForSale selectedOptions { name value } price { amount currencyCode } image { url altText }';
export function normalizeProduct(product){
 const variants=product.variants.nodes.map(v=>({id:v.id,label:v.selectedOptions?.map(o=>o.value).join(' / ')||v.title,available:v.availableForSale,price:Number(v.price.amount),currencyCode:v.price.currencyCode,image:v.image?.url||null}));
 return {id:product.id,name:product.title,description:product.description,category:product.productType||'Gear',color:product.vendor||'',image:product.featuredImage?.url||variants.find(v=>v.image)?.image||null,imageAlt:product.featuredImage?.altText||product.title,price:Number(product.priceRange.minVariantPrice.amount),currencyCode:product.priceRange.minVariantPrice.currencyCode,available:variants.some(v=>v.available),sizes:variants.map(v=>v.label),variants};
}
export async function products(env,fetcher=fetch){
 const config=configuration(env);if(config.mode==='demo')return {mode:'demo',products:[]};
 const all=[];let after=null;
 for(let page=0;page<20;page++){
  const data=await graphql(config,`query Products($after:String){products(first:50,after:$after){nodes{id title description productType vendor featuredImage{url altText} priceRange{minVariantPrice{amount currencyCode}} variants(first:100){nodes{${variantFields}} pageInfo{hasNextPage endCursor}}} pageInfo{hasNextPage endCursor}}}`,{after},fetcher);
  for(const p of data.products.nodes){
   let info=p.variants.pageInfo;
   for(let n=0;info.hasNextPage;n++){
    if(n>=20)throw new CommerceError('This product has too many options to load.');
    const extra=await graphql(config,`query Variants($id:ID!,$after:String){product(id:$id){variants(first:100,after:$after){nodes{${variantFields}} pageInfo{hasNextPage endCursor}}}}`,{id:p.id,after:info.endCursor},fetcher);
    p.variants.nodes.push(...extra.product.variants.nodes);info=extra.product.variants.pageInfo;
   }
   all.push(normalizeProduct(p));
  }
  if(!data.products.pageInfo.hasNextPage)return {mode:'shopify',products:all};
  after=data.products.pageInfo.endCursor;
 }
 throw new CommerceError('The collection is too large to load.');
}
export async function checkout(env,input,fetcher=fetch,buyerIp){
 const config=configuration(env);
 if(!config.checkoutEnabled)throw new CommerceError('Checkout is not open yet.',409);
 if(!Array.isArray(input?.lines)||!input.lines.length||input.lines.length>50)throw new CommerceError('Choose between 1 and 50 items.',400);
 const merged=new Map();
 for(const line of input.lines){
  if(!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(line.merchandiseId)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>10)throw new CommerceError('An item or quantity is invalid.',400);
  const quantity=(merged.get(line.merchandiseId)||0)+line.quantity;if(quantity>10)throw new CommerceError('A maximum of 10 of each option can be ordered.',400);merged.set(line.merchandiseId,quantity);
 }
 const lines=[...merged].map(([merchandiseId,quantity])=>({merchandiseId,quantity}));
 // Prices and availability are always resolved by Shopify, never accepted from the browser.
 const data=await graphql(config,'mutation Checkout($input:CartInput!){cartCreate(input:$input){cart{id checkoutUrl lines(first:100){nodes{quantity merchandise{... on ProductVariant{id}}}}} userErrors{message} warnings{message}}}',{input:{lines}},fetcher,buyerIp);
 const result=data.cartCreate;
 if(result.userErrors?.length||result.warnings?.length||!result.cart)throw new CommerceError(result.userErrors?.[0]?.message||result.warnings?.[0]?.message||'Please review the items in your cart.',409);
 const actual=new Map(result.cart.lines.nodes.map(l=>[l.merchandise.id,l.quantity]));
 if(actual.size!==merged.size||[...merged].some(([id,q])=>actual.get(id)!==q))throw new CommerceError('Availability changed. Please refresh and review your cart.',409);
 const url=new URL(result.cart.checkoutUrl);
 if(url.protocol!=='https:'||url.username||url.password)throw new CommerceError('Checkout is temporarily unavailable.');
 return {checkoutUrl:url.href};
}
// Retire local checkout even if old Shopify environment values remain configured.
export async function handleCommerce(request){
 const path=new URL(request.url).pathname;
 const shopUrl='https://chasing-606-shop.fourthwall.com';
 const headers={'Cache-Control':'no-store'};
 if(path==='/api/commerce'&&request.method==='GET')return Response.json({mode:'fourthwall',checkoutEnabled:false,accountUrl:null,shopUrl},{headers});
 if(path==='/api/products'&&request.method==='GET')return Response.json({mode:'fourthwall',products:[],shopUrl},{headers});
 return Response.json({error:'Please use our Fourthwall shop for checkout.',shopUrl},{status:410,headers});
}
