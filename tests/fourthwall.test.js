import test from 'node:test';
import assert from 'node:assert/strict';
import {products,checkout,handleCommerce} from '../server/fourthwall.js';
const id='000009c2-0c75-0024-0000-09c20c750024';
const product={type:'PRODUCT',access:{type:'PUBLIC'},state:{type:'AVAILABLE'},id:'p',name:'Hoodie',description:'<p>Warm</p>',images:[{url:'https://example.com/hoodie.png'}],variants:[{id,name:'Black / L',attributes:{description:'Black / L'},unitPrice:{value:42,currency:'USD'},stock:{type:'UNLIMITED'}}]};
const env={FOURTHWALL_STOREFRONT_TOKEN:'test-secret'};
test('catalog follows pagination, excludes private products, maps stock and prices',async()=>{
 let calls=0;const data=await products(env,async url=>{assert.equal(url.searchParams.get('storefront_token'),'test-secret');calls++;return Response.json({results:calls===1?[product,{...product,access:{type:'HIDDEN'}}]:[{...product,id:'sold',state:{type:'SOLD_OUT'}}],paging:{hasNextPage:calls===1}});});assert.equal(calls,2);assert.equal(data.products.length,2);assert.equal(data.products[0].variants[0].price,42);assert.equal(data.products[1].available,false);assert.equal(data.products[0].description,'Warm');
});
test('checkout uses provider prices and validates returned cart quantities',async()=>{
 const fetcher=async(url,options)=>url.pathname.endsWith('/carts')?(assert.deepEqual(JSON.parse(options.body),{currency:'USD',items:[{variantId:id,quantity:2}]}),Response.json({id:'cart-id',items:[{variant:{id},quantity:2}]})):Response.json({results:[product],paging:{hasNextPage:false}});
 const result=await checkout(env,{lines:[{merchandiseId:id,quantity:2,price:0.01}]},fetcher);assert.equal(new URL(result.checkoutUrl).searchParams.get('cartId'),'cart-id');
 await assert.rejects(checkout(env,{lines:[{merchandiseId:id,quantity:2}]},async url=>url.pathname.endsWith('/carts')?Response.json({id:'cart-id',items:[]}):Response.json({results:[product]})),/Availability changed/);
 await assert.rejects(checkout(env,{lines:[{merchandiseId:id,quantity:0}]},fetcher),/invalid/);
});
test('missing connection fails without sample products, cross-origin checkout rejected',async()=>{
 const r=await handleCommerce(new Request('https://site.test/api/products'),{});assert.equal(r.status,503);
 const c=await handleCommerce(new Request('https://site.test/api/commerce'),env);const text=await c.text();assert(!text.includes('test-secret'));assert(JSON.parse(text).checkoutEnabled);
 const x=await handleCommerce(new Request('https://site.test/api/checkout',{method:'POST',headers:{Origin:'https://other.test'}}),env);assert.equal(x.status,403);
});
