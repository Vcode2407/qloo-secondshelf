import test from 'node:test';
import assert from 'node:assert/strict';
import { seal,unseal } from '../core/capsules.js';
const key='isolated-test-signing-value-40-characters-only';
test('review capsule preserves identity and rejects changed evidence, kind and expiry',()=>{
  const now=1800000000000;const token=seal('resolution',{id:'review',choices:['offered']},key,now);
  assert.deepEqual(unseal(token,'resolution',key,now),{id:'review',choices:['offered']});
  const [payload,signature]=token.split('.');const edited=JSON.parse(Buffer.from(payload,'base64url'));edited.data.choices=['invented'];
  assert.throws(()=>unseal(`${Buffer.from(JSON.stringify(edited)).toString('base64url')}.${signature}`,'resolution',key,now),/changed/);
  assert.throws(()=>unseal(token,'draft',key,now),/expired/);
  assert.throws(()=>unseal(token,'resolution',key,now+1800001),/expired/);
  assert.throws(()=>unseal(token,'resolution',key+'other',now),/changed/);
});
test('capsules require a backend secret and bound oversized evidence',()=>{
  assert.throws(()=>seal('draft',{},''),/configured/);
  assert.throws(()=>seal('draft',{text:'x'.repeat(120000)},key),/too large/);
  assert.throws(()=>unseal('x'.repeat(130000),'draft',key),/invalid/);
});
