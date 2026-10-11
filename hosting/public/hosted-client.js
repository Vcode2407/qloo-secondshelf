"use strict";
const hostedShelf=(()=>{
  const name='secondshelf-hosted-v1';let saved={drafts:[],lists:[],draftTokens:{},resolutionTokens:{}};
  try{const previous=JSON.parse(localStorage.getItem(name)||'null');if(previous&&Array.isArray(previous.drafts)&&Array.isArray(previous.lists)&&previous.draftTokens&&previous.resolutionTokens)saved=previous;}catch{}
  const persist=()=>{saved.drafts=saved.drafts.slice(-10);saved.lists=saved.lists.slice(-20);saved.draftTokens=Object.fromEntries(saved.drafts.filter(draft=>draft.status==='draft').map(draft=>[draft.id,saved.draftTokens[draft.id]]));try{localStorage.setItem(name,JSON.stringify(saved));}catch{document.querySelector('#planner-status').textContent='Browser storage is unavailable. Export this evidence before closing the page.';}};
  const remember=draft=>{saved.drafts=saved.drafts.filter(item=>item.id!==draft.id);saved.drafts.push(draft);};
  async function api(path,payload){
    if(path==='/api/lists')return structuredClone({drafts:saved.drafts,lists:saved.lists});
    if(payload){payload={...payload};if(path==='/api/plans')payload.resolutionToken=saved.resolutionTokens[payload.resolutionId];if(path==='/api/refine'||path==='/api/approve')payload.draftToken=saved.draftTokens[payload.draftId];}
    const response=await fetch(path,payload===undefined?{headers:{Accept:'application/json'}}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    let result;try{result=await response.json();}catch{throw new Error('The hosted planner returned an unreadable response.');}if(!response.ok)throw new Error(result.error||'The action could not be completed.');
    if(result.resolutionToken){saved.resolutionTokens={[result.resolutionId]:result.resolutionToken};}
    if(result.draft){if(path==='/api/refine'){const old=saved.drafts.find(d=>d.id===payload.draftId);if(old)old.status='superseded';}remember(result.draft);if(result.draftToken)saved.draftTokens[result.draft.id]=result.draftToken;}
    if(result.list)saved.lists.push(result.list);if(payload)persist();return result;
  }
  function csv(list){const cell=value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};const favourites=list.provenance?.favourites??[];return[['Title','Author','Available copies','Evidence mode','Rank','Affinity (Qloo only)','Sample tag fit (synthetic only)','Approved at','Qloo entity ID','Reviewed entity name','Returned entity name','Qloo request ID','Reviewed favourites (JSON)','Entered favourite queries (JSON)'],...list.items.map(item=>[item.title,item.author,item.availableCopies,list.mode,item.rank,item.evidence.affinity??'',item.evidence.sampleFit??'',list.approvedAt,item.evidence.kind==='qloo'?item.evidence.entityId??'':'',item.evidence.matchedEntity?.name??'',item.evidence.returnedEntity?.name??'',item.evidence.requestId??'',JSON.stringify(favourites),JSON.stringify(favourites.map(seed=>seed.enteredQuery))])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a');const match=anchor?.getAttribute('href')?.match(/^\/api\/export\/([a-f0-9-]+)\.(csv|json)$/);
    if(match){event.preventDefault();const list=saved.lists.find(item=>item.id===match[1]);if(!list)return;const blob=new Blob([match[2]==='csv'?csv(list):JSON.stringify(list,null,2)+'\n'],{type:match[2]==='csv'?'text/csv;charset=utf-8':'application/json'});const href=URL.createObjectURL(blob);const download=document.createElement('a');download.href=href;download.download=`secondshelf-approved-${match[2]==='csv'?'list.csv':'evidence.json'}`;download.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
    if(event.target.closest('#clear-saved')&&confirm('Clear this browser’s saved demonstration lists and drafts? Export any evidence you want to keep first.')){saved={drafts:[],lists:[],draftTokens:{},resolutionTokens:{}};persist();location.reload();}
  });
  return {api};
})();
async function api(path,payload){return hostedShelf.api(path,payload);}
