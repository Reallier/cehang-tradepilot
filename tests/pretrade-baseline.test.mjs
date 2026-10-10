import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture as riskFixture} from './risk-fixture.mjs';
import {fixture as historyFixture} from './history-fixture.mjs';
import {simulate} from '../server/risk.mjs';
import {hash} from '../server/integrity.mjs';
import {createBaseline,verifyBaseline,compareBaseline} from '../server/pretrade-baseline.mjs';
import {analyzeHistory} from '../server/history-audit.mjs';
function preview(){const f=riskFixture(),h=historyFixture(),t=h.evidence.collectedAt;f.now=Date.parse(t)-1000;f.input={...f.input,notional:100,leverage:5,hours:0};f.context.chain.gas.h=99;f.market.state.at={t:f.now,b:99};f.market.funding.at={t:f.now,b:90};f.book.at={t:f.now,b:99};return {id:'preview_synthetic',network:'testnet',createdAt:new Date(f.now+1).toISOString(),originalInput:f.input,inputHash:hash(f.input),context:f.context,book:f.book,snapshotHashes:{context:hash(f.context),book:hash(f.book)},result:simulate(f)};}
test('baseline recomputes exact model and compares filled size only with earlier matching snapshot',()=>{
 const p=preview(),b=createBaseline(p,Date.parse(p.result.createdAt)+100),h=historyFixture(),o=analyzeHistory(h).orders[0];verifyBaseline(b);const c=compareBaseline(b,h,o);assert.equal(c.status,'compared');assert.equal(c.priceDeviationBps,0);assert.equal(c.feeDelta,0);
});
test('late, changed, wrong-size and stale baselines cannot become proof',()=>{
 const p=preview();assert.throws(()=>createBaseline(p,Date.parse(p.result.createdAt)+46000),/45/);
 const b=createBaseline(p,Date.parse(p.result.createdAt)+100),h=historyFixture(),o=analyzeHistory(h).orders[0];
 h.evidence.histories['order-history'].pages[0].value.d[0].at.t=Date.parse(p.result.createdAt)-1;assert.equal(compareBaseline(b,h,o).status,'unavailable');
 h.evidence.histories['order-history'].pages[0].value.d[0].os=999;assert.equal(compareBaseline(b,h,o).status,'unavailable');
 b.evidence.preview.result.vwap=999;b.evidenceHash=hash(b.evidence);assert.throws(()=>verifyBaseline(b),/复算/);
});
