import test from 'node:test';
import assert from 'node:assert/strict';
import {auditExecution,auditPacket,replayAudit} from '../server/execution-audit.mjs';
import {executionExample} from '../server/execution-examples.mjs';
import {exchangeInterface} from '../server/events.mjs';
import {simulate} from '../server/risk.mjs';
import {estimateEvidence} from '../server/execution-audit.mjs';

function encoded(previous,name,args,index){return {...previous,...exchangeInterface.encodeEventLog(exchangeInterface.getEvent(name),args),logIndex:`0x${index.toString(16)}`};}

test('full execution uses chain-weighted price and quantity-normalized cost deltas with independent arithmetic',()=>{
 const i=executionExample('full'),logs=i.reconciliation.receipt.logs;i.reconciliation.receipt.logs=[logs[0],encoded(logs[1],'TakerOrderFilled',[10000,10000,10000,250,25000,0,1000000],2),encoded(logs[1],'TakerOrderFilled',[10050,10050,10050,250,25128,0,1000000],3)];i.reconciliation.order.at.l=3;
 const r=auditExecution(i,{synthetic:true});assert.equal(r.status,'rechecked');assert.equal(r.classification,'synthetic_execution_audit');assert.equal(r.receiptConsistent,true);assert.equal(r.execution.fillRatio,1);assert.equal(r.execution.size,.5);assert.equal(r.execution.vwap,100.25);assert.equal(r.execution.fee,.050128);
 assert.ok(Math.abs(r.execution.adversePriceCost-.125)<1e-12);assert.ok(Math.abs(r.execution.feeDelta-.000128)<1e-12);assert.ok(Math.abs(r.execution.feePriceComponent-.000125)<1e-12);assert.ok(Math.abs(r.execution.feeResidual-.000003)<1e-12);assert.equal(r.execution.observedDelayMs,3000);assert.equal(r.execution.fundingPaid,null);assert.equal(r.execution.realizedPnl,null);
});
test('a lower sell price is adverse while its nominal-based fee can decrease independently',()=>{
 const i=executionExample('full'),e=i.estimateEvidence,market=e.context.markets[0];
 i.result=simulate({market,context:e.context,book:e.book,input:{...i.result.input,direction:'short',shockPct:5},feeTier:0,now:Date.parse(e.evaluatedAt)});i.estimateEvidence=estimateEvidence(e.context,e.book,i.result);i.spec={...i.spec,t:2,s:505};
 Object.assign(i.reconciliation.order,{t:2,os:505,fs:505,fp:9875,f:'49869'});const logs=i.reconciliation.receipt.logs;
 i.reconciliation.receipt.logs=[encoded(logs[0],'OrderRequest',[1,7,8,0,2,0,505,0,false,false,true,0,300,0,0,0,0],1),encoded(logs[1],'TakerOrderFilled',[9875,9875,9875,505,49869,0,1000000],2)];
 const r=auditExecution(i);assert.equal(r.status,'rechecked');assert.equal(r.execution.vwap,98.75);assert.ok(Math.abs(r.execution.adversePriceCost-.12625)<1e-12);assert.ok(r.execution.priceDeviationBps<0);assert.ok(r.execution.feeDelta<0);
});
test('partial and zero fills cannot become full fills, zero price is unknown and fees use matched size',()=>{
 const partial=auditExecution(executionExample('partial'));assert.equal(partial.fillCoverage,'partial');assert.equal(partial.execution.fillRatio,.5);const fee=partial.rows.find(r=>r.id==='fee');assert.equal(fee.estimated,.025);assert.equal(fee.observed,.025065);assert.equal(partial.execution.adversePriceCost,.0625);
 const zero=auditExecution(executionExample('zero'));assert.equal(zero.status,'no_fill');assert.equal(zero.fillCoverage,'zero');assert.equal(zero.execution.vwap,null);assert.equal(zero.execution.priceDeviationBps,null);assert.equal(zero.execution.fee,0);
});
test('missing receipt and changed identities, amounts, chain or events leave observed metric cells unknown',()=>{
 const missing=auditExecution(executionExample('unconfirmed'));assert.equal(missing.status,'unavailable');assert.equal(missing.apiObservation.vwap,100.25);assert.ok(missing.rows.every(x=>x.observed===null));
 for(const mutate of [i=>i.reconciliation.order.acc++,i=>i.reconciliation.order.t=2,i=>i.reconciliation.order.os++,i=>i.reconciliation.order.f='50129',i=>i.reconciliation.order.fs=501,i=>i.reconciliation.order.fp=10027,i=>i.reconciliation.receipt.status='0x0',i=>i.reconciliation.transaction.chainId='0x8f',i=>i.reconciliation.transaction.blockHash='0x'+'c'.repeat(64),i=>i.reconciliation.receipt.logs[1].removed=true,i=>i.reconciliation.receipt.logs[0].address='0x'+'9'.repeat(40)]){
  const i=executionExample('full');i.reconciliation.chainVerified=true;mutate(i);const r=auditExecution(i);assert.equal(r.status,'mismatch');assert.equal(r.receiptConsistent,false);assert.equal(r.execution,null);assert.ok(r.rows.every(x=>x.observed===null));
 }
});
test('modified baselines and unsupported old/close records are unavailable; replay checks complete outputs',()=>{
 for(const mutate of [i=>i.estimateEvidence.book.ask[0].p++,i=>i.result.entryFee++,i=>delete i.estimateEvidence,i=>i.spec.t=3]){const i=executionExample('full');mutate(i);const r=auditExecution(i);assert.equal(r.status,'unavailable');assert.equal(r.receiptConsistent,false);}
 const p=auditPacket(executionExample('full'),{synthetic:true});assert.equal(replayAudit(p).status,'reproduced');for(const mutate of [p=>p.intentSnapshot.result.margin++,p=>p.report.rows[0].observed++,p=>p.report.execution.fundingPaid=0,p=>p.classification='stored_execution_audit']){const q=structuredClone(p);mutate(q);assert.throws(()=>replayAudit(q));}
});
