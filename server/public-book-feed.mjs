import {readTestnetBookSnapshot} from './testnet-book-snapshot.mjs';

// One shared feed per server process. No per-visitor sockets or automatic source fallback.
export class PublicBookFeed {
 constructor(reader,{snapshot=readTestnetBookSnapshot,now=()=>Date.now()}={}){
  this.reader=reader;this.snapshot=snapshot;this.now=now;this.cache=new Map();this.pending=new Map();
 }
 async read(network,marketId){
  if(!['mainnet','testnet'].includes(network)||!Number.isSafeInteger(marketId)||marketId<1)throw new Error('盘口参数无效');
  const restriction=this.reader.store.exists(`restriction_${network}`)?this.reader.store.get(`restriction_${network}`):null;
  if(restriction?.blocked)throw new Error('协议访问已阻断，请核对限制状态');
  if((this.reader.cooldowns.get(network)??0)>this.now())throw new Error('协议请求冷却中，请稍后再试');
  if(network==='mainnet')return this.reader.cached(network,`/v1/market-data/${marketId}/book`,5000);
  const key=String(marketId),old=this.cache.get(key);
  if(old&&this.now()<old.until){if(old.error)throw old.error;return old.result;}
  if(this.pending.has(key))return this.pending.get(key);
  if(this.pending.size>=2){const e=new Error('盘口采集繁忙，请稍后再试');e.status=503;throw e;}
  const operation=Promise.resolve().then(()=>this.snapshot(this.reader,marketId)).then(result=>{
   this.remember(key,{result,until:this.now()+15000});return result;
  }).catch(error=>{
   this.remember(key,{error,until:this.now()+60000});throw error;
  }).finally(()=>this.pending.delete(key));
  this.pending.set(key,operation);return operation;
 }
 remember(key,value){
  this.cache.delete(key);this.cache.set(key,value);
  while(this.cache.size>64)this.cache.delete(this.cache.keys().next().value);
 }
}
