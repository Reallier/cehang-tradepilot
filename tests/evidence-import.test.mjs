import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedReview} from '../server/guided-review.mjs';
import {portfolioExample} from '../server/portfolio-example.mjs';
import {portfolioPacket} from '../server/portfolio-risk.mjs';
import {hash} from '../server/integrity.mjs';
import {tradeReviewPacket} from '../server/settlement-audit.mjs';
import {prepareEvidence,parseEvidence} from '../frontend-source/evidence-import.mjs';
import {evidenceGaps,importFailure,checkGuidance,checkLabel,baselineGuidance} from '../frontend-source/evidence-guidance.mjs';
import {positionScenario,reviewObservation} from '../frontend-source/account-workflow.mjs';
const rehash=p=>(p.evidenceHash=hash(p.evidence),p);
test('all account exports reopen with original selections and verified scenario; source is unchanged',async()=>{
 const o=portfolioExample(),before=JSON.stringify(o),scenario=positionScenario(o,2,1,20),review=reviewObservation(o,2,1);
 const p=await prepareEvidence({schema:'account-workflow-review-v1',observation:o,scenario,review});
 assert.equal(p.view,'stress');assert.equal(p.selection,'1:2');assert.equal(p.shock,20);
 const q=await prepareEvidence(portfolioPacket(o,-20));assert.equal(q.shock,-20);assert.equal(q.view,'overview');
 assert.equal((await prepareEvidence(o)).kind,'workspace');assert.equal(JSON.stringify(o),before);
});
test('baseline import is separate; explicit workspace null clears previous baseline while raw history preserves it',async()=>{
 const workspace=guidedReview();assert.equal((await prepareEvidence(workspace.baseline)).kind,'baseline');
 const result=await prepareEvidence(workspace);assert.equal(result.replaceBaseline,true);assert.equal(result.baseline,workspace.baseline);
 const {workspaceReview}=await import('../frontend-source/trade-review.mjs');const empty=workspaceReview(workspace.trade,null);
 assert.equal((await prepareEvidence(empty)).baseline,null);assert.equal((await prepareEvidence(empty)).replaceBaseline,true);
 const raw=await prepareEvidence(workspace.trade.observation);assert.equal(raw.replaceBaseline,false);assert.equal(raw.view,'review');
});
test('malformed, oversized, unsupported and rehashed forged evidence never becomes a replacement; diagnostics do not echo file content',async()=>{
 for(const v of [null,[],{apiKey:'secret-do-not-echo'},{schema:'unrecognized-secret'}])await assert.rejects(prepareEvidence(v),/UNSUPPORTED_EVIDENCE/);
 await assert.rejects(parseEvidence('{}',4*1024*1024+1),/FILE_TOO_LARGE/);
 try{await parseEvidence('{"secret":"do-not-echo" invalid}');assert.fail('must reject');}catch(e){const g=importFailure(e);assert.equal(g.code,'INVALID_JSON');assert.ok(!JSON.stringify(g).includes('do-not-echo'));}
 const p=portfolioPacket(portfolioExample(),10);p.report.groups[0].totals.deltaPnl=999;p.reportHash=hash(p.report);await assert.rejects(prepareEvidence(p));
 assert.equal(importFailure(new Error('UNRECOGNIZED secret-data')).code,'IMPORT_FAILED');assert.ok(!JSON.stringify(importFailure(new Error('UNRECOGNIZED secret-data'))).includes('secret-data'));
});
test('missing receipts remain incomplete with specific remediation, not successful imported trade claims',async()=>{
 const p=guidedReview().trade.observation;p.evidence.chain.pop();p.evidence.receiptCoverageComplete=false;
 const result=await prepareEvidence(rehash(p)),r=result.trade.report.closed[0];
 assert.notEqual(r.status,'exit_reconciled');assert.equal(r.realizedPnl,null);assert.equal(r.reason,'UNIQUE_RECEIPT');
 assert.ok(evidenceGaps(result.trade).gaps.some(g=>g.code==='RECEIPT_COVERAGE'));
 assert.match(checkGuidance(r.reason).title,/回执/);assert.match(checkGuidance(r.reason).next,/只读/);
});
test('pagination gaps, unsupported lifecycles and unprocessed orders have distinct guidance',()=>{
 const p=guidedReview().trade.observation,e=p.evidence;
 e.histories['position-history'].complete=false;e.histories['position-history'].pages[0].value.np='next';
 const orders=e.histories['order-history'].pages[0].value.d,base=orders[0];
 orders.push({...base,oid:100,t:99},{...base,oid:101,st:1},{...base,oid:102,fs:0});
 const trade=tradeReviewPacket(rehash(p)),g=evidenceGaps(trade);
 for(const code of ['HISTORY_PAGES','UNSUPPORTED_ORDERS','NONTERMINAL_ORDERS','NO_FILLED_SIZE','ORDER_CHECKS'])assert.ok(g.gaps.some(g=>g.code===code),code);
 assert.equal(g.orderCount,5);assert.equal(g.checkedCount,2);assert.equal(trade.report.closed[0].realizedPnl,null);
 assert.match(checkGuidance('SINGLE_OPEN_SINGLE_EXIT_LIFECYCLE').next,/不能删掉/);
 const valid=guidedReview().trade;assert.equal(evidenceGaps(valid).gaps.length,0);
});
test('baseline errors cannot suggest backdating and passed checks have neutral labels',()=>{
 const b=guidedReview().baseline;
 assert.match(baselineGuidance(null,null).next,/不能.*补造/);
 assert.equal(baselineGuidance({status:'unavailable',reason:'基线未早于成交或已超过两分钟关联窗口，不能事后补造'},b).code,'BASELINE_WINDOW');
 assert.equal(baselineGuidance({status:'unavailable',reason:'网络、市场、方向、原始数量或杠杆不同'},b).code,'BASELINE_PARAMETERS');
 assert.equal(baselineGuidance({status:'compared'},b),null);
 for(const r of [...guidedReview().trade.report.opening.orders,...guidedReview().trade.report.closed])for(const c of r.checks){assert.notEqual(checkLabel(c.id),'其他核验项',c.id);assert.doesNotMatch(checkLabel(c.id),/不一致|缺少|失败/);assert.notEqual(checkGuidance(c.id).code,'UNCLASSIFIED_CHECK');}
});
