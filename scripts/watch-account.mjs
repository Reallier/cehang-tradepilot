import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {setTimeout as sleep} from 'node:timers/promises';
import {Store} from '../server/store.mjs';
import {acquireLock} from '../server/lock.mjs';
import {AccountReader,accountReadiness,collectAccount} from '../server/account-readonly.mjs';
import {AccountMonitor} from '../server/account-monitor.mjs';

let release,monitor,write,stopping=false;
try{
 const {values}=parseArgs({options:{config:{type:'string'},cycles:{type:'string',default:'15'}}});
 const cycles=Number(values.cycles);if(!values.config||!Number.isInteger(cycles)||cycles<1||cycles>30)throw new Error('CONFIG_REQUIRED');
 const filename=path.resolve(values.config),config=JSON.parse(fs.readFileSync(filename,'utf8'));
 const relative=v=>{if(typeof v!=='string'||!v)throw new Error('CONFIG_REQUIRED');return path.resolve(path.dirname(filename),v);};
 const stateDir=relative(config.stateDir),output=path.join(relative(config.outputDir),'monitor');
 fs.mkdirSync(output,{recursive:true,mode:0o700});fs.chmodSync(output,0o700);release=acquireLock(output);
 const reader=new AccountReader(new Store(stateDir)),file=path.join(output,'latest.json');
 const initial=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 // A fresh manual invocation can resume a stopped run, but must retain its cooldown.
 const restored=initial?{...initial,state:initial.state==='stopped'?'idle':initial.state,failures:0}:null;
 const readEligibility=()=>JSON.parse(fs.readFileSync(path.join(stateDir,'eligibility_testnet.json'),'utf8'));
 monitor=new AccountMonitor({initial:restored,cooldownUntil:()=>reader.cooldowns.get('testnet')??0,collect:async()=>{
  const eligibility=readEligibility();
  if(!accountReadiness({eligibility,expectedWallet:config.expectedWallet,keyConfigured:Boolean(reader.key('testnet'))}).ready)throw new Error('READINESS_STOP');
  return collectAccount(reader,{eligibility,expectedWallet:config.expectedWallet,contextCatchUp:true});
 }});
 const outputStore=new Store(output);write=()=>outputStore.save('latest',monitor.value);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopping=true;});
 const deadline=Date.now()+30*60000;
 for(let i=0;i<cycles&&!stopping&&Date.now()<deadline;i++){
  while(Date.parse(monitor.value.nextAttemptAt)>Date.now()&&!stopping&&Date.now()<deadline)await sleep(Math.min(1000,Date.parse(monitor.value.nextAttemptAt)-Date.now()));
  if(stopping||Date.now()>=deadline)break;
  await monitor.step();write();
  console.log(JSON.stringify({cycle:i+1,state:monitor.value.state,code:monitor.value.code,detail:monitor.value.detail,privateOutput:true}));
  if(monitor.value.state==='stopped')break;
 }
 monitor.stop();write();
}catch{console.error(JSON.stringify({state:'stopped',code:'MONITOR_CONFIG_OR_STORAGE_ERROR'}));process.exitCode=1;}
finally{release?.();}
