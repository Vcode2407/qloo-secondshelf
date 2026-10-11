import test from 'node:test';
import assert from 'node:assert/strict';
import { Qloo } from '../core/qloo.js';
import { AppError } from '../core/store.js';

const encoder = new TextEncoder();
const clientFor = response => new Qloo({key:'nonsecret-injected-test-key',fetchImpl:async()=>response});

function streamed(chunks) {
  const observed={pulls:0,cancellations:0};
  const response=new Response(new ReadableStream({
    pull(controller) {
      if(observed.pulls===chunks.length){controller.close();return;}
      controller.enqueue(chunks[observed.pulls++]);
    },
    cancel(){observed.cancellations++;},
  },{highWaterMark:0}),{headers:{'x-request-id':'injected-stream-test'}});
  return {response,observed};
}

test('hosted Qloo byte limit cancels an oversized UTF-8 stream before its unread tail',async()=>{
  const {response,observed}=streamed([
    encoder.encode('{"value":"'),
    encoder.encode('é'.repeat(750000)),
    encoder.encode('"}'),
  ]);
  await assert.rejects(clientFor(response).get('/search',{query:'test'}),error=>error instanceof AppError&&error.status===502&&/too much data/.test(error.message));
  assert.equal(observed.pulls,2,'The JSON tail must not be read after the byte limit is exceeded');
  assert.equal(observed.cancellations,1,'The underlying stream must be cancelled on overflow');
});

test('hosted Qloo accepts valid JSON at the exact byte limit and preserves provenance',async()=>{
  const value='a'.repeat(1500000-8);
  const {response}=streamed([encoder.encode('{"v":"'),encoder.encode(value),encoder.encode('"}')]);
  const result=await clientFor(response).get('/search',{query:'boundary'});
  assert.equal(result.body.v,value);
  assert.equal(result.request.endpoint,'https://hackathon.api.qloo.com/search');
  assert.deepEqual(result.request.parameters,{query:'boundary'});
  assert.equal(result.requestId,'injected-stream-test');
});

test('hosted Qloo rejects invalid UTF-8 rather than silently replacing it in JSON',async()=>{
  const invalid=streamed([encoder.encode('{"name":"'),new Uint8Array([0xff]),encoder.encode('"}')]);
  await assert.rejects(clientFor(invalid.response).get('/search',{}),error=>error instanceof AppError&&error.status===502&&/invalid JSON/.test(error.message));
  const valid=streamed([encoder.encode('{"name":"Favourite \uFFFD title"}')]);
  assert.equal((await clientFor(valid.response).get('/search',{})).body.name,'Favourite \uFFFD title','A valid encoded replacement character remains valid text');
});

test('hosted Qloo decodes multibyte characters split across stream chunks',async()=>{
  const {response}=streamed([encoder.encode('{"name":"caf'),new Uint8Array([0xc3]),new Uint8Array([0xa9]),encoder.encode('"}')]);
  assert.equal((await clientFor(response).get('/search',{})).body.name,'café');
});

test('hosted Qloo sanitizes stream failures and attempts cancellation even if cancellation fails',async()=>{
  let cancellations=0;
  const response={ok:true,body:{getReader(){return{
    async read(){throw new Error('Injected private upstream detail');},
    async cancel(){cancellations++;throw new Error('Injected private cancellation detail');},
  };}}};
  await assert.rejects(clientFor(response).get('/search',{}),error=>error instanceof AppError&&error.status===502&&error.message==='Qloo could not be reached within the request limit. No sample data was substituted.');
  assert.equal(cancellations,1);
});

test('hosted Qloo preserves an AppError 429 from its quota-aware fetch wrapper',async()=>{
  const exhausted=new AppError('The hosted provider allowance is exhausted.',429);
  const qloo=new Qloo({key:'nonsecret-injected-test-key',fetchImpl:async()=>{throw exhausted;}});
  await assert.rejects(qloo.get('/search',{}),error=>error===exhausted&&error.status===429);
});
