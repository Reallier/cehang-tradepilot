import {replayResearch,researchPacket,attachResearchEvidence} from '../frontend-source/research-workspace.mjs';
import {researchComparisonPacket,replayResearchComparison} from '../frontend-source/research-comparison.mjs';
import {experimentProgress} from '../frontend-source/research-progress.mjs';
import {verifyReceiptTarget} from './receipt-selection.mjs';
// Offline composition only: no network, credentials, orders or baseline mutation.
export function archiveExperiment({workspace,history,experimentId,target,now=Date.now()}){
 replayResearch(workspace);verifyReceiptTarget(target);
 const next=structuredClone(workspace.workspace),index=next.experiments.findIndex(e=>e.id===experimentId);
 if(index<0)throw new Error('EXPERIMENT_NOT_FOUND');
 // A trade-workspace import can replace a baseline. Accept only raw history here.
 if(history?.schema!=='trade-history-observation-v1'||history.classification!=='private_testnet_history')throw new Error('PRIVATE_HISTORY_REQUIRED');
 const old=next.experiments[index];
 const current=old.trade?.observation.evidence.account.snapshot.expectedWallet;
 const incoming=history.evidence?.account?.snapshot?.expectedWallet;
 if(current&&current.toLowerCase()!==incoming?.toLowerCase())throw new Error('WALLET_CHANGED');
 const oldTime=old.trade?.observation.evidence.collectedAt,newTime=history.evidence?.collectedAt;
 if(oldTime&&Date.parse(newTime)<Date.parse(oldTime))throw new Error('OLDER_HISTORY');
 const id=`${target.accountId}:${target.marketId}:${target.openingOrderId}`;
 if(old.journeyId&&old.journeyId!==id)throw new Error('EXPERIMENT_TARGET_CHANGED');
 next.experiments[index]=attachResearchEvidence(old,history);
 next.experiments[index].journeyId=id;
 const research=researchPacket(next);replayResearch(research);
 const comparison=researchComparisonPacket(next);replayResearchComparison(comparison);
 const row=research.report.rows[index],progress=experimentProgress(next.experiments[index],row,now);
 const summary={schema:'testnet-acceptance-summary-v1',checkedAt:new Date(now).toISOString(),experimentId,target,
  state:row.state,progress,openedAt:row.journey.openedAt,closedAt:row.journey.closedAt,pnl:row.journey.pnl,
  baselineComparison:row.journey.comparison,comparisonIncluded:comparison.report.included,
  historyCollectedAt:history.evidence.collectedAt,note:'私有保存材料的离线复算；不是实时链状态。摘要不是独立证据，以研究工作区复算为准。'};
 return {research,comparison,summary};
}
