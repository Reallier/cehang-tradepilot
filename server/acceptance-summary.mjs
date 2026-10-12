import {replayResearch} from '../frontend-source/research-workspace.mjs';
import {workspaceReview} from '../frontend-source/trade-review.mjs';
import {reviewJourneys} from '../frontend-source/review-journeys.mjs';
// Public output is an explicit aggregate allowlist. Never spread source evidence.
export function acceptanceSummary(packets,reviewedOn){
 if(!Array.isArray(packets)||!packets.length||packets.length>20||!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn))throw new Error('Invalid acceptance input');
 const unique=new Map();
 for(const p of packets){replayResearch(p);
  for(const e of p.workspace.experiments){if(!e.trade)continue;
   const o=e.trade.observation;if(o.classification!=='private_testnet_history'||o.evidence.account.report.chainId!==10143)throw new Error('Only private testnet archives may contribute');
   for(const j of reviewJourneys(workspaceReview(e.trade,e.baseline)).items){
    if(j.state!=='closed'||j.open.status!=='opening_reconciled')continue;
    if(!['多头','空头'].includes(j.direction))throw new Error('Unknown trade direction');
    const key=JSON.stringify([10143,o.evidence.account.snapshot.expectedWallet.toLowerCase(),j.accountId,j.marketId,j.open.orderId,j.open.txHash]);
    const row={direction:j.direction,staged:j.exits.length>1,baselineMatched:j.comparison?.status==='compared'},old=unique.get(key);
    if(old&&(old.direction!==row.direction||old.staged!==row.staged))throw new Error('Conflicting lifecycle evidence');
    unique.set(key,{...row,baselineMatched:row.baselineMatched||!!old?.baselineMatched});
   }
  }
 }
 const rows=[...unique.values()];
 return {schema:'public-acceptance-summary-v1',reviewedOn,chainId:10143,source:'private_archive_replay',independentlyVerifiableFromSummary:false,
  counts:{closedLifecycles:rows.length,longFull:rows.filter(r=>r.direction==='多头'&&!r.staged).length,shortFull:rows.filter(r=>r.direction==='空头'&&!r.staged).length,stagedExits:rows.filter(r=>r.staged).length,baselineMatched:rows.filter(r=>r.baselineMatched).length},
  checks:['Saved receipt and REST identity consistency','Opening quantity and fees','Exit collateral, funding, fees and settlement','Earlier baseline association when available'],
  limitation:'Publisher-generated aggregate from replayed private archives. No raw account data, transaction identifiers or financial results. This summary alone is not an independently verifiable on-chain proof, current account state, finality proof or profitability claim.'};
}
