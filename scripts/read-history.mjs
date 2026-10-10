import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Store} from '../server/store.mjs';
import {HistoryReader,collectHistory} from '../server/trade-history.mjs';
import {accountReadiness} from '../server/account-readonly.mjs';
import {historyAuditPacket} from '../server/history-audit.mjs';
import {tradeReviewPacket} from '../server/settlement-audit.mjs';
try {
  const {values}=parseArgs({options:{config:{type:'string'},collect:{type:'boolean',default:false}}});
  if(!values.config)throw new Error('CONFIG_REQUIRED');
  const filename=path.resolve(values.config),config=JSON.parse(fs.readFileSync(filename,'utf8'));
  const relative=v=>{if(typeof v!=='string'||!v)throw new Error('CONFIG_PATH_MISSING');return path.resolve(path.dirname(filename),v);};
  const state=new Store(relative(config.stateDir)),reader=new HistoryReader(state);
  const eligibility=state.exists('eligibility_testnet')?state.get('eligibility_testnet'):null;
  const options={eligibility,expectedWallet:config.expectedWallet};
  const ready=accountReadiness({...options,keyConfigured:Boolean(reader.key('testnet'))});
  if(state.exists('restriction_testnet')&&state.get('restriction_testnet').blocked){ready.ready=false;ready.blockers.push('PROTOCOL_RESTRICTION_BLOCKED');}
  if(!values.collect||!ready.ready){console.log(JSON.stringify(ready));if(!ready.ready)process.exitCode=2;}
  else {
    const packet=await collectHistory(reader,options),output=new Store(relative(config.outputDir));
    const saved=output.create('trade_history',packet);
    const audit=output.create('history_audit',historyAuditPacket(saved));
    const review=output.create('trade_review',tradeReviewPacket(saved));
    console.log(JSON.stringify({status:'saved',recordId:saved.id,auditId:audit.id,reviewId:review.id,orderChecks:audit.report.orders.map(o=>o.status),privateOutput:true,historyCounts:Object.fromEntries(Object.entries(packet.evidence.histories).map(([k,v])=>[k,{count:v.pages.reduce((n,p)=>n+p.value.d.length,0),complete:v.complete}])),receipts:packet.evidence.chain.length}));
  }
}catch(e){const status=/返回 (\d{3})/.exec(e.message??'');console.error(JSON.stringify({status:'read_failed',code:status?`UPSTREAM_${status[1]}`:'HISTORY_READ_FAILED',retryAutomatically:false}));process.exitCode=1;}
