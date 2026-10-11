import test from 'node:test';
import { request as httpRequest } from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename,dirname,join,resolve } from 'node:path';
import { startServer } from '../src/server.js';
import { Store,csvFor } from '../src/store.js';
import { Qloo } from '../src/qloo.js';
import { Planner } from '../src/planner.js';
const input={mode:'sample',seedQueries:[{name:'Interstellar',type:'movie'},{name:'David Bowie',type:'artist'}],inventoryIds:['dune','martian','earthsea','hobbit','prince','ocean']};
async function serverFixture(t,options={}){const directory=await mkdtemp(join(tmpdir(),'secondshelf-test-'));let running=await startServer({port:0,dataFile:join(directory,'library.json'),...options});t.after(async()=>{await running.close();const target=resolve(directory);assert.equal(dirname(target),resolve(tmpdir()));assert.ok(basename(target).startsWith('secondshelf-test-'));await rm(target,{recursive:true,force:true});});return{get running(){return running;},async restart(){await running.close();running=await startServer({port:0,dataFile:join(directory,'library.json'),...options});},async request(path,payload,headers={}){const response=await fetch(running.url+path,payload===undefined?{headers}:{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(payload)});const result=await response.json();return{response,result};}};}
async function plan(f,body=input){const resolved=(await f.request('/api/resolve',body)).result;const choices=resolved.results.filter(row=>row.candidates.length).map(row=>({index:row.index,entityId:row.candidates[0].id}));return(await f.request('/api/plans',{resolutionId:resolved.resolutionId,choices,limit:3,category:'all',excludeInventoryIds:[]})).result;}

