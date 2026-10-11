import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import { inventory,seeds } from './catalog.js';
import { Store,AppError,csvFor } from './store.js';
import { Qloo } from './qloo.js';
import { Planner } from './planner.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){
  if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError('Send application/json requests.',415);
  const chunks=[];let bytes=0;
  for await(const part of req){bytes+=part.length;if(bytes>20000)throw new AppError('This request is too large.',413);chunks.push(part);}
  // Decode the complete bounded body so a character split across transport
  // chunks is preserved, and malformed UTF-8 never becomes provider evidence.
  try{const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();return parsed;}catch{throw new AppError('Send a valid JSON object.');}
}
export async function startServer({port=4182,key='',dataFile=resolve(root,'data/library.json'),fetchImpl}={}){
  if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT must be an integer from 0 to 65535.');
  const store=new Store(dataFile);const planner=new Planner({store,qloo:new Qloo({key,fetchImpl})});let actualPort;
  const server=createServer(async(req,res)=>{try{
    const host=req.headers.host;const allowed=new Set([`127.0.0.1:${actualPort}`,`localhost:${actualPort}`]);if(!allowed.has(host))throw new AppError('Only the local SecondShelf host is allowed.',403);
    const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:'+actualPort,'http://localhost:'+actualPort].includes(origin))throw new AppError('Only the local SecondShelf origin is allowed.',403);
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");res.setHeader('X-Content-Type-Options','nosniff');
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.method==='GET'&&url.pathname==='/api/status')return json(res,200,planner.status());
    if(req.method==='GET'&&url.pathname==='/api/inventory')return json(res,200,{items:inventory,sampleSeeds:seeds.filter(seed=>seed.type!=='book').map(({name,type})=>({name,type}))});
    if(req.method==='GET'&&url.pathname==='/api/lists')return json(res,200,store.summary());
    if(req.method==='POST'&&url.pathname==='/api/resolve')return json(res,200,await planner.resolve(await body(req)));
    if(req.method==='POST'&&url.pathname==='/api/plans')return json(res,200,await planner.plan(await body(req)));
    if(req.method==='POST'&&url.pathname==='/api/refine')return json(res,200,await planner.refine(await body(req)));
    if(req.method==='POST'&&url.pathname==='/api/approve'){const payload=await body(req);return json(res,200,store.approve(payload.draftId));}
    const exported=url.pathname.match(/^\/api\/export\/([a-f0-9-]+)\.csv$/);if(req.method==='GET'&&exported){const text=csvFor(store.list(exported[1]));res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="secondshelf-approved-list.csv"','Cache-Control':'no-store'});return res.end(text);}
    const evidenceExport=url.pathname.match(/^\/api\/export\/([a-f0-9-]+)\.json$/);if(req.method==='GET'&&evidenceExport){res.setHeader('Content-Disposition','attachment; filename="secondshelf-approved-evidence.json"');return json(res,200,store.list(evidenceExport[1]));}
    const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css'};
    if(req.method==='GET'&&files[url.pathname]){const data=await readFile(resolve(root,'public',files[url.pathname]));res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});return res.end(data);}
    throw new AppError('This route was not found.',404);
  }catch(error){if(!res.headersSent)json(res,error instanceof AppError?error.status:500,{error:error instanceof AppError?error.message:'The local planner could not finish this action. Nothing was automatically approved.'});if(!(error instanceof AppError))console.error('SecondShelf local action failed:',error.name);}});
  await new Promise((done,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{actualPort=server.address().port;done();});});return{server,url:`http://127.0.0.1:${actualPort}`,store,planner,close:()=>new Promise((done,reject)=>{server.close(error=>error?reject(error):done());server.closeIdleConnections();})};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{loadEnvFile(resolve(root,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}const running=await startServer({port:Number(process.env.PORT||4182),key:process.env.QLOO_API_KEY||''});console.log(`SecondShelf: ${running.url}`);console.log('Default sample mode: synthetic evidence, no Qloo calls. Public submission qualification is pending.');for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await running.close();process.exit(0);});}
