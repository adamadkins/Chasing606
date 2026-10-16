import test from 'node:test';
import assert from 'node:assert/strict';
import { publicConfiguration, products, checkout, handleCommerce } from '../server/commerce.js';
const env={SHOPIFY_STORE_DOMAIN:'example.myshopify.com',SHOPIFY_STOREFRONT_ACCESS_TOKEN:'test-only-token',SHOPIFY_CHECKOUT_ENABLED:'true'};
const variant={id:'gid://shopify/ProductVariant/1',title:'M / Moss',availableForSale:true,selectedOptions:[{name:'Size',value:'M'},{name:'Color',value:'Moss'}],price:{amount:'32.50',currencyCode:'CAD'},image:null};
const product={id:'gid://shopify/Product/1',title:'Field Tee',description:'A real item',productType:'Shirts',vendor:'606',featuredImage:{url:'https://cdn.shopify.com/test.jpg',altText:'Moss tee'},priceRange:{minVariantPrice:{amount:'32.50',currencyCode:'CAD'}},variants:{nodes:[variant],pageInfo:{hasNextPage:false}}};
test('preview is explicit, partial configuration fails, and public settings never expose tokens',()=>{
 assert.equal(publicConfiguration({}).mode,'demo');assert.throws(()=>publicConfiguration({SHOPIFY_STORE_DOMAIN:env.SHOPIFY_STORE_DOMAIN}));assert.throws(()=>publicConfiguration({...env,SHOPIFY_STORE_DOMAIN:'evil.example/x'}));assert(!JSON.stringify(publicConfiguration(env)).includes('test-only-token'));assert.equal(publicConfiguration({...env,SHOPIFY_CUSTOMER_ACCOUNTS_ENABLED:'true'}).accountUrl,'https://example.myshopify.com/account');
});
test('catalog maps real variants, stock and currencies and follows product pagination',async()=>{
 let count=0;const result=await products(env,async(url,options)=>{assert.equal(url,'https://example.myshopify.com/api/2026-10/graphql.json');assert.equal(options.headers['X-Shopify-Storefront-Access-Token'],'test-only-token');count++;return Response.json({data:{products:{nodes:count===1?[structuredClone(product)]:[],pageInfo:{hasNextPage:count===1,endCursor:'cursor'}}}});});
 assert.equal(count,2);assert.equal(result.mode,'shopify');assert.equal(result.products[0].variants[0].label,'M / Moss');assert.equal(result.products[0].price,32.5);assert.equal(result.products[0].currencyCode,'CAD');assert.equal(result.products[0].image,product.featuredImage.url);
});
test('catalog follows variant pagination instead of losing sizes',async()=>{
 let count=0;const p=structuredClone(product);p.variants.pageInfo={hasNextPage:true,endCursor:'v1'};
 const result=await products(env,async()=>Response.json({data:++count===1?{products:{nodes:[p],pageInfo:{hasNextPage:false}}}:{product:{variants:{nodes:[{...variant,id:'gid://shopify/ProductVariant/2',selectedOptions:[{name:'Size',value:'L'}],availableForSale:false}],pageInfo:{hasNextPage:false}}}}}));
 assert.equal(result.products[0].variants.length,2);assert.equal(result.products[0].variants[1].available,false);
});
test('checkout stays off by default and rejects bad quantities/IDs before calling Shopify',async()=>{
 const never=()=>{throw Error('Unexpected network call');};await assert.rejects(checkout({...env,SHOPIFY_CHECKOUT_ENABLED:'false'},{lines:[]},never),/not open/);for(const line of [{merchandiseId:'fake',quantity:1},{merchandiseId:variant.id,quantity:11}])await assert.rejects(checkout(env,{lines:[line]},never),/invalid/);
});
test('checkout sends only variant IDs and quantities; verifies Shopify returned every line',async()=>{
 const url=await checkout(env,{lines:[{merchandiseId:variant.id,quantity:2,price:0.01}]},async(_url,options)=>{
 const input=JSON.parse(options.body).variables.input;assert.deepEqual(input.lines,[{merchandiseId:variant.id,quantity:2}]);return Response.json({data:{cartCreate:{cart:{checkoutUrl:'https://example.myshopify.com/checkouts/test',lines:{nodes:[{quantity:2,merchandise:{id:variant.id}}]}},userErrors:[],warnings:[]}}});});assert(url.checkoutUrl.startsWith('https://'));
 await assert.rejects(checkout(env,{lines:[{merchandiseId:variant.id,quantity:2}]},async()=>Response.json({data:{cartCreate:{cart:{checkoutUrl:'https://example.myshopify.com',lines:{nodes:[]}},userErrors:[],warnings:[]}}})),/Availability changed/);
});
test('stock errors prevent checkout and upstream errors do not reveal secrets',async()=>{
 await assert.rejects(checkout(env,{lines:[{merchandiseId:variant.id,quantity:1}]},async()=>Response.json({data:{cartCreate:{cart:null,userErrors:[{message:'Sold out'}],warnings:[]}}})),/Sold out/);
 const response=await handleCommerce(new Request('https://site.test/api/commerce'),{...env,SHOPIFY_STORE_DOMAIN:'invalid'});assert.equal(response.status,503);assert(!(await response.text()).includes(env.SHOPIFY_STOREFRONT_ACCESS_TOKEN));
 const cross=await handleCommerce(new Request('https://site.test/api/checkout',{method:'POST',headers:{Origin:'https://other.test'},body:'{}'}),env);assert.equal(cross.status,403);
});
