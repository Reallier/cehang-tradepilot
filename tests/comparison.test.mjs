import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePlans,replayComparison} from '../server/comparison.mjs';
import {fixture} from './risk-fixture.mjs';

function evidence(f,inputs){return {...comparePlans({...f,inputs}),id:'comparison_00000000-0000-4000-8000-000000000001'};}
test('same size and holding time: leverage changes margin, never price PnL or execution costs',()=>{
  const f=fixture(),a={...f.input,notional:50,leverage:2,shockPct:-5},b={...a,leverage:5};
  const record=evidence(f,[a,b]),[x,y]=record.results;
  assert.equal(x.createdAt,y.createdAt);assert.equal(x.bookTime,y.bookTime);
  assert.equal(x.margin,25);assert.equal(y.margin,10);
  assert.equal(x.entryFee,.05);assert.equal(x.exitFee,.0475);assert.equal(x.fundingEstimate,.1);
  assert.ok(Math.abs(x.netPnl-(-2.6975))<1e-12);
  for(const field of ['rawSize','vwap','notional','netPnl','entryFee','exitFee','fundingEstimate'])assert.equal(x[field],y[field]);
  assert.ok(y.liquidationEstimate>x.liquidationEstimate);
  assert.equal(replayComparison(record).status,'reproduced');
});
test('holding time retains funding sign and missing funding stays null in both plans',()=>{
  const f=fixture(),a={...f.input,notional:50,hours:1},b={...a,hours:4};
  const r=evidence(f,[a,b]);assert.equal(r.results[0].fundingEstimate,.05);assert.equal(r.results[1].fundingEstimate,.2);
  delete f.market.funding;const unknown=evidence(f,[a,b]);assert.ok(unknown.results.every(r=>r.netPnl===null&&r.fundingEstimate===null&&!r.riskPass));
  assert.equal(replayComparison(unknown).status,'reproduced');
});
test('incomplete depth and different directions keep distinct blockers, never aggregate as portfolio',()=>{
  const f=fixture(),r=evidence(f,[{...f.input,notional:2000},{...f.input,direction:'short',notional:50}]);
  assert.equal(r.results[0].depthComplete,false);assert.equal(r.results[1].depthComplete,true);
  assert.ok(r.results[0].blockers.some(b=>b.includes('深度')));assert.equal(r.results[1].input.direction,'short');
  assert.throws(()=>comparePlans({...f,inputs:[f.input]}),/两个/);
  assert.throws(()=>comparePlans({...f,inputs:[f.input,null]}),/无效/);
});
test('replay rejects changed snapshots, inputs, nonfinite/null costs, risk status and stress rows',()=>{
  const f=fixture(),record=evidence(f,[f.input,{...f.input,notional:50}]);
  for(const mutate of [r=>r.book.ask[0].p++,r=>r.originalInput[0].leverage++,r=>r.results[0].netPnl=null,
    r=>r.results[0].entryFee='0.21',r=>r.results[0].entryFee=NaN,r=>r.results[0].riskPass=!r.results[0].riskPass,
    r=>r.results[0].stressRows[0].netPnl++,r=>r.results[0].blockers=[],r=>r.modelVersion='future-model']){
    const bad=structuredClone(record);mutate(bad);assert.throws(()=>replayComparison(bad));
  }
});
