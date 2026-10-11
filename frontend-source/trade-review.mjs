import {hash} from '../server/integrity.mjs';
import {replayHistoryAudit} from '../server/history-audit.mjs';
import {tradeReviewPacket,replayTradeReview} from '../server/settlement-audit.mjs';
import {verifyBaseline,compareBaseline} from '../server/pretrade-baseline.mjs';
export function importTradeReview(input){
 if(input?.schema==='testnet-history-audit-v1'){replayHistoryAudit(input);return tradeReviewPacket(input.observation);}
 if(['testnet-trade-review-v2','testnet-trade-review-v3'].includes(input?.schema)){replayTradeReview(input);return input;}
 if(input?.schema==='trade-history-observation-v1')return tradeReviewPacket(input);
 throw new Error('请选择历史采集或成交核验文件，不要导入密钥');
}
export function workspaceReview(trade,baseline=null){
 replayTradeReview(trade);if(baseline)verifyBaseline(baseline);
 const comparisons=baseline?trade.report.opening.orders.map(o=>compareBaseline(baseline,trade.observation,o)):[];
 return {schema:'account-trade-workspace-v1',trade,baseline,comparisons};
}
export function replayWorkspaceReview(record){const reproduced=workspaceReview(record.trade,record.baseline);if(hash(reproduced)!==hash(record))throw new Error('账户成交复盘无法重现');return {status:'reproduced',opening:record.trade.report.opening.orders.map(o=>o.status),closed:record.trade.report.closed.map(o=>o.status),comparisons:record.comparisons.map(c=>c.status)};}
