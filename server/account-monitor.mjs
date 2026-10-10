import {replayAccount} from './account-verification.mjs';

export function retryPolicy(error,failures,now,cooldownUntil=0){
 const message=String(error?.message??'');
 const code=/429/.test(message)?'RATE_LIMITED':/401|403|451|限制|READINESS|IDENTITY|INVALID|MISMATCH/.test(message)?'ACCESS_OR_VALIDATION_STOP':'READ_FAILED';
 const status=/返回\s*(\d{3})/.exec(message)?.[1];
 const known=['WALLET_IDENTITY_MISMATCH','NETWORK_OR_HEAD_INVALID','ACCOUNT_SCHEMA_INVALID','ACCOUNT_IDENTITY_OR_BALANCE_INVALID','POSITION_IDENTITY_INVALID','POSITION_INSTANCE_MISMATCH','POSITION_STAMP_INVALID','POSITION_EVENT_NOT_SNAPSHOT','POSITION_VALUES_INVALID','SNAPSHOT_STAMP_INVALID','MONITOR_IDENTITY_OR_TIME_INVALID','ACCOUNT_REPLAY_MISMATCH','READINESS_STOP'];
 const detail=status?`UPSTREAM_${status}`:known.includes(message)?message:code;
 const retry=code!=='ACCESS_OR_VALIDATION_STOP'&&failures<3;
 // Stopping automatic retries must not erase the earliest permitted manual retry.
 const nextAttemptAt=code==='ACCESS_OR_VALIDATION_STOP'?null:new Date(Math.max(now+60000*2**(failures-1),cooldownUntil)).toISOString();
 return {code,detail,state:retry?'backoff':'stopped',nextAttemptAt};
}

// One sequential caller per monitor. Retry times survive process restarts.
export class AccountMonitor{
 constructor({collect,now=()=>Date.now(),cooldownUntil=()=>0,initial=null}){
  this.collect=collect;this.now=now;this.cooldownUntil=cooldownUntil;this.busy=false;
  this.value=initial??{schema:'account-monitor-v1',state:'idle',code:null,failures:0,packet:null,previous:null,lastAttemptAt:null,lastSuccessAt:null,nextAttemptAt:null};
 }
 async step(){
  if(this.busy||this.value.state==='stopped'||Date.parse(this.value.nextAttemptAt)>this.now())return this.value;
  this.busy=true;this.value={...this.value,lastAttemptAt:new Date(this.now()).toISOString()};
  try{
   const packet=await this.collect();replayAccount(packet);
   const previous=this.value.packet;
   if(previous&&(previous.snapshot.expectedWallet.toLowerCase()!==packet.snapshot.expectedWallet.toLowerCase()||packet.snapshot.now<=previous.snapshot.now))throw new Error('MONITOR_IDENTITY_OR_TIME_INVALID');
   this.value={...this.value,state:'observing',code:null,detail:null,failures:0,previous,packet,lastSuccessAt:new Date(this.now()).toISOString(),nextAttemptAt:new Date(this.now()+60000).toISOString()};
  }catch(error){const failures=this.value.failures+1;this.value={...this.value,failures,...retryPolicy(error,failures,this.now(),this.cooldownUntil())};}
  finally{this.busy=false;}
  return this.value;
 }
 stop(){this.value={...this.value,state:'stopped'};return this.value;}
}