test('configured sample mode makes zero provider calls and never claims qualification',async t=>{let calls=0;const f=await serverFixture(t,{key:'configured-secret',fetchImpl:async()=>{calls++;throw new Error('must not call');}});const status=(await f.request('/api/status')).result;assert.equal(status.qlooConfigured,true);assert.equal(status.mode,'sample');assert.equal(status.qualificationReady,false);const result=await plan(f);assert.equal(calls,0);assert.equal(result.draft.provenance.synthetic,true);assert.ok(result.draft.items.every(item=>item.evidence.kind==='sample'&&item.evidence.affinity===undefined));assert.doesNotMatch(JSON.stringify(result),/configured-secret/);});
test('sample entity review is required and fabricated IDs cannot enter a plan',async t=>{const f=await serverFixture(t);const resolved=(await f.request('/api/resolve',input)).result;const missing=await f.request('/api/plans',{resolutionId:resolved.resolutionId,choices:[]});assert.equal(missing.response.status,400);const fabricated=await f.request('/api/plans',{resolutionId:resolved.resolutionId,choices:[{index:0,entityId:'invented-id'}]});assert.equal(fabricated.response.status,400);assert.equal((await f.request('/api/lists')).result.drafts.length,0);});
test('unresolved favourite names stay unresolved instead of becoming fake cultural evidence',async t=>{const f=await serverFixture(t);const resolved=(await f.request('/api/resolve',{...input,seedQueries:[{name:'An Unknown Unpublished Film',type:'movie'}]})).result;assert.deepEqual(resolved.results[0].candidates,[]);const response=await f.request('/api/plans',{resolutionId:resolved.resolutionId,choices:resolved.results.filter(row=>row.purpose==='inventory').map(row=>({index:row.index,entityId:row.candidates[0].id}))});assert.equal(response.response.status,400);assert.match(response.result.error,/Every favourite/);});
test('out-of-stock titles and oversized resolution requests are refused',async t=>{const f=await serverFixture(t);const unavailable=await f.request('/api/resolve',{...input,inventoryIds:['omens']});assert.equal(unavailable.response.status,400);const excessive=await f.request('/api/resolve',{...input,inventoryIds:['dune','martian','earthsea','hobbit','prince','ocean','piranesi']});assert.equal(excessive.response.status,400);});
test('refinement enforces category and exclusions and prevents approval of a superseded draft',async t=>{const f=await serverFixture(t);const first=await plan(f);const excluded=first.draft.items[0].inventoryId;const result=await f.request('/api/refine',{draftId:first.draft.id,excludeInventoryIds:[excluded],category:'Science fiction',limit:5});assert.equal(result.response.status,200);assert.ok(result.result.draft.items.every(item=>item.category==='Science fiction'&&item.inventoryId!==excluded));assert.ok(result.result.draft.items.length<5);const approval=await f.request('/api/approve',{draftId:first.draft.id});assert.equal(approval.response.status,409);assert.equal((await f.request('/api/lists')).result.lists.length,0);});
test('approval is explicit, exactly once, persistent and is required for CSV export',async t=>{const f=await serverFixture(t);const result=await plan(f);const draftCsv=await fetch(f.running.url+`/api/export/${result.draft.id}.csv`);assert.equal(draftCsv.status,404);assert.equal((await f.request('/api/lists')).result.lists.length,0);const approved=(await f.request('/api/approve',{draftId:result.draft.id})).result;assert.equal(approved.list.status,'approved');const again=await f.request('/api/approve',{draftId:result.draft.id});assert.equal(again.response.status,409);await f.restart();const saved=(await f.request('/api/lists')).result;assert.equal(saved.lists.length,1);assert.equal(saved.lists[0].id,approved.list.id);const response=await fetch(f.running.url+`/api/export/${approved.list.id}.csv`);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/csv/);const text=await response.text();assert.match(text,/sample/);assert.ok(text.includes(approved.list.items[0].title));});
test('CSV escapes quotes and protects spreadsheet formula cells',()=>{const text=csvFor({mode:'sample',approvedAt:'2026-10-10',items:[{title:'=HYPERLINK("bad")',author:'@name',availableCopies:1,rank:1,evidence:{sampleFit:2}}]});assert.ok(text.includes('"\'=HYPERLINK(""bad"")"'));assert.ok(text.includes('"\'@name"'));});
test('live Qloo adapter uses the event URL, exact header and reviewed book filtering',async t=>{const calls=[];const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'];const qloo=new Qloo({key:'private-key',fetchImpl:async(url,options)=>{calls.push({url:new URL(url),options});return new Response(JSON.stringify(url.pathname==='/search'?{results:[{entity_id:ids[0],name:'Interstellar',types:['urn:entity:movie']}]}:{results:{entities:[{entity_id:ids[1],name:'Dune',query:{affinity:.81}}]}}),{headers:{'Content-Type':'application/json','x-request-id':'demo-actual-stub'}});}});const search=await qloo.search('Interstellar','movie');const insight=await qloo.insights([search.candidates[0].id],[ids[1]]);assert.equal(calls[0].url.origin,'https://hackathon.api.qloo.com');assert.equal(calls[0].url.pathname,'/search');assert.equal(calls[0].options.headers['X-Api-Key'],'private-key');assert.ok(calls[0].options.signal instanceof AbortSignal);assert.equal(calls[1].url.searchParams.get('filter.type'),'urn:entity:book');assert.equal(calls[1].url.searchParams.get('filter.results.entities'),ids[1]);assert.equal(calls[1].url.searchParams.get('signal.interests.entities'),ids[0]);assert.equal(insight.entities[0].affinity,.81);assert.doesNotMatch(JSON.stringify(insight.trace),/private-key/);});
test('live orchestration resolves reviewed catalogues and preserves actual response order',async t=>{let idCounter=0;const map=new Map();let calls=0;const f=await serverFixture(t,{key:'event-secret',fetchImpl:async(url)=>{calls++;const target=new URL(url);if(target.pathname==='/search'){const name=target.searchParams.get('query');const id=`00000000-0000-4000-8000-${String(++idCounter).padStart(12,'0')}`;map.set(name,id);return new Response(JSON.stringify({results:[{entity_id:id,name,types:[target.searchParams.get('types')]}]}));}return new Response(JSON.stringify({results:{entities:[{entity_id:map.get('The Martian'),query:{affinity:.3}},{entity_id:map.get('Dune'),query:{affinity:.9}}]}}));}});const result=await plan(f,{mode:'qloo',seedQueries:[{name:'Interstellar',type:'movie'}],inventoryIds:['dune','martian']});assert.equal(calls,4);assert.equal(result.draft.items[0].inventoryId,'martian');assert.equal(result.draft.items[0].evidence.affinity,.3);assert.equal(result.draft.provenance.synthetic,false);assert.equal(result.qualificationReady,false);assert.equal(result.trace[0].tool,'qloo.search');assert.equal(result.trace.filter(step=>step.tool==='qloo.search').length,3);assert.equal(result.trace.at(-1).tool,'qloo.insights');assert.doesNotMatch(JSON.stringify(result),/event-secret/);});
test('provider failures, unknown returned IDs and malformed bodies never fall back to sample rankings',async()=>{const qloo=new Qloo({key:'key',fetchImpl:async()=>new Response(JSON.stringify({results:{entities:[{entity_id:'00000000-0000-4000-8000-000000000099',query:{affinity:.5}}]}}))});await assert.rejects(qloo.insights(['00000000-0000-4000-8000-000000000001'],['00000000-0000-4000-8000-000000000002']),/unknown or duplicate/);const limited=new Qloo({key:'key',fetchImpl:async()=>new Response('{}',{status:429})});await assert.rejects(limited.search('Dune','book'),/quota or rate/);const malformed=new Qloo({key:'key',fetchImpl:async()=>new Response('not JSON')});await assert.rejects(malformed.search('Dune','book'),/invalid JSON/);});

test('Qloo streaming byte cap cancels early instead of buffering the entire provider response',async()=>{
  let chunksRead=0,cancelled=false;
  const body=new ReadableStream({pull(controller){chunksRead++;controller.enqueue(new Uint8Array(600000));},cancel(){cancelled=true;}},{highWaterMark:0});
  const qloo=new Qloo({key:'synthetic-private-key',fetchImpl:async()=>new Response(body)});
  await assert.rejects(qloo.get('/search',{query:'fictional',take:3}),error=>error.status===502&&/too much data/.test(error.message)&&!error.message.includes('synthetic-private-key'));
  assert.equal(chunksRead,3);assert.equal(cancelled,true);
});

test('Qloo byte cap handles multibyte data and preserves valid split UTF-8 characters',async()=>{
  const name='三体 · café \uFFFD';
  const content={results:[{entity_id:'00000000-0000-4000-8000-000000000001',name,types:['urn:entity:book']}]};
  const bytes=new TextEncoder().encode(JSON.stringify(content));let index=0;
  const body=new ReadableStream({pull(controller){if(index===bytes.length){controller.close();return;}controller.enqueue(bytes.slice(index,++index));}},{highWaterMark:0});
  const qloo=new Qloo({key:'stub',fetchImpl:async()=>new Response(body,{headers:{'x-request-id':'utf8-stub'}})});
  const search=await qloo.search(name,'book');assert.equal(search.candidates[0].name,name);assert.equal(search.trace.result.requestId,'utf8-stub');
  const oversized=JSON.stringify({padding:'界'.repeat(500000)});
  assert.ok(oversized.length<1500000,'A character count would allow this oversized byte response');
  const limited=new Qloo({key:'stub',fetchImpl:async()=>new Response(oversized)});
  await assert.rejects(limited.get('/search',{}),/too much data/);
  const invalid=new Qloo({key:'stub',fetchImpl:async()=>new Response(Uint8Array.from([0x7b,0x22,0x61,0x22,0x3a,0x22,0xff,0x22,0x7d]))});
  await assert.rejects(invalid.get('/search',{}),/invalid JSON/);
});
test('unconfigured live mode and external browser origins cannot execute planner actions',async t=>{const f=await serverFixture(t);assert.equal((await f.request('/api/resolve',{...input,mode:'qloo'})).response.status,409);const rejected=await f.request('/api/resolve',input,{Origin:'https://untrusted.example'});assert.equal(rejected.response.status,403);const hostStatus=await new Promise((done,reject)=>{const req=httpRequest(f.running.url+'/api/status',{headers:{Host:'untrusted.example'}},res=>{res.resume();done(res.statusCode);});req.on('error',reject);req.end();});assert.equal(hostStatus,403);});
test('invalid JSON objects and stale resolutions return recoverable errors without approving anything',async t=>{const f=await serverFixture(t);assert.equal((await f.request('/api/resolve',null)).response.status,400);const missing=await f.request('/api/plans',{resolutionId:'missing',choices:[]});assert.equal(missing.response.status,409);const store=new Store();const planner=new Planner({store,qloo:new Qloo()});const resolved=await planner.resolve(input);planner.resolutions.get(resolved.resolutionId).createdAt=Date.now()-31*60*1000;assert.throws(()=>planner.plan({resolutionId:resolved.resolutionId,choices:[]}),/expired/);assert.equal(store.summary().lists.length,0);});

const liveIds={
  arrival:'00000000-0000-4000-8000-000000000010',
  interstellar:'00000000-0000-4000-8000-000000000011',
  dune:'00000000-0000-4000-8000-000000000012',
  martian:'00000000-0000-4000-8000-000000000013'
};
const providerResponse=(body,requestId)=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json','x-request-id':requestId}});
async function reviewedLiveFixture(t,{returnedName='Dune'}={}){
  const calls=[];
  const f=await serverFixture(t,{key:'never-export-this-provider-secret',fetchImpl:async(url)=>{
    const target=new URL(url);calls.push(target);
    if(target.pathname==='/search'){
      const query=target.searchParams.get('query');
      const rows=query==='Space favourite'?
        [{entity_id:liveIds.arrival,name:'Arrival',types:['urn:entity:movie']},{entity_id:liveIds.interstellar,name:'Interstellar',types:['urn:entity:movie']}]:
        [{entity_id:query==='Dune'?liveIds.dune:liveIds.martian,name:query,types:['urn:entity:book']}];
      return providerResponse({results:rows},`search-${calls.length}`);
    }
    const allowed=new Set(target.searchParams.get('filter.results.entities').split(','));
    const entities=[{entity_id:liveIds.martian,name:'The Martian',query:{affinity:.3}},{entity_id:liveIds.dune,name:returnedName,query:{affinity:.9}}].filter(row=>allowed.has(row.entity_id));
    return providerResponse({results:{entities}},'stub-insights-45');
  }});
  const resolved=(await f.request('/api/resolve',{mode:'qloo',seedQueries:[{name:'Space favourite',type:'movie'}],inventoryIds:['dune','martian']})).result;
  const choices=resolved.results.map(row=>({index:row.index,entityId:row.purpose==='seed'?liveIds.interstellar:row.candidates[0].id}));
  return{f,calls,resolved,choices,async prepare(){return f.request('/api/plans',{resolutionId:resolved.resolutionId,choices,limit:3,category:'all',excludeInventoryIds:[]});}};
}
function csvRecords(text){
  const rows=text.trim().split('\r\n').map(line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(([,value])=>value.replaceAll('""','"')));
  return rows.slice(1).map(row=>Object.fromEntries(rows[0].map((name,index)=>[name,row[index]])));
}

test('Qloo search requires a declared requested type and rejects inconsistent duplicate identities',async()=>{
  for(const types of [undefined,[],['urn:entity:artist']]){
    const qloo=new Qloo({key:'stub-key',fetchImpl:async()=>providerResponse({results:[{entity_id:liveIds.dune,name:'Dune',...(types===undefined?{}:{types})}]},'invalid-type')});
    await assert.rejects(qloo.search('Dune','book'),/invalid|mismatch|type/i);
  }
  const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const qloo=new Qloo({key:'stub-key',fetchImpl:async()=>providerResponse({results:[
    {entity_id:id,name:'Dune',types:['urn:entity:book']},
    {entity_id:id.toUpperCase(),name:'Foundation',types:['urn:entity:book']}
  ]},'conflicting-identity')});
  await assert.rejects(qloo.search('Dune','book'),/duplicate|inconsistent|identity|conflicting/i);
});

test('one Qloo identity cannot map to two local books, including UUID case variations',async t=>{
  let insightsCalls=0;const sharedId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const f=await serverFixture(t,{key:'stub-key',fetchImpl:async(url)=>{
    const target=new URL(url);
    if(target.pathname!=='/search'){insightsCalls++;return providerResponse({results:{entities:[]}},'must-not-be-called');}
    const name=target.searchParams.get('query');
    const id=name==='Interstellar'?liveIds.interstellar:name==='Dune'?sharedId:sharedId.toUpperCase();
    return providerResponse({results:[{entity_id:id,name,types:[target.searchParams.get('types')]}]},'duplicate-map');
  }});
  const resolved=(await f.request('/api/resolve',{mode:'qloo',seedQueries:[{name:'Interstellar',type:'movie'}],inventoryIds:['dune','martian']})).result;
  const response=await f.request('/api/plans',{resolutionId:resolved.resolutionId,choices:resolved.results.map(row=>({index:row.index,entityId:row.candidates[0].id}))});
  assert.equal(response.response.status,400);assert.match(response.result.error,/same|duplicate|identity|different/i);
  assert.equal(insightsCalls,0);assert.equal((await f.request('/api/lists')).result.drafts.length,0);
});

test('a returned insights name cannot silently replace the reviewed book identity',async t=>{
  const fixture=await reviewedLiveFixture(t,{returnedName:'Foundation'});
  const response=await fixture.prepare();
  assert.equal(response.response.status,502);assert.match(response.result.error,/name|identity|reviewed|match/i);
  assert.equal(fixture.calls.filter(url=>url.pathname==='/v2/insights').length,1);
  assert.equal((await fixture.f.request('/api/lists')).result.drafts.length,0);
});

test('case and surrounding whitespace do not make a matching insights name a different identity',async t=>{
  const fixture=await reviewedLiveFixture(t,{returnedName:'  DUNE  '});
  const response=await fixture.prepare();assert.equal(response.response.status,200);
  const item=response.result.draft.items.find(book=>book.inventoryId==='dune');
  assert.equal(item.evidence.entityId,liveIds.dune);assert.equal(item.evidence.matchedEntity.name,'Dune');
  assert.equal(item.evidence.returnedEntity.name.trim().toLowerCase(),'dune');
});

test('reviewed aliases, complete evidence and approved JSON/CSV survive a server restart',async t=>{
  const fixture=await reviewedLiveFixture(t);const {f,resolved}=fixture;
  const response=await fixture.prepare();assert.equal(response.response.status,200);const draft=response.result.draft;
  const expectedFavourite={enteredQuery:'Space favourite',entity:{id:liveIds.interstellar,name:'Interstellar',type:'movie'}};
  assert.deepEqual(draft.selection.seeds,[expectedFavourite]);
  assert.deepEqual(draft.provenance.favourites,[expectedFavourite]);assert.deepEqual(draft.provenance.seedNames,['Interstellar']);
  assert.deepEqual(draft.selection.books,[
    {inventoryId:'dune',enteredQuery:'Dune',entityId:liveIds.dune,matchedEntity:{id:liveIds.dune,name:'Dune',type:'book'}},
    {inventoryId:'martian',enteredQuery:'The Martian',entityId:liveIds.martian,matchedEntity:{id:liveIds.martian,name:'The Martian',type:'book'}}
  ]);
  const evidence=draft.evidence;
  assert.equal(evidence.schemaVersion,1);assert.deepEqual(evidence.reviewedSelection,draft.selection);
  assert.deepEqual(evidence.resolutionTrace,resolved.trace);assert.equal(evidence.rankingTrace.at(-1).tool,'qloo.insights');
  assert.deepEqual(draft.trace,[...evidence.resolutionTrace,...evidence.rankingTrace]);assert.deepEqual(response.result.trace,draft.trace);
  assert.equal(evidence.request.endpoint,'https://hackathon.api.qloo.com/v2/insights');
  assert.equal(evidence.request.parameters['signal.interests.entities'],liveIds.interstellar);
  assert.equal(evidence.providerResponse.requestId,'stub-insights-45');
  assert.deepEqual(evidence.providerResponse.entities.map(entity=>entity.id),[liveIds.martian,liveIds.dune]);
  assert.equal(evidence.providerResponse.entities[0].name,'The Martian');
  assert.equal(draft.items[0].inventoryId,'martian');assert.equal(draft.items[0].evidence.entityId,liveIds.martian);
  assert.deepEqual(draft.items[0].evidence.matchedEntity,{id:liveIds.martian,name:'The Martian',type:'book'});
  assert.deepEqual(draft.items[0].evidence.returnedEntity,evidence.providerResponse.entities[0]);
  assert.equal(draft.items[0].evidence.requestId,'stub-insights-45');
  assert.equal((await fetch(f.running.url+`/api/export/${draft.id}.json`)).status,404);
  const approved=(await f.request('/api/approve',{draftId:draft.id})).result.list;
  for(const field of ['trace','selection','evidence','criteria'])assert.deepEqual(approved[field],draft[field]);
  await f.restart();const saved=(await f.request('/api/lists')).result;
  assert.deepEqual(saved.lists[0],approved);assert.deepEqual(saved.drafts[0].trace,draft.trace);
  const exported=await fetch(f.running.url+`/api/export/${approved.id}.json`);
  assert.equal(exported.status,200);assert.match(exported.headers.get('content-type'),/application\/json/);
  const exportedList=await exported.json();assert.deepEqual(exportedList,approved);
  const csvResponse=await fetch(f.running.url+`/api/export/${approved.id}.csv`);assert.equal(csvResponse.status,200);
  const csv=await csvResponse.text();const records=csvRecords(csv);assert.equal(records.length,2);
  assert.equal(records[0]['Qloo entity ID'],liveIds.martian);assert.equal(records[0]['Reviewed entity name'],'The Martian');
  assert.equal(records[0]['Returned entity name'],'The Martian');assert.equal(records[0]['Qloo request ID'],'stub-insights-45');
  assert.deepEqual(JSON.parse(records[0]['Reviewed favourites (JSON)']),[expectedFavourite]);
  assert.deepEqual(JSON.parse(records[0]['Entered favourite queries (JSON)']),['Space favourite']);
  assert.doesNotMatch(JSON.stringify({saved,exportedList,csv}),/never-export-this-provider-secret/);
});

test('refinement retains reviewed resolution evidence and replaces ranking evidence with the new constrained request',async t=>{
  const fixture=await reviewedLiveFixture(t);const first=(await fixture.prepare()).result.draft;
  const response=await fixture.f.request('/api/refine',{draftId:first.id,excludeInventoryIds:['dune'],category:'Science fiction',limit:3});
  assert.equal(response.response.status,200);const draft=response.result.draft;
  assert.deepEqual(draft.selection,first.selection);assert.deepEqual(draft.evidence.resolutionTrace,first.evidence.resolutionTrace);
  assert.equal(draft.evidence.request.parameters['filter.results.entities'],liveIds.martian);
  assert.deepEqual(draft.evidence.providerResponse.entities.map(entity=>entity.id),[liveIds.martian]);
  assert.deepEqual(draft.trace,[...draft.evidence.resolutionTrace,...draft.evidence.rankingTrace]);
  assert.deepEqual(draft.criteria,{category:'Science fiction',limit:3,excludeInventoryIds:['dune']});
  assert.equal((await fixture.f.request('/api/approve',{draftId:first.id})).response.status,409);
});

test('sample approval retains resolution and synthetic ranking evidence without a provider response',async t=>{
  const f=await serverFixture(t);const result=await plan(f);const draft=result.draft;
  assert.equal(draft.evidence.schemaVersion,1);assert.equal(draft.evidence.providerResponse,null);assert.equal(draft.evidence.request,null);
  assert.equal(draft.evidence.resolutionTrace.length,input.seedQueries.length+input.inventoryIds.length);
  assert.ok(draft.evidence.resolutionTrace.every(step=>step.tool==='sample.resolve'));
  assert.equal(draft.evidence.rankingTrace.at(-1).tool,'sample.rank_available_shelf');
  assert.deepEqual(draft.trace,[...draft.evidence.resolutionTrace,...draft.evidence.rankingTrace]);
  assert.deepEqual(draft.evidence.reviewedSelection,draft.selection);
  assert.ok(draft.items.every(item=>item.evidence.entityId&&item.evidence.matchedEntity&&!item.evidence.returnedEntity));
  const list=(await f.request('/api/approve',{draftId:draft.id})).result.list;await f.restart();
  const saved=(await f.request('/api/lists')).result.lists[0];assert.deepEqual(saved.evidence,draft.evidence);
  assert.deepEqual(saved.trace,draft.trace);assert.deepEqual(saved.selection,draft.selection);assert.equal(saved.id,list.id);
});

test('legacy live drafts without reviewed evidence must be resolved again before approval or refinement',async t=>{
  let calls=0;const f=await serverFixture(t,{key:'stub-key',fetchImpl:async()=>{calls++;throw new Error('legacy evidence must not reach Qloo');}});
  const legacy=f.running.store.addDraft({mode:'qloo',items:[{inventoryId:'dune',title:'Dune',author:'Frank Herbert',availableCopies:2,category:'Science fiction',rank:1,evidence:{kind:'qloo',affinity:.9}}],
    criteria:{category:'all',limit:3,excludeInventoryIds:[]},
    selection:{mode:'qloo',seedIds:[liveIds.interstellar],seedNames:['Interstellar'],books:[{inventoryId:'dune',entityId:liveIds.dune}]},
    provenance:{mode:'qloo',synthetic:false,seedNames:['Interstellar']}});
  await f.restart();
  for(const [path,payload] of [['/api/approve',{draftId:legacy.id}],['/api/refine',{draftId:legacy.id,limit:3}]]){
    const response=await f.request(path,payload);assert.equal(response.response.status,409);assert.match(response.result.error,/resolve|review|evidence/i);
  }
  assert.equal(calls,0);assert.equal((await f.request('/api/lists')).result.lists.length,0);
});

test('malformed favourite rows return actionable errors before any provider request',async t=>{
  let calls=0;
  const f=await serverFixture(t,{key:'fixture-key',fetchImpl:async()=>{calls++;throw new Error('Invalid favourites must not reach a provider.');}});
  for(const seed of [null,'Interstellar',[],{}, {name:null,type:'movie'}]){
    const response=await f.request('/api/resolve',{...input,mode:'qloo',seedQueries:[seed]});
    assert.equal(response.response.status,400);
    assert.match(response.result.error,/Each favourite needs/);
  }
  assert.equal(calls,0);
  assert.deepEqual((await f.request('/api/lists')).result,{drafts:[],lists:[]});
});

test('UTF-8 favourites survive transport boundaries and invalid byte sequences cannot reach Qloo',async t=>{
  let calls=0;
  const f=await serverFixture(t,{key:'fixture-only',fetchImpl:async()=>{calls++;throw new Error('Invalid request bodies must not reach Qloo.');}});
  const name='Café favourite';
  const payload={...input,seedQueries:[{name,type:'movie'}],inventoryIds:['dune']};
  const encoded=Buffer.from(JSON.stringify(payload));
  const split=encoded.indexOf(Buffer.from('é'))+1;
  const result=await new Promise((resolve,reject)=>{
    const request=httpRequest(f.running.url+'/api/resolve',{method:'POST',headers:{'Content-Type':'application/json'}},response=>{
      let text='';response.setEncoding('utf8');response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,body:JSON.parse(text)}));
    });
    request.on('error',reject);
    // Wait for the first partial character to reach the server before sending
    // its remaining bytes, avoiding timing-dependent packet coalescing.
    f.running.server.once('request',incoming=>incoming.once('data',()=>request.end(encoded.subarray(split))));
    request.write(encoded.subarray(0,split));
  });
  assert.equal(result.status,200);
  assert.equal(result.body.results[0].query,name);

  const malformed=Buffer.from(JSON.stringify({...payload,mode:'qloo'}));
  malformed[malformed.indexOf(Buffer.from('é'))]=0xff;
  const rejected=await new Promise((resolve,reject)=>{
    const request=httpRequest(f.running.url+'/api/resolve',{method:'POST',headers:{'Content-Type':'application/json'}},response=>{
      let text='';response.setEncoding('utf8');response.on('data',chunk=>text+=chunk);response.on('end',()=>resolve({status:response.statusCode,body:JSON.parse(text)}));
    });
    request.on('error',reject);request.end(malformed);
  });
  assert.equal(rejected.status,400);
  assert.match(rejected.body.error,/valid JSON object/);
  const literal='Caf\uFFFD favourite';
  const validReplacement=await f.request('/api/resolve',{...payload,seedQueries:[{name:literal,type:'movie'}]});
  assert.equal(validReplacement.response.status,200);
  assert.equal(validReplacement.result.results[0].query,literal);
  assert.equal((await f.request('/api/resolve',{...payload,mode:'qloo',padding:'é'.repeat(10000)})).response.status,413);
  assert.equal(calls,0);
});

