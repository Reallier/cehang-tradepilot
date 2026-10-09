import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeExit,exitPacket,replayExit,observedExit} from '../server/position-exit.mjs';
import {positionExample} from '../server/position-examples.mjs';
import {positionRisk} from '../server/risk.mjs';
import {hash} from '../server/store.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('long exit uses bids; equity does not pay entry fees twice, net PnL includes both sides',()=>{
 const r=analyzeExit(positionExample('long'));
 near(r.current.equity,24);near(r.current.grossPnl,5);near(r.current.fundingPnl,-1);
 near(r.vwap,103.4);near(r.pricePnl,3.4);near(r.exitFee,.1034);near(r.netPnl,1.2966);near(r.adversePriceCost,1.6);
 assert.equal(r.realizedPnl,null);assert.equal(r.actualExitFee,null);assert.equal(r.residual.size,0);assert.equal(r.status,'estimated');
});
test('partial close conserves size, price PnL, funding and already paid entry fees',()=>{
 const r=analyzeExit(positionExample('partial'));
 near(r.matchedSize,.5);near(r.vwap,103.8);near(r.pricePnl,1.9);near(r.netPnl,.8481);near(r.residual.size,.5);
 near(r.entryFee+r.residual.entryFee,1);near(r.fundingPnl+r.residual.fundingPnl,-1);
 near(r.markPricePnl+r.residual.grossPnl,5);assert.equal(r.residual.collateral,null);assert.equal(r.residual.equity,null);
 const f=positionExample('partial');f.position.s=3;const rounded=analyzeExit(f);assert.equal(rounded.requestedRaw,1);assert.equal(rounded.residual.rawSize,2);
 f.input.closePct=1;assert.throws(()=>analyzeExit(f),/最小数量/);
});
test('short exit buys asks; positive funding is income and adverse price cost has correct sign',()=>{
 const r=analyzeExit(positionExample('short'));
 near(r.current.equity,26);near(r.vwap,106.6);near(r.pricePnl,3.4);near(r.fundingPnl,1);near(r.exitFee,.1066);near(r.netPnl,3.2934);near(r.adversePriceCost,1.6);
});
test('shallow depth never charges unfilled quantity; unknown funding or entry fee leaves net unknown',()=>{
 const r=analyzeExit(positionExample('shallow'));
 assert.equal(r.depthComplete,false);near(r.coverage,.25);near(r.uncoveredSize,.75);near(r.netPnl,.474);near(r.entryFee,.25);near(r.exitFee,.026);near(r.residual.size,.75);
 const u=analyzeExit(positionExample('funding_unknown'));assert.equal(u.current.equity,null);assert.equal(u.fundingPnl,null);assert.equal(u.netPnl,null);near(u.pricePnl,3.4);assert.equal(u.status,'incomplete');
 const f=positionExample('long');delete f.position.fee;const noFee=analyzeExit(f);assert.equal(noFee.netPnl,null);near(noFee.current.equity,24);
 f.context.markets[0].config.maintenance_margin=0;const noMargin=analyzeExit(f);assert.equal(noMargin.current.maintenanceEstimate,null);assert.equal(noMargin.current.marginBuffer,null);assert.equal(noMargin.current.liquidationEstimate,null);
});
test('stale/future clocks and uncovered chain blocks remain incomplete, malformed snapshots reject',()=>{
 assert.equal(analyzeExit(positionExample('stale')).status,'incomplete');
 for(const mutate of [f=>f.book.at.t=f.now+6000,f=>f.snapshotAt.b=101,f=>f.context.markets[0].state.at.b=101,f=>f.position.at.b=101]){
  const f=positionExample('long');mutate(f);assert.equal(analyzeExit(f).status,'incomplete');
 }
 for(const mutate of [f=>f.position.st=2,f=>f.position.c='9007199254740993',f=>f.position.s=1.5,f=>f.position.cfee='1',f=>f.input.closePct=101,f=>f.position.mkt=99,f=>f.feeTier=9,f=>f.context.markets[0].state.mrk=0,f=>f.book.bid.push({...f.book.bid[0]})]){
  const f=positionExample('long');mutate(f);assert.throws(()=>analyzeExit(f));
 }
 const f=positionExample('long');f.position.epr=32768;
 near(positionRisk(f.position,f.context.markets[0],f.context,f.now,f.snapshotAt.t).entryPrice,99.995);
});
test('export replay checks every result and source classification; caller snapshot is copied',()=>{
 const f=positionExample('partial'),packet=exitPacket(f,{classification:'synthetic_position_exit'});
 assert.equal(replayExit(packet).status,'reproduced');f.position.c='1';assert.equal(replayExit(packet).status,'reproduced');
 for(const mutate of [p=>p.snapshot.position.s++,p=>p.report.netPnl=1,p=>p.classification='observed_position_exit_estimate']){
  const changed=structuredClone(packet);mutate(changed);assert.throws(()=>replayExit(changed));
 }
 const changed=structuredClone(packet);changed.report.residual.equity=100;changed.reportHash=hash(changed.report);assert.throws(()=>replayExit(changed),/完整结果/);
});
test('observed path only reads account/context/book, binds identity and applies actual fee tier',async()=>{
 const f=positionExample('long'),calls=[];
 const perpl={account:async network=>{calls.push(['account',network]);return {configured:true,positions:{at:f.snapshotAt,d:[f.position]},wallet:{as:[{id:1,ft:1}]},sources:[]};},context:async()=>({value:f.context,source:{}}),cached:async(n,path)=>{calls.push(['book',path]);return {value:f.book,source:{}};}};
 const packet=await observedExit(perpl,'testnet',{positionId:1,accountId:1,closePct:50});
 assert.equal(packet.classification,'observed_position_exit_estimate');assert.equal(packet.report.feeBasis,'account_tier');near(packet.report.exitFee,.02595);
 assert.deepEqual(calls,[['account','testnet'],['book','/v1/market-data/1/book']]);
 assert.equal(replayExit(packet).status,'reproduced');await assert.rejects(observedExit(perpl,'testnet',{positionId:2,accountId:1,closePct:100}),/不存在/);
});
