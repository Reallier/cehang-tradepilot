import fs from 'node:fs';
import {replayAccount} from './account-verification.mjs';
export function localMonitor(config,filename){
 if(!filename||config.host!=='127.0.0.1'||config.secure||config.basePath||!config.origins.every(o=>['127.0.0.1','localhost'].includes(new URL(o).hostname)))return {available:false};
 if(!fs.existsSync(filename))return {available:false};
 const stat=fs.statSync(filename);if(!stat.isFile()||stat.size>9*1024*1024)throw new Error('INVALID_MONITOR');
 const v=JSON.parse(fs.readFileSync(filename,'utf8'));
 if(v.schema!=='account-monitor-v1'||!['idle','observing','backoff','stopped'].includes(v.state))throw new Error('INVALID_MONITOR');
 if(v.packet)replayAccount(v.packet);if(v.previous)replayAccount(v.previous);
 return {available:true,monitor:{schema:v.schema,state:v.state,code:['RATE_LIMITED','ACCESS_OR_VALIDATION_STOP','READ_FAILED'].includes(v.code)?v.code:null,detail:/^UPSTREAM_(401|403|429|451)$/.test(v.detail??'')?v.detail:null,lastAttemptAt:v.lastAttemptAt,lastSuccessAt:v.lastSuccessAt,nextAttemptAt:v.nextAttemptAt,packet:v.packet,previous:v.previous}};
}
