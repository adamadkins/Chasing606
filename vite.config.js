import { defineConfig, loadEnv } from 'vite';
import { handleCommerce } from './server/fourthwall.js';
import { onRequestGet } from './functions/api/latest-video.js';
export default defineConfig(({mode})=>({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  plugins: [{
    name: 'local-video-feed',
    configureServer(server) {
      const env={...loadEnv(mode,process.cwd(),''),...process.env};
      server.middlewares.use(async (req,res,next)=>{
        if(!['/api/commerce','/api/products','/api/checkout'].includes(req.url?.split('?')[0]))return next();
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const body=Buffer.concat(chunks);
        const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}: {})});
        const response=await handleCommerce(request,env);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(await response.text());
      });
      server.middlewares.use('/api/latest-video', async (_req, res) => {
        const response = await onRequestGet({ request: new Request('http://localhost/api/latest-video'), env: process.env });
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  }],
}));
