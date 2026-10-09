import { AppError } from './store.js';
const BASE='https://hackathon.api.qloo.com';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const normalizeEntityName=name=>name.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export class Qloo {
  constructor({key='',fetchImpl=fetch,timeout=8000}={}){this.key=key.trim();this.fetch=fetchImpl;this.timeout=timeout;}
  async get(path,parameters){if(!this.key)throw new AppError('No event Qloo key is configured. Choose sample mode or add a key to the local .env file.',409);const url=new URL(path,BASE);for(const [key,value]of Object.entries(parameters))url.searchParams.set(key,String(value));let response;try{response=await this.fetch(url,{headers:{'X-Api-Key':this.key,Accept:'application/json'},signal:AbortSignal.timeout(this.timeout),redirect:'error'});}catch{throw new AppError('Qloo could not be reached within the request limit. No sample data was substituted.',502);}if(!response.ok)throw new AppError(response.status===429?'Qloo quota or rate limit reached. Wait before trying again.':response.status===401||response.status===403?'Qloo rejected this event credential or entity type. Check your hackathon access.':'Qloo returned an error. Try again later; no sample results were substituted.',502);const raw=await response.text();if(raw.length>1500000)throw new AppError('Qloo returned too much data for this small request.',502);let body;try{body=JSON.parse(raw);}catch{throw new AppError('Qloo returned invalid JSON.',502);}return {body,request:{endpoint:`${BASE}${path}`,parameters},requestId:response.headers.get('x-request-id')||null};}
  async search(name,type){
    const result=await this.get('/search',{query:name,types:`urn:entity:${type}`,take:3});
    const rows=Array.isArray(result.body.results)?result.body.results:result.body.results?.entities??result.body.entities;
    if(!Array.isArray(rows))throw new AppError('Qloo search returned an unsupported response shape.',502);
    const unique=new Map();
    for(const row of rows.slice(0,3)){
      const id=row?.entity_id??row?.id;const entityName=row?.name;const types=row?.types;
      if(typeof id!=='string'||!uuid.test(id)||typeof entityName!=='string'||!entityName.trim()||entityName.length>300||!Array.isArray(types)||!types.includes(`urn:entity:${type}`))throw new AppError('Qloo search returned an invalid or mismatched entity. No match was assumed.',502);
      const candidate={id:id.toLowerCase(),name:entityName.trim(),type};const previous=unique.get(candidate.id);
      if(previous&&normalizeEntityName(previous.name)!==normalizeEntityName(candidate.name))throw new AppError('Qloo search returned conflicting names for the same entity. Resolve this title again.',502);
      unique.set(candidate.id,candidate);
    }
    const candidates=[...unique.values()];return{candidates,trace:{tool:'qloo.search',arguments:result.request,result:{candidates,requestId:result.requestId}}};
  }
  async insights(seedIds,bookIds){
    if(!seedIds.every(id=>typeof id==='string'&&uuid.test(id))||!bookIds.every(id=>typeof id==='string'&&uuid.test(id)))throw new AppError('Live insights require reviewed Qloo entity IDs.');
    const reviewedBooks=bookIds.map(id=>id.toLowerCase());
    if(new Set(reviewedBooks).size!==reviewedBooks.length)throw new AppError('Different catalogue books cannot share the same reviewed Qloo entity. Omit the ambiguous match and review again.');
    const response=await this.get('/v2/insights',{'filter.type':'urn:entity:book','signal.interests.entities':seedIds.map(id=>id.toLowerCase()).join(','),'filter.results.entities':reviewedBooks.join(','),take:6});
    const rows=response.body.results?.entities??response.body.entities;if(!Array.isArray(rows))throw new AppError('Qloo insights returned an unsupported response shape.',502);
    const seen=new Set();const entities=rows.map(row=>{
      const rawId=row?.entity_id??row?.id;const id=typeof rawId==='string'?rawId.toLowerCase():'';
      if(!uuid.test(id)||!reviewedBooks.includes(id)||seen.has(id))throw new AppError('Qloo returned an unknown or duplicate catalogue entity. The result was not accepted.',502);seen.add(id);
      if(row.name!==undefined&&row.name!==null&&(typeof row.name!=='string'||!row.name.trim()||row.name.length>300))throw new AppError('Qloo returned an invalid catalogue name.',502);
      if(row.types!==undefined&&(!Array.isArray(row.types)||!row.types.includes('urn:entity:book')))throw new AppError('Qloo returned a mismatched catalogue entity type.',502);
      const affinity=row.query?.affinity??row.affinity??null;if(affinity!==null&&(typeof affinity!=='number'||!Number.isFinite(affinity)))throw new AppError('Qloo returned an invalid affinity value.',502);
      return{id,name:typeof row.name==='string'?row.name.trim():null,affinity};
    });
    return{entities,trace:{tool:'qloo.insights',arguments:response.request,result:{entities,requestId:response.requestId}},request:response.request,requestId:response.requestId};
  }
}