async function heldRefinementFixture(t){
  let held=false,insightsCalls=0;
  const waiting=[];
  const f=await serverFixture(t,{key:'injected-fixture-only',fetchImpl:async(url)=>{
    const target=new URL(url);
    if(target.pathname==='/search'){
      const name=target.searchParams.get('query');
      const id=name==='Interstellar'?liveIds.interstellar:name==='Dune'?liveIds.dune:liveIds.martian;
      return providerResponse({results:[{entity_id:id,name,types:[target.searchParams.get('types')]}]},'fixture-search');
    }
    insightsCalls++;
    if(held)await new Promise(resolve=>waiting.push(resolve));
    const ids=target.searchParams.get('filter.results.entities').split(',');
    return providerResponse({results:{entities:ids.map(id=>({entity_id:id,name:id===liveIds.dune?'Dune':'The Martian',query:{affinity:.5}}))}},'fixture-insights');
  }});
  const first=(await plan(f,{mode:'qloo',seedQueries:[{name:'Interstellar',type:'movie'}],inventoryIds:['dune','martian']})).draft;
  return{f,first,get insightsCalls(){return insightsCalls;},hold(){held=true;},release(){held=false;waiting.splice(0).forEach(resolve=>resolve());},async waitFor(count){
    const deadline=Date.now()+3000;
    while(waiting.length<count&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));
    assert.equal(waiting.length,count,'The injected provider must hold all expected requests before the competing action.');
  }};
}

