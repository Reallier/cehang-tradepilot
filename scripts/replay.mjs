import fs from 'node:fs';
import {simulate} from '../server/risk.mjs';
import {hash} from '../server/store.mjs';
import {replayComparison} from '../server/comparison.mjs';
import {AUDIT_VERSION,replayAudit} from '../server/execution-audit.mjs';
import {EXIT_VERSION,replayExit} from '../server/position-exit.mjs';
import {WATCH_VERSION,replayWatch} from '../server/risk-watch.mjs';
const file=process.argv[2];if(!file)throw new Error('Usage: node scripts/replay.mjs /absolute/preview_record.json');
const record=JSON.parse(fs.readFileSync(file,'utf8'));
if(record.schema===WATCH_VERSION){console.log(JSON.stringify(replayWatch(record),null,2));process.exit(0);}
if(record.schema===EXIT_VERSION){console.log(JSON.stringify(replayExit(record),null,2));process.exit(0);}
if(record.schema===AUDIT_VERSION){console.log(JSON.stringify(replayAudit(record),null,2));process.exit(0);}
if(record.id?.startsWith('comparison_')){console.log(JSON.stringify(replayComparison(record),null,2));process.exit(0);}
if(!record.id?.startsWith('preview_')||!record.context||!record.book)throw new Error('需要完整预演证据JSON');
if(!record.originalInput||hash(record.originalInput)!==record.inputHash)throw new Error('预演输入哈希不一致或缺少原始输入');
if(hash(record.context)!==record.snapshotHashes?.context||hash(record.book)!==record.snapshotHashes?.book)throw new Error('公共快照哈希不一致');
const market=record.context.markets.find(m=>m.id===record.result.marketId);
const result=simulate({market,context:record.context,book:record.book,input:record.originalInput,now:Date.parse(record.createdAt),feeTier:record.result.feeTier});
const fields=['rawSize','vwap','notional','entryFee','exitFee','fundingEstimate','margin','netPnl','maintenanceEstimate','liquidationEstimate'];
for(const name of fields){const expected=record.result[name],actual=result[name];if(expected==null?actual!==null:Math.abs(actual-expected)>Math.max(1e-9,Math.abs(expected)*1e-12))throw new Error(`复算不一致: ${name}`);}
console.log(JSON.stringify({id:record.id,model:result.modelVersion,status:'reproduced',checked:fields},null,2));
