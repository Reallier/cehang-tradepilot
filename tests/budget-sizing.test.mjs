import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './risk-fixture.mjs';
import {comparePlans} from '../server/comparison.mjs';
import {simulate} from '../server/risk.mjs';
import {planDecision} from '../server/decision-metrics.mjs';
import {sizeByBudget,sizingSettings,sizingPacket,replaySizing} from '../server/budget-sizing.mjs';
import {hash} from '../server/integrity.mjs';

function data(change=()=>{}){
 const f=fixture();f.input={...f.input,notional:50,shockPct:-5};change(f);
 const comparison={...comparePlans({...f,inputs:[f.input,{...f.input,leverage:1}]}),id:'comparison_00000000-0000-4000-8000-000000000001'};
 return {f,comparison};
}
test('flat book budget boundary includes lot rounding, independent margin arithmetic and rejected neighbor',()=>{
 const {comparison}=data();const r=sizeByBudget(comparison,{maxMargin:20},{maxNotional:80});
 assert.equal(r.status,'range');assert.equal(r.max.result.size,.4);assert.equal(r.max.result.notional,40);assert.equal(r.max.result.margin,20);
 assert.equal(r.min.target,1);assert.ok(r.max.target>=40&&r.max.target<40.11);
 assert.equal(r.next.target,Number((r.max.target+.01).toFixed(2)));assert.equal(r.next.decision.status,'over_budget');
 assert.ok(r.evaluations<=70);
});
test('cent-grid search agrees with exhaustive model checks across depth, signed funding, directions and minimums',()=>{
 for(const direction of ['long','short'])for(const rate of [-300000,0,300000]){
  const {f,comparison}=data(f=>{
   f.input.direction=direction;f.input.shockPct=direction==='long'?-5:5;f.market.funding.rate=rate;
   f.market.config.min_settle_amount='1500000';
   f.book.ask=[{p:10000,s:20},{p:10050,s:30},{p:11000,s:100}];
   f.book.bid=[{p:9900,s:20},{p:9850,s:30},{p:9800,s:100}];
  });
  const limits={maxMargin:4,maxLoss:.7},pass=[];
  for(let cents=100;cents<=1200;cents++){
   const result=simulate({...f,input:{...f.input,notional:cents/100}});
   if(planDecision({results:[result]},limits).plans[0].status==='within_budget')pass.push(cents/100);
  }
  const r=sizeByBudget(comparison,limits,{maxNotional:12});
  if(pass.length){assert.equal(r.status,'range');assert.equal(r.min.target,pass[0]);assert.equal(r.max.target,pass.at(-1));assert.equal(pass.length,Math.round((pass.at(-1)-pass[0])*100)+1);}
  else assert.equal(r.status,'none');
 }
});
test('missing inputs, stale data, model blockers, smallest lot, depth and empty budgets stay explicit',()=>{
 const run=(change,limits={maxMargin:1e6},maxNotional=80)=>sizeByBudget(data(change).comparison,limits,{maxNotional});
 assert.equal(run(()=>{},{maxLoss:0}).status,'none');
 assert.equal(run(()=>{},{}).status,'unset');
 assert.equal(run(f=>delete f.market.funding).status,'unknown');
 for(const change of [f=>f.market.config.is_open=false,f=>f.market.state.at.t-=46000,f=>f.input.leverage=20])assert.equal(run(change).status,'none');
 assert.equal(run(f=>f.market.config.min_settle_amount='100000000').status,'none');
 assert.equal(run(f=>{f.market.config.size_decimals=0;f.input.notional=100;},{maxMargin:1000},80).status,'none');
 const thin=run(f=>{f.book.ask=[{p:10000,s:20}];});assert.equal(thin.status,'range');assert.equal(thin.max.result.size,.02);assert.equal(thin.next.result.depthComplete,false);
 const capped=run(()=>{},{maxMargin:1000},10.01);assert.equal(capped.max.target,10.01);assert.equal(capped.next,null);
 const zeroLoss=run(f=>{f.input.direction='short';f.input.shockPct=-10;},{maxLoss:0});assert.equal(zeroLoss.status,'range');
});
test('base B keeps its own leverage; no upper budget is invented; settings round down reproducibly',()=>{
 const {comparison}=data();const limits={maxMargin:20};
 const b=sizeByBudget(comparison,limits,{baseIndex:1,maxNotional:80});assert.equal(b.max.result.notional,20);assert.equal(b.fixed.leverage,1);
 for(const n of [1.13,10.01,80.29,10000000]){const s=sizingSettings({maxNotional:n});assert.deepEqual(sizingSettings(s),s);assert.equal(s.maxNotional,n);}
 assert.equal(sizingSettings({maxNotional:'10.019'}).maxNotional,10.01);
 for(const v of [true,null,0,Infinity,'',1e8])assert.throws(()=>sizingSettings({maxNotional:v}));
 assert.throws(()=>sizingSettings({baseIndex:2,maxNotional:100}));
});
test('search is bounded at largest cap; replay rejects source, boundary and budget tampering even after rehash',()=>{
 const {comparison}=data();const packet=sizingPacket(comparison,{maxMargin:20},{maxNotional:1e7});
 assert.ok(packet.report.evaluations<=70);assert.equal(replaySizing(packet).status,'reproduced');
 for(const mutate of [p=>p.report.max.result.margin=0,p=>p.report.max.target+=.01,p=>p.evidence.limits.maxMargin=100,p=>p.evidence.comparison.results[0].netPnl=100]){
  const bad=structuredClone(packet);mutate(bad);bad.evidenceHash=hash(bad.evidence);bad.reportHash=hash(bad.report);assert.throws(()=>replaySizing(bad));
 }
});
