import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from './store.js';
const MAX_TOKEN=120000;
export function seal(kind,data,key,now=Date.now()){
  if(typeof key!=='string'||key.length<32)throw new AppError('The hosted planner is not configured yet.',503);
  const payload=Buffer.from(JSON.stringify({v:1,kind,expires:now+30*60*1000,data})).toString('base64url');
  const signature=createHmac('sha256',key).update(payload).digest('base64url');
  if(payload.length>MAX_TOKEN)throw new AppError('This evidence is too large for the demo. Choose fewer books.',413);
  return `${payload}.${signature}`;
}
export function unseal(token,kind,key,now=Date.now()){
  if(typeof token!=='string'||token.length>MAX_TOKEN+50||!/^[-_a-zA-Z0-9]+\.[-_a-zA-Z0-9]{43}$/.test(token))throw new AppError('Resolve and review a fresh draft; this evidence token is invalid.',409);
  if(typeof key!=='string'||key.length<32)throw new AppError('The hosted planner is not configured yet.',503);
  const [payload,signature]=token.split('.');const actual=Buffer.from(signature,'base64url');const expected=createHmac('sha256',key).update(payload).digest();
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new AppError('This evidence token was changed. Resolve and review a fresh draft.',409);
  let envelope;try{envelope=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{throw new AppError('The evidence token is unreadable.',409);}
  if(envelope.v!==1||envelope.kind!==kind||!Number.isFinite(envelope.expires)||envelope.expires<now||envelope.expires>now+30*60*1000)throw new AppError('This match review or draft expired. Start a fresh review.',409);
  return envelope.data;
}
