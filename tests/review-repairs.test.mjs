import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedReview} from '../server/guided-review.mjs';
import {hash} from '../server/integrity.mjs';
import {RuntimeDiagnostics} from '../server/runtime-diagnostics.mjs';
import {newExperiment,attachResearchEvidence,researchPacket,replayResearch} from '../frontend-source/research-workspace.mjs';
import {researchComparisonPacket,replayResearchComparison} from '../frontend-source/research-comparison.mjs';
import {researchPacket as oldResearch} from '../frontend-source/research-workspace-v2.mjs';
import {researchComparisonPacket as oldComparison} from '../frontend-source/research-comparison-v2.mjs';
import {createTestPlan as oldPlan} from '../frontend-source/testnet-plan-v1.mjs';
import {createTestPlan,replayTestPlan} from '../frontend-source/testnet-plan.mjs';
import {prepareExperiment} from '../frontend-source/experiment-plan.mjs';
import {researchTask} from '../frontend-source/research-tasks.mjs';
import {experimentProgress} from '../frontend-source/research-progress.mjs';
const complete=()=>attachResearchEvidence(newExperiment('long_full'),guidedReview());
const planned=()=>{const e=complete(),r=e.baseline.evidence.preview.result;e.plan={marketId:r.marketId,notional:r.input.notional,leverage:r.input.leverage,slippageBps:r.input.slippageBps};return e;};
test('fixed plans independently check all four baseline parameters without discarding valid settlement evidence',()=>{
 const e=planned(),good=researchPacket({experiments:[e]});assert.equal(good.report.rows[0].planMatch.status,'matched');assert.equal(good.report.syntheticVerified,1);
 for(const [key,value] of Object.entries({marketId:16,notional:10,leverage:2,slippageBps:50})){
  const bad=structuredClone(e);bad.plan[key]=value;const p=researchPacket({experiments:[bad]}),r=p.report.rows[0];
  assert.equal(r.state,'plan_mismatch');assert.equal(r.evidenceState,'verified');assert.equal(r.planMatch.differences[0].key,key);assert.equal(p.report.syntheticVerified,0);
  assert.equal(researchComparisonPacket(p.workspace).report.included,0);assert.equal(replayResearch(p).status,'reproduced');
  const progress=experimentProgress(bad,r);assert.equal(progress.comparison,'matched');assert.match(progress.next,/固定计划/);assert.ok(!progress.next.includes('基线未匹配'));
 }
});
test('test plan preparation restores exact constraints, current plan replay rejects rehashed parameter changes',()=>{
 const p=createTestPlan({marketId:16,notional:10,leverage:2,slippageBps:50});assert.equal(replayTestPlan(p).planned,6);
 const e=p.evidence.research.workspace.experiments.find(e=>e.kind==='short_full'),r=prepareExperiment(e,{notional:999,slippageBps:100,leverage:5});
 assert.equal(r.marketId,16);assert.equal(r.input.direction,'short');assert.equal(r.input.notional,10);assert.equal(r.input.leverage,2);assert.equal(r.input.slippageBps,50);
 for(const change of [q=>q.evidence.input.notional=20,q=>{q.evidence.research.workspace.experiments[0].plan.notional=20;q.evidence.research=researchPacket(q.evidence.research.workspace);}]){const q=structuredClone(p);change(q);q.evidenceHash=hash(q.evidence);assert.throws(()=>replayTestPlan(q));}
 assert.throws(()=>createTestPlan({marketId:16,notional:10,leverage:2,slippageBps:0}));
});
test('legacy plans, workspaces and comparisons reproduce original reports and restore without inventing constraints',()=>{
 const workspace={experiments:[complete()]},p=oldResearch(workspace),c=oldComparison(workspace),plan=oldPlan({marketId:16,notional:10,leverage:2,slippageBps:100});
 assert.equal(replayTestPlan(plan).planned,6);assert.equal(replayResearch(p).status,'reproduced');assert.equal(replayResearchComparison(c).included,1);
 for(const raw of [p,c]){const restored=researchTask('restore',{raw:JSON.stringify(raw)});assert.equal(restored.report.rows[0].planMatch.status,'not_declared');assert.equal(restored.report.syntheticVerified,1);assert.equal(researchPacket(restored.workspace).schema,'testnet-research-workspace-v3');}
 assert.equal(researchTask('merge',{workspace:{experiments:[]},raws:[JSON.stringify(p),JSON.stringify(c)]}).workspace.experiments.length,1);
});
const reader={store:{exists:()=>false},cooldowns:new Map()};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('concurrent diagnostic failures preserve both events and the latest request start',async()=>{
 let now=100;const d=new RuntimeDiagnostics({now:()=>now}),a=deferred(),b=deferred();const pa=assert.rejects(d.observe('testnet',()=>a.promise));now=200;const pb=assert.rejects(d.observe('testnet',()=>b.promise));
 now=300;b.reject(new Error('429'));await pb;now=400;a.reject(new Error('timeout'));await pa;const r=d.snapshot(reader).networks[1];assert.equal(r.events.length,2);assert.equal(r.consecutiveFailures,2);assert.equal(r.lastAttempt,200);assert.equal(r.lastError,'timeout');
});
test('concurrent diagnostic success is retained by later failure and later success resets only its own network',async()=>{
 for(const successFirst of [true,false]){
  let now=100;const d=new RuntimeDiagnostics({now:()=>now}),a=deferred(),b=deferred(),pa=d.observe('testnet',()=>a.promise),pb=assert.rejects(d.observe('testnet',()=>b.promise));
  await assert.rejects(d.observe('mainnet',async()=>{throw new Error('failed');}));
  now=200;if(successFirst){a.resolve({});await pa;}else{b.reject(new Error('failed'));await pb;}
  now=300;if(successFirst){b.reject(new Error('failed'));await pb;}else{a.resolve({});await pa;}
  const rows=d.snapshot(reader).networks,r=rows[1];assert.equal(r.events.length,2);assert.equal(r.lastSuccess,successFirst?200:300);assert.equal(r.consecutiveFailures,successFirst?1:0);assert.equal(rows[0].consecutiveFailures,1);
  for(let i=0;i<15;i++)await d.observe('testnet',async()=>({}));assert.equal(d.snapshot(reader).networks[1].events.length,12);
 }
});
