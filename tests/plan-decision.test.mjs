import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './risk-fixture.mjs';
import {comparePlans} from '../server/comparison.mjs';
import {decisionLimits,planDecision,decisionPacket,alternativePreset} from '../server/decision-metrics.mjs';
import {replayPlanDecision} from '../server/plan-decision.mjs';
import {hash} from '../server/integrity.mjs';
function comparison(modify=()=>{}){const f=fixture();f.input={...f.input,notional:50,leverage:2,shockPct:-5};modify(f);return {...comparePlans({...f,inputs:[f.input,{...f.input,leverage:1}]}),id:'comparison_00000000-0000-4000-8000-000000000001'};}

test('budget and loss independently check same-snapshot plans; fees are counted once',()=>{
 const c=comparison(),r=planDecision(c,{maxMargin:30,maxLoss:3});const [a,b]=r.plans;
 assert.equal(a.status,'within_budget');assert.equal(b.status,'over_budget');
 assert.equal(a.totalCost,.1975);assert.ok(Math.abs(a.marginBuffer-(25-2.5-.05-.1-2.5))<1e-12);assert.ok(Math.abs(a.scenarioLoss-2.6975)<1e-12);
 assert.equal(a.scenarioLoss,b.scenarioLoss);assert.equal(a.totalCost,b.totalCost);assert.equal(a.coveragePct,100);
 assert.equal(b.checks[0].status,'exceeded');assert.equal(b.checks[1].status,'within');
 assert.equal(planDecision(c,{maxMargin:25,maxLoss:a.scenarioLoss}).plans[0].status,'within_budget');
 assert.equal(planDecision(c,{maxLoss:0}).plans[0].status,'over_budget');
});

test('funding income remains signed; profitable stress has zero scenario loss, not guaranteed safety',()=>{
 const c=comparison(f=>{f.input.direction='short';f.input.shockPct=-10;});const r=planDecision(c,{maxLoss:0}).plans[0];
 assert.ok(c.results[0].fundingEstimate<0);assert.ok(c.results[0].netPnl>0);assert.equal(r.scenarioLoss,0);assert.equal(r.checks[1].status,'within');
 const longer=comparison(f=>{f.input.direction='short';f.input.hours=168;f.input.shockPct=-10;});assert.ok(planDecision(longer).plans[0].totalCost<0);
});

test('missing funding or incomplete depth is unknown; model blockage cannot turn green from a loose budget',()=>{
 const unknown=comparison(f=>delete f.market.funding);const u=planDecision(unknown,{maxLoss:100}).plans[0];assert.equal(u.status,'unknown');assert.equal(u.totalCost,null);assert.equal(u.checks[1].status,'unknown');
 const shallow=comparison(f=>f.input.notional=2000),s=planDecision(shallow,{maxMargin:1e9,maxLoss:1e9}).plans[0];assert.equal(s.status,'unknown');assert.equal(s.checks[0].status,'unknown');assert.ok(s.coveragePct<100);
 const bad=comparison(f=>f.input.leverage=20);assert.equal(planDecision(bad,{maxMargin:1e9,maxLoss:1e9}).plans[0].status,'model_blocked');
 assert.equal(planDecision(comparison()).plans[0].status,'unconstrained');
});

test('constraints and quick alternatives preserve intent and reject invalid budgets',()=>{
 assert.deepEqual(decisionLimits({maxMargin:'',maxLoss:'0'}),{maxMargin:null,maxLoss:0});
 for(const x of [-1,NaN,Infinity,true,'   ','abc',1e10])assert.throws(()=>decisionLimits({maxLoss:x}));
 const a={notional:'100',leverage:'3',hours:'24'};
 assert.deepEqual(alternativePreset(a,'half'),{notional:50,leverage:3,hours:24});
 assert.deepEqual(alternativePreset(a,'leverage'),{notional:100,leverage:1.5,hours:24});
 assert.equal(alternativePreset({...a,leverage:1},'leverage').leverage,1);
 assert.deepEqual(alternativePreset(a,'same'),{notional:100,leverage:3,hours:24});
});

test('decision export reproduces full source and budgets; hashes alone cannot validate altered calculations',()=>{
 const packet=decisionPacket(comparison(),{maxMargin:30,maxLoss:3});assert.deepEqual(replayPlanDecision(packet).plans,['within_budget','over_budget']);
 for(const mutate of [p=>p.report.plans[0].scenarioLoss=0,p=>p.evidence.limits.maxLoss=0,p=>p.evidence.comparison.results[0].netPnl=100,p=>p.report.plans[1].status='within_budget']){
  const bad=structuredClone(packet);mutate(bad);bad.reportHash=hash(bad.report);bad.evidenceHash=hash(bad.evidence);assert.throws(()=>replayPlanDecision(bad));
 }
});
