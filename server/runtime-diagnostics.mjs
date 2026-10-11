// Passive diagnostics: observing this endpoint never probes the upstream service.
export class RuntimeDiagnostics {
 constructor({now=()=>Date.now()}={}){this.now=now;this.startedAt=now();this.feeds=new Map();}
 async observe(network,operation){
  const start=this.now(),latest=()=>this.feeds.get(network)??{lastSuccess:null,failures:0,events:[]};
  try{const value=await operation(),at=this.now(),old=latest();const row={...old,lastAttempt:Math.max(start,old.lastAttempt??start),lastSuccess:at,lastError:null,failures:0,durationMs:at-start};
   row.events=[...old.events,{at,status:'success'}].slice(-12);this.feeds.set(network,row);return value;
  }catch(error){const at=this.now(),old=latest(),code=/451/.test(error.message)?'restricted_451':/403/.test(error.message)?'restricted_403':/429|冷却|预算/.test(error.message)?'cooldown':/timeout|超时/i.test(error.message)?'timeout':'unavailable';
   this.feeds.set(network,{...old,lastAttempt:Math.max(start,old.lastAttempt??start),lastError:code,failures:old.failures+1,durationMs:at-start,events:[...old.events,{at,status:code}].slice(-12)});throw error;
  }
 }
 snapshot(reader){const now=this.now();return {schema:'runtime-diagnostics-v1',observedAt:now,startedAt:this.startedAt,passive:true,process:'running',upstreamProbed:false,networks:['mainnet','testnet'].map(network=>{
  const feed=this.feeds.get(network),state=reader.store.exists(`restriction_${network}`)?reader.store.get(`restriction_${network}`):null,until=reader.cooldowns.get(network)??0;
  return {network,status:state?.blocked?'restricted':until>now?'cooldown':!feed?'not_observed':feed.lastError?'degraded':now-feed.lastSuccess>45000?'stale':'recent_success',lastAttempt:feed?.lastAttempt??null,lastSuccess:feed?.lastSuccess??null,ageMs:feed?.lastSuccess==null?null:now-feed.lastSuccess,cooldownUntil:until>now?until:null,restrictionStatus:state?.blocked?state.status??null:null,lastError:feed?.lastError??null,consecutiveFailures:feed?.failures??0,durationMs:feed?.durationMs??null,events:feed?.events??[]};
 }),note:'进程存活与行情可用性分开。仅汇总本进程已有市场读取，不主动发起请求；成功时间不是行情价格时间，不代表账户安全。'};}
}
