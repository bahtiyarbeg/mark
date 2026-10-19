import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {localRuntime} from './lib/local-runtime.js';
import {renderVideo} from './lib/local-video.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3000);
const host=`127.0.0.1:${port}`;
let rendering=false;
const apis=['orchestrator','assistant','site-audit','site-health','discover','generate','places'];
async function readBody(req,limit){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw Error('Запрос слишком большой');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
http.createServer(async(req,res)=>{
  res.status=n=>{res.statusCode=n;return res;};res.json=data=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
  // Bind only loopback and reject DNS rebinding / cross-origin local execution.
  if(req.headers.host!==host)return res.status(403).json({error:'Use http://'+host});
  if(req.headers.origin&&req.headers.origin!==`http://${host}`)return res.status(403).json({error:'Origin rejected'});
  const url=new URL(req.url,`http://${host}`);
  try{
    if(url.pathname==='/local/video'&&req.method==='POST'){
      if(rendering)return res.status(409).json({error:'Дождитесь текущей сборки'});
      rendering=true;try{const body=await readBody(req,55000000);const filename=await renderVideo(body.images,path.join(root,'output'));return res.json({url:'/output/'+filename});}finally{rendering=false;}
    }
    if(url.pathname.startsWith('/api/')){
      const name=url.pathname.slice(5);if(!apis.includes(name))return res.status(404).json({error:'Not found'});
      req.body=req.method==='POST'?await readBody(req,100000):{};req.runtime=await localRuntime();
      const handler=(await import(`./api/${name}.js`)).default;return await handler(req,res);
    }
    const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
    if(!['index.html','workspace.js','workspace.css','places.js'].includes(file)&&!/^output\/[0-9a-f-]+\.mp4$/.test(file))return res.status(404).json({error:'Not found'});
    const body=await readFile(path.join(root,file));const ext=path.extname(file);
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.mp4':'video/mp4'})[ext]);
    res.end(body);
  }catch(e){res.status(400).json({error:e.message});}
}).listen(port,'127.0.0.1',()=>console.log(`GETTRAVEL local: http://${host}`));
