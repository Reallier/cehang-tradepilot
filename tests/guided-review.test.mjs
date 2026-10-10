import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedReview} from '../server/guided-review.mjs';
import {verifyObservation} from '../frontend-source/account-workflow.mjs';
import {replayWorkspaceReview} from '../frontend-source/trade-review.mjs';
import {hash} from '../server/integrity.mjs';
test('public guided case is synthetic, reproducible and carries earlier baseline with independently expected costs',async()=>{
 const p=guidedReview();assert.equal(p.trade.observation.classification,'synthetic_testnet_history');assert.equal(p.trade.observation.evidence.account.classification,'synthetic_account_observation');await verifyObservation(p.trade.observation.evidence.account);
 const r=replayWorkspaceReview(p);assert.deepEqual(r.comparisons,['compared']);assert.deepEqual(r.closed,['exit_reconciled']);assert.equal(p.trade.observation.evidence.account.report.positionCount,0);
 const c=p.comparisons[0];assert.equal(c.estimatedPrice,99.5);assert.equal(c.actualPrice,100);assert.equal(c.adversePriceCost,.5);assert.ok(Math.abs(c.feeDelta-.0005)<1e-12);
 assert.equal(p.trade.report.closed[0].realizedPnl,(10000000-10000-100000-110000)/1000000);
 assert.ok(Date.parse(p.baseline.evidence.savedAt)<p.trade.observation.evidence.histories['order-history'].pages[0].value.d[0].at.t);
});
test('changing synthetic result or the saved baseline does not become a valid exported review',()=>{
 const p=guidedReview();p.comparisons[0].actualPrice=123;assert.throws(()=>replayWorkspaceReview(p));
 const q=guidedReview();q.baseline.evidence.validUntil='2099-01-01T00:00:00.000Z';q.baseline.evidenceHash=hash(q.baseline.evidence);assert.throws(()=>replayWorkspaceReview(q));
});
