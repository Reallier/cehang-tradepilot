import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewProgress} from '../frontend-source/review-progress.mjs';
import {guidedReview} from '../server/guided-review.mjs';
import {tradeReviewPacket} from '../server/settlement-audit.mjs';
import {createBaseline} from '../server/pretrade-baseline.mjs';
import {hash} from '../server/integrity.mjs';

test('navigation without evidence never implies an execution; a baseline alone is not a trade',()=>{
 const b=guidedReview().baseline;
 assert.deepEqual(reviewProgress(null,b),{trade:false,synthetic:false,matched:0,closed:0});
});
test('synthetic complete case retains classification and only its matching baseline counts',()=>{
 const p=guidedReview();
 assert.deepEqual(reviewProgress(p.trade,p.baseline),{trade:true,synthetic:true,matched:1,closed:1});
 assert.deepEqual(reviewProgress(p.trade,null),{trade:true,synthetic:true,matched:0,closed:1});
 const late=createBaseline(p.baseline.evidence.preview,Date.parse(p.baseline.evidence.savedAt)+20000);
 assert.equal(reviewProgress(p.trade,late).matched,0);
});
test('missing receipt cannot count as completed; a forged progress report fails replay',()=>{
 const p=guidedReview(),o=p.trade.observation;
 o.evidence.chain.pop();o.evidence.receiptCoverageComplete=false;o.evidenceHash=hash(o.evidence);
 const trade=tradeReviewPacket(o);
 assert.equal(reviewProgress(trade,p.baseline).closed,0);
 trade.report.closed[0].status='exit_reconciled';
 assert.throws(()=>reviewProgress(trade,p.baseline));
});
