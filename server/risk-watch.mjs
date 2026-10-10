import {positionRisk,positionStampWithinSnapshot} from './risk.mjs';
import {hash} from './store.mjs';
import {positionExample} from './position-examples.mjs';
export const WATCH_VERSION='risk-watch-v1';
export const WATCH_STAGES=[{id:'healthy',label:'余量充足'},{id:'caution',label:'接近关注阈值'},{id:'at_risk',label:'低于维持保证金'},{id:'funding_unknown',label:'资金信息未知'},{id:'stale',label:'陈旧快照'},{id:'read_error',label:'读取失败'},{id:'not_observed',label:'仓位未出现在快照'},{id:'recovered',label:'恢复正常'}];
const identity=w=>({network:w.network,source:w.source,positionId:w.positionId,accountId:w.accountId,marketId:w.marketId,warningBufferPct:w.warningBufferPct});
const validIdentity=w=>['mainnet','testnet'].includes(w.network)&&['account','synthetic'].includes(w.source)&&[w.positionId,w.accountId,w.marketId].every(x=>Number.isSafeInteger(x)&&x>=0)&&Number.isFinite(w.warningBufferPct)&&w.warningBufferPct>=0&&w.warningBufferPct<=500&&(w.source!=='synthetic'||w.network==='testnet');
const stamp=(t,now)=>Number.isFinite(t)&&now-t<=45000&&t<=now+5000;
export function evaluateWatch(snapshot) {
 const {watch,feed,now}=snapshot;if(!validIdentity(watch)||!Number.isFinite(now))throw new Error('风险关注参数无效');
 const classification=watch.source==='synthetic'?'synthetic_position_risk':'observed_position_risk';
 const base={modelVersion:WATCH_VERSION,classification,network:watch.network,chainId:watch.network==='mainnet'?143:10143,positionId:watch.positionId,accountId:watch.accountId,
  marketId:watch.marketId,warningBufferPct:watch.warningBufferPct,evaluatedAt:new Date(now).toISOString(),state:'incomplete',reason:'观察证据不完整',risk:null,bufferPct:null,snapshotTime:null};
 if(feed.kind==='error')return {...base,state:'read_error',reason:feed.message};
 if(feed.kind==='unconfigured')return {...base,state:'unconfigured',reason:'未配置此网络的独立Perpl账户'};
 if(feed.kind!=='positions')throw new Error('观察快照类型无效');
 const time=feed.snapshotAt?.t,head=feed.context?.chain?.gas?.h;
 if(Number.isFinite(time))base.snapshotTime=new Date(time).toISOString();
 if(feed.context?.chain?.chain_id!==base.chainId||!Number.isSafeInteger(head))return {...base,reason:'上下文网络或链头不匹配'};
 if(!stamp(time,now)||!Number.isSafeInteger(feed.snapshotAt?.b)||feed.snapshotAt.b>head)return {...base,reason:'账户读取快照陈旧、未来时间或区块未被链头覆盖'};
 if(!feed.position)return {...base,state:'not_observed',reason:'此仓位未出现在本次开放仓位快照；不能据此认定已平仓或资金已释放'};
 const pos=feed.position,market=feed.context.markets?.find(m=>m.id===watch.marketId);
 if(pos.pid!==watch.positionId||pos.acc!==watch.accountId||pos.mkt!==watch.marketId||pos.st!==1||!market)return {...base,reason:'仓位身份、开放状态或市场无法匹配'};
 if(!stamp(market.state?.at?.t,now)||!Number.isSafeInteger(market.state?.at?.b)||market.state.at.b>head||!positionStampWithinSnapshot(pos.at,feed.snapshotAt))return {...base,reason:'市场陈旧或仓位最后更新与读取快照不一致'};
 let risk;try{risk=positionRisk(pos,market,feed.context,now,time);}catch(e){return {...base,reason:e.message};}
 if(risk.status==='incomplete')return {...base,risk,reason:'已应用资金或维持保证金信息未知'};
 const bufferPct=risk.marginBuffer/risk.maintenanceEstimate*100;
 if(!Number.isFinite(bufferPct))return {...base,risk,reason:'保证金比例不可计算'};
 const state=risk.status==='at_risk'?'at_risk':bufferPct<=watch.warningBufferPct?'caution':'healthy';
 return {...base,risk,bufferPct,state,reason:state==='at_risk'?'当前权益低于估算维持保证金':state==='caution'?'余量/维持额低于或等于用户关注阈值':'超过用户关注阈值'};
}
function sample(w,feed,now) {
 const snapshot=structuredClone({watch:identity(w),feed,now}),report=evaluateWatch(snapshot);
 return {snapshot,snapshotHash:hash(snapshot),report,reportHash:hash(report)};
}
function trimContext(context,marketId) {
 const market=context.markets.find(m=>m.id===marketId),instance=context.instances.find(i=>i.id===market?.instance_id),token=context.tokens.find(t=>t.id===instance?.collateral_token_id);
 return {chain:context.chain,markets:market?[market]:[],instances:instance?[instance]:[],tokens:token?[token]:[]};
}
function syntheticFeed(stage,now) {
 if(!WATCH_STAGES.some(s=>s.id===stage))throw new Error('合成观察阶段无效');
 if(stage==='read_error')return {kind:'error',message:'合成读取失败；没有实际接口错误'};
 const f=positionExample(stage==='funding_unknown'?'funding_unknown':'long'),delta=now-f.now;
 for(const at of [f.position.at,f.context.markets[0].state.at,f.context.markets[0].funding.at,f.snapshotAt])at.t+=delta;
 if(stage==='caution')f.context.markets[0].state.mrk=8800;
 if(stage==='at_risk')f.context.markets[0].state.mrk=8500;
 if(stage==='stale')f.snapshotAt.t=now-60000;
 return {kind:'positions',position:stage==='not_observed'?null:f.position,context:f.context,snapshotAt:f.snapshotAt,sources:[],syntheticStage:stage};
}
export class RiskWatch {
 constructor(store,perpl,{now=()=>Date.now()}={}){this.store=store;this.perpl=perpl;this.now=now;this.pending=new Map();}
 get(id){if(!/^watch_[a-f0-9-]{36}$/.test(id??''))throw new Error('关注ID无效');const w=this.store.get(id);if(w.schema!==WATCH_VERSION||!validIdentity(w))throw new Error('关注记录参数无效');return w;}
 list(network,source){if(!['mainnet','testnet'].includes(network)||!['account','synthetic'].includes(source))throw new Error('关注来源无效');return this.store.list('watch_').filter(w=>w.network===network&&w.source===source);}
 add(d){
  const w={network:d.source==='synthetic'?'testnet':d.network,source:d.source,positionId:d.positionId,accountId:d.accountId,marketId:d.marketId,warningBufferPct:d.warningBufferPct};
  if(!validIdentity(w))throw new Error('关注网络、仓位身份或阈值无效');
  const list=this.store.list('watch_');const duplicate=list.find(x=>!x.archivedAt&&x.network===w.network&&x.source===w.source&&x.accountId===w.accountId&&x.positionId===w.positionId);
  if(duplicate)return duplicate;
  if(list.filter(x=>!x.archivedAt).length>=12)throw new Error('最多启用12个关注仓位');
  return this.store.create('watch',{...w,schema:WATCH_VERSION,classification:w.source==='synthetic'?'synthetic_watch':'account_watch',archivedAt:null,history:[],events:[],lastGood:null});
 }
 async addObserved(d){
  if(!['mainnet','testnet'].includes(d.network)||!Number.isSafeInteger(d.positionId)||!Number.isSafeInteger(d.accountId))throw new Error('请选择账户开放仓位');
  const a=await this.perpl.account(d.network);if(!a.configured)throw new Error('尚未配置独立Perpl账户');
  const pos=a.positions.d.filter(p=>p.pid===d.positionId&&p.acc===d.accountId&&p.st===1);if(pos.length!==1)throw new Error('开放仓位不存在或不唯一');
  return this.add({...d,source:'account',marketId:pos[0].mkt});
 }
 update(id,{archived,warningBufferPct}){
  const w=this.get(id);if(archived!=null&&typeof archived!=='boolean')throw new Error('停止关注参数无效');
  const changed={...w,warningBufferPct:warningBufferPct??w.warningBufferPct,archivedAt:archived===true?new Date(this.now()).toISOString():archived===false?null:w.archivedAt};
  if(!validIdentity(changed))throw new Error('关注阈值应在0到500%');
  if(archived===false&&w.archivedAt){const active=this.store.list('watch_').filter(x=>!x.archivedAt);if(active.length>=12||active.some(x=>x.network===w.network&&x.source===w.source&&x.accountId===w.accountId&&x.positionId===w.positionId))throw new Error('达到关注上限或已有同一仓位的启用关注');}
  return this.store.save(id,changed);
 }
 acknowledge(id,eventId){const w=this.get(id);if(!Number.isSafeInteger(eventId)||!w.events.some(e=>e.id===eventId))throw new Error('状态记录不存在');return this.store.save(id,{...w,events:w.events.map(e=>e.id===eventId?{...e,acknowledgedAt:new Date(this.now()).toISOString()}:e)});}
 commit(id,feed,now){
  const w=this.get(id);if(w.archivedAt)return w;
  const s=sample(w,feed,now),previous=w.history.at(-1)?.report;
  const events=previous?.state===s.report.state?w.events:[...w.events,{id:(w.events.at(-1)?.id??0)+1,from:previous?.state??'unobserved',to:s.report.state,reason:s.report.reason,at:s.report.evaluatedAt,classification:s.report.classification,sampleHash:s.reportHash,acknowledgedAt:null}].slice(-30);
  return this.store.save(id,{...w,history:[...w.history,s].slice(-30),events,lastGood:['healthy','caution','at_risk'].includes(s.report.state)?s:w.lastGood,updatedAt:new Date(now).toISOString()});
 }
 async refresh(network,source,stage='healthy') {
  this.list(network,source);const key=`${network}_${source}`;
  if(this.pending.has(key))return this.pending.get(key);
  const job=this.performRefresh(network,source,stage).finally(()=>this.pending.delete(key));this.pending.set(key,job);return job;
 }
 async performRefresh(network,source,stage){
  const watches=this.list(network,source).filter(w=>!w.archivedAt),now=this.now();
  if(!watches.length)return {watches:this.list(network,source),cached:true,nextRefreshAt:null};
  if(source==='synthetic'){
   const feed=syntheticFeed(stage,now);for(const w of watches)this.commit(w.id,feed,now);
   return {watches:this.list(network,source),cached:false,nextRefreshAt:null};
  }
  const key=`watchbudget_${network}`,old=this.store.exists(key)?this.store.get(key):null;
  if(old?.nextRefreshAt>now)return {watches:this.list(network,source),cached:true,nextRefreshAt:old.nextRefreshAt};
  this.store.save(key,{nextRefreshAt:now+60000});
  let a,ctx,error;
  try{a=await this.perpl.account(network);if(a.configured){ctx=await this.perpl.context(network);if(!Array.isArray(a.positions?.d)||!Array.isArray(ctx.value?.markets)||!Array.isArray(ctx.value?.instances)||!Array.isArray(ctx.value?.tokens))throw new Error('账户或市场响应结构不完整');}}catch(e){error=e;}
  const evaluated=this.now();
  for(const w of watches){
   let feed;
   if(error)feed={kind:'error',message:String(error.message).slice(0,500)};
   else if(!a.configured)feed={kind:'unconfigured'};
   else{const positions=a.positions.d.filter(p=>p.pid===w.positionId&&p.acc===w.accountId&&p.st===1);feed=positions.length>1?{kind:'error',message:'账户快照内仓位身份重复'}:{kind:'positions',position:positions[0]??null,snapshotAt:a.positions.at,context:trimContext(ctx.value,w.marketId),sources:[...a.sources,ctx.source]};}
   this.commit(w.id,feed,evaluated);
  }
  return {watches:this.list(network,source),cached:false,nextRefreshAt:this.store.get(key).nextRefreshAt};
 }
 packet(id){const w=this.get(id),samples=[...w.history];if(w.lastGood&&!samples.some(s=>s.reportHash===w.lastGood.reportHash))samples.unshift(w.lastGood);return {schema:WATCH_VERSION,classification:w.classification,watch:identity(w),watchId:w.id,samples,events:w.events};}
}
export function replayWatch(packet) {
 if(packet.schema!==WATCH_VERSION||!validIdentity(packet.watch)||packet.classification!==(packet.watch.source==='synthetic'?'synthetic_watch':'account_watch')||!Array.isArray(packet.samples)||!packet.samples.length)throw new Error('需要至少一次观察的完整风险证据');
 for(const s of packet.samples){
  if(hash(s.snapshot)!==s.snapshotHash||hash(s.report)!==s.reportHash)throw new Error('风险观察证据哈希不一致');
  for(const key of ['network','source','positionId','accountId','marketId'])if(s.snapshot.watch[key]!==packet.watch[key])throw new Error('风险观察身份不一致');
  if(hash(evaluateWatch(s.snapshot))!==s.reportHash)throw new Error('风险观察完整结果复算不一致');
 }
 return {model:WATCH_VERSION,status:'reproduced',classification:packet.classification,samples:packet.samples.length,checked:'observation results, thresholds, identities and unknown values; event acknowledgement is local UI state'};
}
