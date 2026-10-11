import test from 'node:test';import assert from 'node:assert/strict';
import {portfolioExample} from '../server/portfolio-example.mjs';
import {defaultScenario,portfolioScenario,portfolioScenarioPacket,replayPortfolioScenario} from '../server/portfolio-scenarios.mjs';
import {createTestPlan,replayTestPlan} from '../frontend-source/testnet-plan.mjs';
import {hash} from '../server/integrity.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('per-market shocks, funding signs and partial assumed depth keep currencies and costs distinct',()=>{
 const p=portfolioExample(),s=defaultScenario(p);s.hours=8;s.markets[0]={...s.markets[0],shockPct:-20,fundingBps:10,exitSlippageBps:100,exitDepthPct:50};s.markets[1]={...s.markets[1],shockPct:10,fundingBps:0,exitSlippageBps:0};
 const r=portfolioScenario(p,s),long=r.groups[0].positions.find(x=>x.positionId===1),short=r.groups[0].positions.find(x=>x.positionId===2);
 near(long.scenarioPrice,84);near(short.scenarioPrice,84);assert.ok(long.fundingCost>0);assert.ok(short.fundingCost<0);
 near(long.slippageCost,.42);near(long.uncoveredSize,.5);near(long.priceDelta,-21);near(short.priceDelta,10.5);assert.equal(r.groups.length,2);assert.equal(r.totals,undefined);
 near(long.afterCostEquity,long.preExitEquity-long.exitFee-long.slippageCost);assert.ok(r.groups[1].positions[0].priceDelta>0);
 assert.equal(replayPortfolioScenario(portfolioScenarioPacket(p,s)).status,'reproduced');
});
test('unknown funding or malformed scenario cannot turn missing costs into zero; rehashed tampering is rejected',()=>{
 const p=portfolioExample(),s=defaultScenario(p);s.markets[0].fundingBps=null;
 const g=portfolioScenario(p,s).groups[0];assert.equal(g.complete,false);assert.equal(g.totals.afterCostEquity,null);assert.ok(g.positions.every(p=>p.fundingCost===null));
 s.hours=0;assert.ok(portfolioScenario(p,s).groups[0].positions.every(p=>p.fundingCost===0));
 assert.throws(()=>portfolioScenario(p,{...s,markets:[]}));assert.throws(()=>portfolioScenario(p,{...s,markets:[...s.markets,s.markets[0]]}));
 const packet=portfolioScenarioPacket(p,s);packet.report.groups[0].totals.loss=999;packet.reportHash=hash(packet.report);assert.throws(()=>replayPortfolioScenario(packet));
});
test('fixed-condition plans produce unexecuted drafts and reject altered plans even with new hashes',()=>{
 const p=createTestPlan({marketId:16,notional:10,leverage:2,slippageBps:100});assert.equal(replayTestPlan(p).planned,6);assert.equal(replayTestPlan(p).actualTrades,0);
 assert.ok(p.evidence.research.workspace.experiments.every(e=>!e.trade&&!e.baseline));
 p.evidence.research.workspace.experiments[0].notes='changed';p.evidenceHash=hash(p.evidence);assert.throws(()=>replayTestPlan(p));
 assert.throws(()=>createTestPlan({marketId:16,notional:10,leverage:100,slippageBps:100}));
});
