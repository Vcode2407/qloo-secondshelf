import test from 'node:test';
import assert from 'node:assert/strict';
import { handle,debit } from '../core/hosted.js';
import { inventory } from '../core/catalog.js';
import { createHmac } from 'node:crypto';
class StubD1 {
  quotas=new Map();drafts=new Map();
  prepare(sql){let values;const owner=this;return{bind(...args){values=args;return this;},async first(){
    if(sql.startsWith('INSERT INTO demo_quota')){const key=values[0]+values[1];const count=owner.quotas.get(key)||0;if(count>=values[2])return null;owner.quotas.set(key,count+1);return{used:count+1};}
    if(sql.startsWith('SELECT status'))return owner.drafts.get(values[0])??null;
    if(sql.startsWith('UPDATE demo_drafts')){const row=owner.drafts.get(values[0]);if(row?.status!=='draft')return null;row.status=sql.includes("'approved'")?'approved':'superseded';return{id:values[0]};}
    throw new Error('Unexpected SQL in test');
  },async run(){if(sql.startsWith('INSERT INTO demo_drafts'))owner.drafts.set(values[0],{status:values[1],expires:values[2]});return{};}};}
}
const setup=()=>({DB:new StubD1(),SECONDSHELF_STATE_SECRET:'nonsecret-hosted-test-secret-with-40-characters'});
async function call(env,path,payload,origin='https://secondshelf.test'){const response=await handle(new Request('https://secondshelf.test'+path,{method:payload?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined}),env,{fetchImpl(){throw new Error('No provider request permitted in this sample test');}});return{status:response.status,...await response.json()};}
const briefing={mode:'sample',seedQueries:[{name:'Interstellar',type:'movie'}],inventoryIds:inventory.filter(book=>book.availableCopies).slice(0,4).map(book=>book.id)};
test('hosted sample review, refinement and approval preserve provenance and reject replay',async()=>{
  const env=setup();const resolved=await call(env,'/api/resolve',briefing);assert.equal(resolved.status,200);
  const input={resolutionId:resolved.resolutionId,resolutionToken:resolved.resolutionToken,choices:resolved.results.map(row=>({index:row.index,entityId:row.candidates[0].id})),limit:3};
  const planned=await call(env,'/api/plans',input);assert.equal(planned.status,200);assert.equal(planned.draft.provenance.synthetic,true);
  const refined=await call(env,'/api/refine',{draftId:planned.draft.id,draftToken:planned.draftToken,excludeInventoryIds:[planned.draft.items[0].inventoryId]});assert.equal(refined.status,200);
  assert.equal((await call(env,'/api/approve',{draftId:planned.draft.id,draftToken:planned.draftToken})).status,409);
  const approved=await call(env,'/api/approve',{draftId:refined.draft.id,draftToken:refined.draftToken});assert.equal(approved.status,200);assert.equal(approved.list.status,'approved');assert.equal(approved.list.evidence.schemaVersion,1);assert.deepEqual(approved.list.trace,refined.draft.trace);
  assert.equal((await call(env,'/api/approve',{draftId:refined.draft.id,draftToken:refined.draftToken})).status,409);
  assert.equal([...env.DB.quotas.keys()].some(key=>key.startsWith('global')),false,'sample mode never consumes provider quota');
});
test('public route boundaries reject foreign origins, invented offered IDs and missing configuration',async()=>{
  const env=setup();assert.equal((await call(env,'/api/resolve',briefing,'https://other.test')).status,403);
  assert.equal((await call({},'/api/resolve',briefing)).status,503);
  const resolved=await call(env,'/api/resolve',briefing);
  const result=await call(env,'/api/plans',{resolutionId:resolved.resolutionId,resolutionToken:resolved.resolutionToken,choices:[{index:0,entityId:'invented'}]});assert.equal(result.status,400);
  assert.equal((await call(env,'/api/resolve',{...briefing,mode:'qloo'})).status,409);
  assert.equal((await call(env,'/api/status')).qlooConfigured,false);
});
test('malformed favourite values return HTTP 400 before any provider request',async()=>{
  const env=setup();env.QLOO_API_KEY='nonsecret-injected-test-key';let providerCalls=0;
  for(const mode of ['sample','qloo'])for(const seed of [null,[],{},'Interstellar',42,true]){
    const response=await handle(new Request('https://secondshelf.test/api/resolve',{method:'POST',headers:{Origin:'https://secondshelf.test','Content-Type':'application/json'},body:JSON.stringify({...briefing,mode,seedQueries:[seed]})}),env,{fetchImpl(){providerCalls++;throw new Error('Malformed input must not dispatch a provider request');}});
    assert.equal(response.status,400,`${mode} mode must reject ${JSON.stringify(seed)}`);
    assert.match((await response.json()).error,/Each favourite needs a name/);
  }
  const encoded=JSON.stringify({...briefing,mode:'qloo',seedQueries:[{name:'bad-byte-marker',type:'movie'}]});
  const marker=encoded.indexOf('bad-byte-marker');
  const raw=Buffer.concat([Buffer.from(encoded.slice(0,marker)),Buffer.from([0xff]),Buffer.from(encoded.slice(marker+'bad-byte-marker'.length))]);
  const malformed=await handle(new Request('https://secondshelf.test/api/resolve',{method:'POST',headers:{Origin:'https://secondshelf.test','Content-Type':'application/json'},body:raw}),env,{fetchImpl(){providerCalls++;throw new Error('Invalid UTF-8 must not dispatch a provider request');}});
  assert.equal(malformed.status,400);assert.match((await malformed.json()).error,/Send a valid JSON object/);
  const literalName='Favourite \uFFFD title';
  const valid=await call(env,'/api/resolve',{...briefing,seedQueries:[{name:literalName,type:'movie'}]});
  assert.equal(valid.status,200);assert.equal(valid.results[0].query,literalName,'A valid literal replacement character must be preserved');
  assert.equal(providerCalls,0);assert.equal(env.DB.drafts.size,0);
});
test('quota reserves failed attempts and rejects simultaneous work beyond the cap',async()=>{
  const db=new StubD1();const results=await Promise.allSettled(Array.from({length:8},()=>debit(db,'limited',3)));
  assert.equal(results.filter(row=>row.status==='fulfilled').length,3);assert.equal(results.filter(row=>row.status==='rejected').length,5);
});
test('an exhausted network cannot drain shared action or provider allowance without dispatch',async()=>{
  const now=Date.now();const day=new Date(now).toISOString().slice(0,10);const env=setup();
  const network=createHmac('sha256',env.SECONDSHELF_STATE_SECRET).update(`${day}:unknown-shared-network`).digest('hex');
  env.DB.quotas.set(`actions-${network}${day}`,100);
  assert.equal((await call(env,'/api/resolve',briefing)).status,429);
  assert.equal(env.DB.quotas.get(`actions-global${day}`),undefined);
  env.DB.quotas.set(`actions-${network}${day}`,0);env.DB.quotas.set(network+day,24);env.QLOO_API_KEY='nonsecret-injected-test-key';let calls=0;
  for(let i=0;i<3;i++){
    const response=await handle(new Request('https://secondshelf.test/api/resolve',{method:'POST',headers:{Origin:'https://secondshelf.test','Content-Type':'application/json'},body:JSON.stringify({...briefing,mode:'qloo'})}),env,{now,fetchImpl(){calls++;throw new Error('Provider dispatch must not occur');}});
    assert.equal(response.status,429);
  }
  assert.equal(calls,0);assert.equal(env.DB.quotas.get('global'+day),undefined);assert.equal(env.DB.quotas.get(network+day),24);
});
