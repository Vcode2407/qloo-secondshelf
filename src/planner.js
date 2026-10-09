import { randomUUID } from 'node:crypto';
import { inventory,seeds } from './catalog.js';
import { AppError } from './store.js';
import { normalizeEntityName } from './qloo.js';
export class Planner {
  constructor({store,qloo}){this.store=store;this.qloo=qloo;this.resolutions=new Map();}
  status(){return{mode:'sample',qlooConfigured:Boolean(this.qloo.key),label:'Sample mode · synthetic cultural signals',detail:'A working local planner. Sample fit uses authored fixture tags, never Qloo rankings.',timeZone:'Asia/Kolkata',qualificationReady:false,qualificationGates:['Real Qloo access and an end-to-end live run','Externally published functional demo','Public licensed source and submission assets','Entrant eligibility verification']};}
  validateInput(body){if(!body||typeof body!=='object'||!['sample','qloo'].includes(body.mode)||!Array.isArray(body.seedQueries)||body.seedQueries.length<1||body.seedQueries.length>3)throw new AppError('Choose sample or Qloo mode and enter one to three favourites.');for(const seed of body.seedQueries)if(typeof seed.name!=='string'||seed.name.trim().length<2||seed.name.trim().length>120||!['movie','artist','book'].includes(seed.type))throw new AppError('Each favourite needs a name (2–120 characters) and a movie, artist or book category.');if(!Array.isArray(body.inventoryIds)||body.inventoryIds.length<1||body.inventoryIds.length>6||new Set(body.inventoryIds).size!==body.inventoryIds.length)throw new AppError('Choose one to six different available shelf books.');const books=body.inventoryIds.map(id=>inventory.find(book=>book.id===id));if(books.some(book=>!book||book.availableCopies<1))throw new AppError('Only books with available copies can enter the shortlist.');return books;}
  async resolve(body){const books=this.validateInput(body);if(body.mode==='qloo'&&!this.qloo.key)throw new AppError('Qloo is not configured. Sample mode remains available.',409);for(const[id,entry]of this.resolutions)if(Date.now()-entry.createdAt>30*60*1000)this.resolutions.delete(id);if(this.resolutions.size>=100)throw new AppError('Too many pending match reviews. Restart the local server to clear expired work.',429);const inputs=[...body.seedQueries.map(seed=>({purpose:'seed',query:seed.name.trim(),type:seed.type})),...books.map(book=>({purpose:'inventory',query:book.title,type:'book',inventoryId:book.id}))];const results=[];const trace=[];const started=Date.now();for(let index=0;index<inputs.length;index++){if(body.mode==='qloo'&&Date.now()-started>22000)throw new AppError('This review took too long. Select fewer shelf books and resolve again.',503);const input=inputs[index];let candidates;if(body.mode==='qloo'){const found=await this.qloo.search(input.query,input.type);candidates=found.candidates;trace.push(found.trace);}else{candidates=seeds.filter(seed=>seed.type===input.type&&seed.aliases.includes(input.query.toLowerCase())).map(seed=>({id:seed.id,name:seed.name,type:seed.type}));trace.push({tool:'sample.resolve',arguments:input,result:{candidates,synthetic:true}});}results.push({...input,index,candidates,...(!candidates.length?{notice:'No reviewed match is available. Edit this favourite, or omit this catalogue book.'}:{})});}const resolutionId=randomUUID();this.resolutions.set(resolutionId,{mode:body.mode,results,trace:structuredClone(trace),createdAt:Date.now()});return{resolutionId,mode:body.mode,results,trace,notices:body.mode==='sample'?['All matches and tag-fit calculations in this mode are authored sample fixtures. No Qloo call was made.']:['Select the correct edition or entity for every favourite. Unmatched books can be omitted.']};}
  validatedChoices(body){
    const resolution=this.resolutions.get(body.resolutionId);if(!resolution||Date.now()-resolution.createdAt>30*60*1000)throw new AppError('This match review expired. Resolve your favourites again.',409);
    if(!Array.isArray(body.choices)||body.choices.length>9)throw new AppError('Review the proposed entity matches first.');
    const chosen=new Map();
    for(const choice of body.choices){
      if(!choice||typeof choice!=='object')throw new AppError('Review the proposed entity matches first.');
      const result=resolution.results.find(row=>row.index===choice.index);const entity=result?.candidates.find(candidate=>candidate.id===choice.entityId);
      if(!result||chosen.has(choice.index)||!entity)throw new AppError('A selected match was not offered in this review.');
      chosen.set(choice.index,structuredClone(entity));
    }
    const seedRows=resolution.results.filter(row=>row.purpose==='seed');if(seedRows.some(row=>!chosen.has(row.index)))throw new AppError('Every favourite needs a reviewed match. Resolve unknown titles before continuing.');
    const reviewedSeeds=seedRows.map(row=>({enteredQuery:row.query,entity:chosen.get(row.index)}));
    const books=resolution.results.filter(row=>row.purpose==='inventory'&&chosen.has(row.index)).map(row=>({inventoryId:row.inventoryId,enteredQuery:row.query,entityId:chosen.get(row.index).id,matchedEntity:chosen.get(row.index)}));
    if(!books.length)throw new AppError('Review at least one available catalogue match.');
    this.validateMappings(books);
    const identities=new Map();
    for(const entity of [...reviewedSeeds.map(seed=>seed.entity),...books.map(book=>book.matchedEntity)]){
      const key=entity.id.toLowerCase();const previous=identities.get(key);
      if(previous&&(previous.type!==entity.type||normalizeEntityName(previous.name)!==normalizeEntityName(entity.name)))throw new AppError('The reviewed matches contain conflicting identities for the same entity. Omit the ambiguous catalogue match or resolve again.');
      identities.set(key,entity);
    }
    return{mode:resolution.mode,seeds:reviewedSeeds,seedIds:reviewedSeeds.map(seed=>seed.entity.id),books,seedNames:reviewedSeeds.map(seed=>seed.entity.name),resolutionTrace:structuredClone(resolution.trace)};
  }
  validateMappings(books){
    const seen=new Map();
    for(const book of books){const id=book.entityId.toLowerCase();if(seen.has(id)&&seen.get(id)!==book.inventoryId)throw new AppError('Different catalogue books cannot share the same reviewed Qloo entity. Omit the ambiguous match and review again.');seen.set(id,book.inventoryId);}
  }
  criteria(body){const category=body.category??'all';if(category!=='all'&&!inventory.some(book=>book.category===category))throw new AppError('Choose a known shelf category.');const limit=body.limit??3;if(![3,5,6].includes(limit))throw new AppError('A list can contain 3, 5 or 6 books.');const excluded=body.excludeInventoryIds??[];if(!Array.isArray(excluded)||excluded.length>12||excluded.some(id=>!inventory.some(book=>book.id===id)))throw new AppError('Exclusions must refer to known shelf books.');return{category,limit,excludeInventoryIds:[...new Set(excluded)]};}
  async prepare(selection,criteria,oldId){
    this.validateMappings(selection.books);
    if(selection.mode==='qloo'&&(!selection.seeds?.length||!Array.isArray(selection.resolutionTrace)||selection.books.some(book=>!book.matchedEntity)))throw new AppError('This older draft does not retain reviewed Qloo identities. Resolve and review the favourites again before making a new live draft.',409);
    const books=selection.books.map(match=>({...inventory.find(book=>book.id===match.inventoryId),entityId:match.entityId,matchedEntity:match.matchedEntity})).filter(book=>book.availableCopies>0&&!criteria.excludeInventoryIds.includes(book.id)&&(criteria.category==='all'||book.category===criteria.category));
    if(!books.length)throw new AppError('No reviewed, available books meet these refinements. Broaden the category or remove an exclusion.');
    let ranked,rankingTrace,request=null,providerResponse=null;
    if(selection.mode==='qloo'){
      const result=await this.qloo.insights(selection.seedIds,books.map(book=>book.entityId));request=result.request;rankingTrace=[result.trace];providerResponse={entities:structuredClone(result.entities),requestId:result.requestId??null};
      ranked=result.entities.map(entity=>{
        const book=books.find(item=>item.entityId.toLowerCase()===entity.id.toLowerCase());
        if(!book||entity.name!==null&&normalizeEntityName(entity.name)!==normalizeEntityName(book.matchedEntity.name))throw new AppError('Qloo returned a catalogue name that differs from the reviewed entity. The result was not accepted; resolve and review that title again.',502);
        return{...book,evidence:{kind:'qloo',affinity:entity.affinity,entityId:entity.id,matchedEntity:structuredClone(book.matchedEntity),returnedEntity:structuredClone(entity),requestId:result.requestId??null},reason:'Returned by Qloo for your reviewed favourites, constrained to this available shelf.'};
      });
      if(!ranked.length)throw new AppError('Qloo returned no matching shelf books. No sample rankings were substituted. Try different favourites or a wider shelf.');
    }else{
      const tags=new Set(selection.seedIds.flatMap(id=>seeds.find(seed=>seed.id===id)?.tags??[]));
      ranked=books.map(book=>{const overlap=book.tags.filter(tag=>tags.has(tag));return{...book,evidence:{kind:'sample',sampleFit:overlap.length,entityId:book.entityId,matchedEntity:book.matchedEntity??null},reason:overlap.length?`Synthetic tag overlap: ${overlap.join(', ')}.`:'No shared fixture tags; retained as a shelf discovery option.'};}).sort((a,b)=>b.evidence.sampleFit-a.evidence.sampleFit||a.title.localeCompare(b.title));
      rankingTrace=[{tool:'sample.rank_available_shelf',arguments:{seedIds:selection.seedIds,criteria},result:{synthetic:true,ranked:ranked.map(book=>({id:book.id,sampleFit:book.evidence.sampleFit}))}}];
    }
    const items=ranked.slice(0,criteria.limit).map((book,index)=>({inventoryId:book.id,title:book.title,author:book.author,availableCopies:book.availableCopies,category:book.category,rank:index+1,reason:book.reason,evidence:book.evidence}));
    const provenance={mode:selection.mode,synthetic:selection.mode==='sample',seedNames:selection.seedNames,favourites:structuredClone(selection.seeds??[]),request,statement:selection.mode==='sample'?'Synthetic sample evidence; no Qloo ranking or personal preference inference.':'Actual Qloo response order; aggregate affinity is not proof of an individual preference.'};
    const resolutionTrace=structuredClone(selection.resolutionTrace??[]);const trace=[...resolutionTrace,...rankingTrace];
    const evidence={schemaVersion:1,resolutionTrace,rankingTrace:structuredClone(rankingTrace),reviewedSelection:structuredClone(selection),providerResponse,request};
    const draft=this.store.addDraft({mode:selection.mode,items,criteria,selection,provenance,evidence,trace,notices:items.length<criteria.limit?['Only '+items.length+' eligible result(s) are available.']:[]},oldId);
    return{draft,trace:structuredClone(draft.trace),notices:draft.notices,qualificationReady:false};
  }
  plan(body){return this.prepare(this.validatedChoices(body),this.criteria(body));}
  refine(body){const old=this.store.draft(body.draftId);if(old.status==='superseded')throw new AppError('This draft has been replaced. Refine the latest draft.',409);return this.prepare(old.selection,this.criteria({...old.criteria,...body}),old.id);}
}
