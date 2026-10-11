import {PORTFOLIO_SCHEMA,replayPortfolio} from '../server/portfolio-risk.mjs';
import fs from 'node:fs';
import {SIZING_SCHEMA,replaySizing} from '../server/budget-sizing.mjs';
import {replayPlanDecision} from '../server/plan-decision.mjs';
import {replayWorkspaceReview} from '../frontend-source/trade-review.mjs';
import {simulate} from '../server/risk.mjs';
import {hash} from '../server/store.mjs';
import {replayComparison} from '../server/comparison.mjs';
import {AUDIT_VERSION,replayAudit} from '../server/execution-audit.mjs';
import {EXIT_VERSION,replayExit} from '../server/position-exit.mjs';
import {WATCH_VERSION,replayWatch} from '../server/risk-watch.mjs';
import {ACCOUNT_SCHEMA,replayAccount} from '../server/account-readonly.mjs';
import {replayWorkflow} from '../frontend-source/account-workflow.mjs';
import {HISTORY_AUDIT_SCHEMA,replayHistoryAudit} from '../server/history-audit.mjs';
import {TRADE_REVIEW_SCHEMA,replayTradeReview} from '../server/settlement-audit.mjs';
import {BASELINE_SCHEMA,verifyBaseline} from '../server/pretrade-baseline.mjs';
const file=process.argv[2];if(!file)throw new Error('Usage: node scripts/replay.mjs /absolute/preview_record.json');
const record=JSON.parse(fs.readFileSync(file,'utf8'));
if(record.schema===SIZING_SCHEMA){console.log(JSON.stringify(replaySizing(record)));process.exit(0);}
if(record.schema===PORTFOLIO_SCHEMA){console.log(JSON.stringify(replayPortfolio(record)));process.exit(0);}
if(record.schema==='plan-decision-review-v1'){console.log(JSON.stringify(replayPlanDecision(record)));process.exit(0);}
if(record.schema==='account-trade-workspace-v1'){console.log(JSON.stringify(replayWorkspaceReview(record)));process.exit(0);}
if(record.schema===TRADE_REVIEW_SCHEMA){console.log(JSON.stringify(replayTradeReview(record)));process.exit(0);}
if(record.schema===BASELINE_SCHEMA){verifyBaseline(record);console.log(JSON.stringify({status:'reproduced',classification:'pretrade_baseline'}));process.exit(0);}
if(record.schema===HISTORY_AUDIT_SCHEMA){console.log(JSON.stringify(replayHistoryAudit(record),null,2));process.exit(0);}
if(record.schema==='account-workflow-review-v1'){console.log(JSON.stringify(await replayWorkflow(record),null,2));process.exit(0);}
if(record.schema===ACCOUNT_SCHEMA){console.log(JSON.stringify(replayAccount(record),null,2));process.exit(0);}
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
