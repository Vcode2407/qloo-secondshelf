import { createHmac } from 'node:crypto';
import { Store,AppError } from './store.js';
import { Planner } from './planner.js';
import { Qloo } from './qloo.js';
import { inventory,seeds } from './catalog.js';
import { seal,unseal } from './capsules.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function input(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AppError('Send a JSON request.',415);
  let size=0;const chunks=[];const reader=request.body?.getReader();if(!reader)throw new AppError('Send a JSON object.');
  for(;;){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>140000){await reader.cancel();throw new AppError('This request exceeds the demo limit.',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new AppError('Send a valid JSON object.');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new AppError('Send a JSON object.');return body;
}
export async function debit(db,bucket,limit,now=Date.now(),label='Qloo call'){
  const day=new Date(now).toISOString().slice(0,10);const row=await db.prepare('INSERT INTO demo_quota (bucket, day, used) VALUES (?, ?, 1) ON CONFLICT (bucket, day) DO UPDATE SET used = used + 1 WHERE used < ? RETURNING used').bind(bucket,day,limit).first();
  if(!row)throw new AppError(`The public demo has reached its daily ${label} allowance. Wait for the next UTC day before retrying.`,429);
}
export async function handle(request,environment,{fetchImpl=fetch,now=Date.now()}={}){
  try{
    const url=new URL(request.url);const route=url.pathname;
    const configured=Boolean(environment.QLOO_API_KEY&&environment.SECONDSHELF_STATE_SECRET?.length>=32&&environment.DB);
    if(request.method==='GET'&&route==='/api/status')return json({mode:'sample',qlooConfigured:configured,label:'Hosted sample · synthetic cultural signals',detail:'Browser-local saved lists; live provider verification pending.',qualificationReady:false,publicSourceUrl:'https://github.com/Vcode2407/qloo-secondshelf',publicDemoDailyCalls:200,perNetworkDailyCalls:24});
    if(request.method==='GET'&&route==='/api/inventory')return json({items:inventory,sampleSeeds:seeds.filter(seed=>seed.type!=='book').map(({name,type})=>({name,type}))});
    if(request.method!=='POST'||!['/api/resolve','/api/plans','/api/refine','/api/approve'].includes(route))throw new AppError('This route was not found.',404);
    const origin=request.headers.get('origin');if(origin&&origin!==url.origin)throw new AppError('Use this demo on its own origin.',403);
    const payload=await input(request);const key=environment.SECONDSHELF_STATE_SECRET;
    if(!key||key.length<32||!environment.DB)throw new AppError('The hosted planner is being configured. Try again shortly.',503);
    const address=request.headers.get('cf-connecting-ip')||'unknown-shared-network';
    const network=createHmac('sha256',key).update(`${new Date(now).toISOString().slice(0,10)}:${address}`).digest('hex');
    await debit(environment.DB,`actions-${network}`,100,now,'action');await debit(environment.DB,'actions-global',2000,now,'action');
    await environment.DB.prepare('DELETE FROM demo_drafts WHERE id IN (SELECT id FROM demo_drafts WHERE expires < ? LIMIT 100)').bind(now).run();
    await environment.DB.prepare('DELETE FROM demo_quota WHERE day < ?').bind(new Date(now-2*86400000).toISOString().slice(0,10)).run();
    const store=new Store();let liveCalls=0;
    const providerFetch=async (...args)=>{
      if(++liveCalls>9)throw new AppError('This action exceeded the bounded provider call allowance.',429);
      await debit(environment.DB,network,24,now);await debit(environment.DB,'global',200,now);
      return fetchImpl(...args);
    };
    const planner=new Planner({store,qloo:new Qloo({key:environment.QLOO_API_KEY||'',fetchImpl:providerFetch})});
    if(route==='/api/resolve'){
      const result=await planner.resolve(payload);const record=planner.resolutions.get(result.resolutionId);
      return json({...result,resolutionToken:seal('resolution',{id:result.resolutionId,record},key,now)});
    }
    if(route==='/api/plans'){
      const resolved=unseal(payload.resolutionToken,'resolution',key,now);if(resolved.id!==payload.resolutionId)throw new AppError('Use the reviewed match set for this plan.',409);
      planner.resolutions.set(resolved.id,resolved.record);const result=await planner.plan(payload);
      await environment.DB.prepare('INSERT INTO demo_drafts (id, status, expires) VALUES (?, ?, ?)').bind(result.draft.id,'draft',now+30*60*1000).run();
      return json({...result,draftToken:seal('draft',result.draft,key,now)});
    }
    const draft=unseal(payload.draftToken,'draft',key,now);if(draft.id!==payload.draftId)throw new AppError('Use the current draft for this action.',409);
    const record=await environment.DB.prepare('SELECT status, expires FROM demo_drafts WHERE id = ?').bind(draft.id).first();
    if(!record||record.status!=='draft'||record.expires<now)throw new AppError('This draft was approved, replaced or expired. Resolve a new reading list.',409);
    store.state.drafts=[draft];
    if(route==='/api/refine'){
      const result=await planner.refine(payload);
      const claim=await environment.DB.prepare("UPDATE demo_drafts SET status = 'superseded' WHERE id = ? AND status = 'draft' RETURNING id").bind(draft.id).first();
      if(!claim)throw new AppError('This draft changed while you reviewed it. Start a fresh review.',409);
      await environment.DB.prepare('INSERT INTO demo_drafts (id, status, expires) VALUES (?, ?, ?)').bind(result.draft.id,'draft',now+30*60*1000).run();
      return json({...result,draftToken:seal('draft',result.draft,key,now)});
    }
    const result=store.approve(draft.id);
    const claim=await environment.DB.prepare("UPDATE demo_drafts SET status = 'approved' WHERE id = ? AND status = 'draft' RETURNING id").bind(draft.id).first();
    if(!claim)throw new AppError('This draft changed while you approved it. Start a fresh review.',409);
    return json(result);
  }catch(error){return json({error:error instanceof AppError?error.message:'The hosted planner could not finish. Nothing was automatically approved.'},error instanceof AppError?error.status:500);}
}
