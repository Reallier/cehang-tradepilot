export const VAULT_LIMIT=3;
// Opt-in browser storage only. No credentials, network or automatic upload.
export function createResearchVault(indexedDB=globalThis.indexedDB,name='tradepilot-research:'+globalThis.location?.pathname){
 if(!indexedDB)throw new Error('当前浏览器不支持本机保存');
 function transaction(mode,fn){return new Promise((resolve,reject)=>{
  const request=indexedDB.open(name,1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots',{keyPath:'id'});
  request.onerror=()=>reject(new Error('无法打开本机研究存储'));
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('snapshots',mode),store=tx.objectStore('snapshots');let result;
   tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=tx.onabort=()=>{db.close();reject(new Error('本机保存失败或空间不足，当前页面仍保留材料'));};
   try{fn(store,value=>{result=value;});}catch(e){tx.abort();}
  };
 });}
 return {
  list:()=>transaction('readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result.sort((a,b)=>b.savedAt-a.savedAt));}),
  save:packet=>transaction('readwrite',(s,done)=>{const r=s.getAll();r.onsuccess=()=>{
   const old=r.result.sort((a,b)=>b.savedAt-a.savedAt);if(old[0]?.packet.workspaceHash===packet.workspaceHash){done(old[0]);return;}
   const item={id:crypto.randomUUID(),savedAt:Date.now(),packet};s.put(item);const distinct=old.filter(v=>v.packet.workspaceHash!==packet.workspaceHash);for(const v of old)if(v.packet.workspaceHash===packet.workspaceHash)s.delete(v.id);for(const v of distinct.slice(VAULT_LIMIT-1))s.delete(v.id);done(item);
  };}),
  clear:()=>transaction('readwrite',(s,done)=>{s.clear();done(true);})
 };
}
