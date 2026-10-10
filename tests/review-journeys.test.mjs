import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedReview} from '../server/guided-review.mjs';
import {reviewJourneys,reviewNumber} from '../frontend-source/review-journeys.mjs';
import {replayWorkspaceReview} from '../frontend-source/trade-review.mjs';

test('verified case links its own baseline and settlement without deducting slippage twice',()=>{
 const p=guidedReview();replayWorkspaceReview(p);const {items,unlinked}=reviewJourneys(p),j=items[0];
 assert.equal(items.length,1);assert.equal(unlinked.length,0);assert.equal(j.state,'closed');
 assert.equal(j.comparison.orderId,j.open.orderId);assert.equal(j.exits[0].orderId,19);
 assert.equal(j.durationMs,1000);assert.equal(j.direction,'多头');
 assert.deepEqual(j.pnl,{price:10,funding:-.01,entryFee:.1,exitFee:.11,net:9.78});
 assert.ok(Math.abs(j.pnl.price+j.pnl.funding-j.pnl.entryFee-j.pnl.exitFee-j.pnl.net)<1e-12);
 assert.equal(j.comparison.adversePriceCost,.5);
});

test('projection never treats empty positions, failed checks, or multiple exits as settled',()=>{
 const p=guidedReview();p.trade.report.closed=[];assert.equal(reviewJourneys(p).items[0].state,'exit_missing');assert.equal(reviewJourneys(p).items[0].pnl,null);
 const q=guidedReview();q.trade.report.closed[0].status='mismatch';assert.equal(reviewJourneys(q).items[0].state,'review');assert.equal(reviewJourneys(q).items[0].pnl,null);
 const r=guidedReview();r.trade.report.closed.push(structuredClone(r.trade.report.closed[0]));assert.equal(reviewJourneys(r).items[0].state,'review');assert.equal(reviewJourneys(r).items[0].pnl,null);
});

test('presentation joins require unique account, market and position, not order or position alone',()=>{
 for(const field of ['accountId','marketId']){const p=guidedReview();p.trade.report.closed[0][field]=987;const result=reviewJourneys(p);assert.equal(result.unlinked.length,1);assert.equal(result.items[0].pnl,null);}
 const p=guidedReview();p.trade.report.opening.orders.push(structuredClone(p.trade.report.opening.orders[0]));assert.equal(reviewJourneys(p).unlinked.length,1);
 const q=guidedReview();q.trade.report.opening.orders.push({...structuredClone(q.trade.report.opening.orders[0]),accountId:987});q.comparisons.push({status:'unavailable',reason:'other account'});const result=reviewJourneys(q);assert.equal(result.items[0].exits.length,1);assert.equal(result.items[1].exits.length,0);assert.equal(result.items[1].comparison.status,'unavailable');
});

test('partial exit is explicitly partial and failed exit is associated only for investigation',()=>{
 const p=guidedReview();p.trade.report.closed[0].execution.partial=true;assert.equal(reviewJourneys(p).items[0].state,'partial');
 const q=guidedReview();q.trade.report.closed[0].execution=null;q.trade.report.closed[0].status='mismatch';q.trade.report.closed[0].realizedPnl=null;const result=reviewJourneys(q);assert.equal(result.items[0].exits.length,1);assert.equal(result.items[0].pnl,null);assert.equal(result.items[0].state,'review');
});

test('small nonzero amounts and unknown values stay distinguishable from zero',()=>{
 assert.equal(reviewNumber(0),'0');assert.equal(reviewNumber(-0),'0');
 for(const v of [null,undefined,NaN,Infinity,'0'])assert.equal(reviewNumber(v),'—');
 assert.equal(reviewNumber(.00000048685,8,{signed:true}),'+0.00000049');
 assert.equal(reviewNumber(1e-12,8,{signed:true}),'+1.0000e-12');
 assert.equal(reviewNumber(-.006734),'−0.006734');assert.equal(reviewNumber(10,6,{signed:true}),'+10');
});