test('concurrent provider-backed refinements can persist only one replacement draft',async t=>{
  const fixture=await heldRefinementFixture(t);
  fixture.hold();
  const pending=[fixture.f.request('/api/refine',{draftId:fixture.first.id,limit:3}),fixture.f.request('/api/refine',{draftId:fixture.first.id,limit:5})];
  try{await fixture.waitFor(2);}finally{fixture.release();}
  const results=await Promise.all(pending);
  assert.deepEqual(results.map(result=>result.response.status).sort(),[200,409]);
  const saved=(await fixture.f.request('/api/lists')).result;
  assert.equal(saved.drafts.length,2);
  assert.equal(saved.drafts.find(draft=>draft.id===fixture.first.id).status,'superseded');
  assert.equal(saved.drafts.filter(draft=>draft.status==='draft').length,1);
  assert.equal(saved.lists.length,0);
  assert.equal((await fixture.f.request('/api/approve',{draftId:fixture.first.id})).response.status,409);
});

test('approval during a pending refinement wins without creating an unreviewed replacement',async t=>{
  const fixture=await heldRefinementFixture(t);
  fixture.hold();
  const pending=fixture.f.request('/api/refine',{draftId:fixture.first.id,limit:5});
  let approval;
  try{
    await fixture.waitFor(1);
    approval=await fixture.f.request('/api/approve',{draftId:fixture.first.id});
    assert.equal(approval.response.status,200);
  }finally{fixture.release();}
  assert.equal((await pending).response.status,409);
  const saved=(await fixture.f.request('/api/lists')).result;
  assert.equal(saved.drafts.length,1);
  assert.equal(saved.drafts[0].status,'approved');
  assert.deepEqual(saved.lists,[approval.result.list]);
  const callsBefore=fixture.insightsCalls;
  assert.equal((await fixture.f.request('/api/refine',{draftId:fixture.first.id,limit:3})).response.status,409);
  assert.equal(fixture.insightsCalls,callsBefore,'An approved draft must be rejected before another provider request.');
});
