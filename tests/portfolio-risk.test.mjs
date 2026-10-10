import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioExample} from '../server/portfolio-example.mjs';
import {portfolioRisk,portfolioPacket,replayPortfolio} from '../server/portfolio-risk.mjs';
import {hash} from '../server/integrity.mjs';
import {analyzeAccount} from '../server/account-analysis.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function refresh(p){p.report=analyzeAccount(p.snapshot);p.snapshotHash=hash(p.snapshot);p.reportHash=hash(p.report);return p;}
test('portfolio computes independent long/short shocks, signed funding and loss shares without double-counting entry fees',()=>{
 const p=portfolioExample(),r=portfolioRisk(p,-20),g=r.groups[0],a=g.positions.find(x=>x.positionId===1),b=g.positions.find(x=>x.positionId===2);
 near(a.deltaPnl,84-105);near(a.scenarioEquity,20+(84-100)-1);near(a.buffer,3-5);
 near(b.deltaPnl,(105-84)*.5);near(b.scenarioEquity,20+(100-84)*.5+.5);
 near(g.totals.deltaPnl,-10.5);near(g.totals.collateral,40);near(g.totals.grossExposure,157.5);near(g.totals.signedExposure,52.5);
 near(a.lossSharePct,100);near(b.lossSharePct,0);
 assert.equal(g.thresholdCount,1);assert.equal(a.status,'threshold_crossed');assert.ok(g.totals.scenarioEquity>0);
 // A positive aggregate equity must never rescue the isolated long.
 const up=portfolioRisk(p,50).groups[0];assert.equal(up.positions.find(x=>x.positionId===2).status,'threshold_crossed');
 assert.equal(portfolioRisk(p,0).groups[0].positions[0].lossSharePct,null);
});
test('grouping separates account, instance and token identity even when symbols match; no cross-token grand total',()=>{
 const p=portfolioExample(),r=portfolioRisk(p,-10);
 assert.equal(r.groups.length,2);assert.equal(r.groups[0].unit,r.groups[1].unit);assert.notEqual(r.groups[0].tokenAddress,r.groups[1].tokenAddress);
 assert.equal(r.totals,undefined);
 p.snapshot.wallet.as.push({...p.snapshot.wallet.as[0],id:3});p.snapshot.positions.d.push({...p.snapshot.positions.d[0],acc:3});
 assert.equal(portfolioRisk(refresh(p),-10).groups.length,3);
});
test('unknown market and missing funding keep totals unknown with explicit coverage; stale input cannot look complete',()=>{
 const p=portfolioExample();p.snapshot.positions.d.push({...p.snapshot.positions.d[0],pid:9,mkt:999});
 const g=portfolioRisk(refresh(p),-10).groups[0];assert.equal(g.complete,false);assert.equal(g.knownCount,2);assert.equal(g.unknownCount,1);assert.equal(g.totals.deltaPnl,null);near(g.knownSubtotal.deltaPnl,-5.25);assert.ok(g.positions.every(x=>x.lossSharePct===null));
 const q=portfolioExample();delete q.snapshot.context.markets[0].funding;const unknown=portfolioRisk(refresh(q),-10).groups[0];assert.equal(unknown.knownCount,0);assert.equal(unknown.knownSubtotal.scenarioEquity,null);assert.equal(unknown.positions[0].scenarioEquity,null);
 const stale=portfolioExample();stale.snapshot.now+=60000;assert.equal(portfolioRisk(refresh(stale),-20).unknownCount,3);
 const t=portfolioExample();delete t.snapshot.context.tokens[0].address;assert.equal(portfolioRisk(refresh(t),0).groups[0].complete,false);
});
test('empty accounts are explicit and zero rows never claim reconciled settlement',()=>{
 const p=portfolioExample();p.snapshot.positions.d=[];const r=portfolioRisk(refresh(p),0);
 assert.equal(r.positionCount,0);assert.equal(r.accountCount,2);assert.equal(r.groups.length,0);assert.equal(r.thresholdCount,0);
});
test('export independently replays and rejects forged results even after rehashing',()=>{
 const p=portfolioPacket(portfolioExample(),20);assert.equal(replayPortfolio(p).status,'reproduced');assert.equal(replayPortfolio(p).chainReceiptVerified,false);
 p.report.groups[0].totals.deltaPnl=999;p.reportHash=hash(p.report);assert.throws(()=>replayPortfolio(p),/不一致/);
 const q=portfolioExample();q.report.positions[0].risk.collateral=999;q.reportHash=hash(q.report);assert.throws(()=>portfolioRisk(q,0),/无法复算/);
 for(const v of [-100,101,NaN,Infinity,null,'10'])assert.throws(()=>portfolioRisk(portfolioExample(),v),/价格冲击/);
});
