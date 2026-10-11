import test from 'node:test';
import assert from 'node:assert/strict';
import {exchangeInterface} from '../server/events.mjs';
import {guidedReview} from '../server/guided-review.mjs';
import {hash} from '../server/integrity.mjs';
import {simulate} from '../server/risk.mjs';
import {createBaseline} from '../server/pretrade-baseline.mjs';
import {tradeReviewPacket} from '../server/settlement-audit.mjs';
import {workspaceReview} from '../frontend-source/trade-review.mjs';
import {newExperiment,attachResearchEvidence,researchPacket,replayResearch} from '../frontend-source/research-workspace.mjs';
import {compareResearch,researchComparisonPacket,replayResearchComparison,sampleStatistics} from '../frontend-source/research-comparison.mjs';

function experiment({independent=false,price=99.5,shock=-5,short=false,source='synthetic_testnet_history'}={}){
 const p=guidedReview(),o=structuredClone(p.trade.observation);
 if(independent){
  const old=o.evidence.chain[0].txHash,next='0x'+'e'.repeat(64);
  for(const h of Object.values(o.evidence.histories))for(const page of h.pages)for(const row of page.value.d)if(row.at.txid===old.slice(2))row.at.txid=next.slice(2);
  const c=o.evidence.chain[0];c.txHash=next;c.receipt.transactionHash=next;c.transaction.hash=next;for(const log of c.receipt.logs)log.transactionHash=next;
  o.evidenceHash=hash(o.evidence);
 }
 o.classification=source;
 if(short){
  const h=k=>o.evidence.histories[k].pages[0].value.d;
  h('order-history')[0].t=2;h('fills')[0].t=2;h('position-history')[0].sd=2;
  Object.assign(h('order-history')[1],{t:4,fp:9000});Object.assign(h('fills')[1],{t:4,p:9000});Object.assign(h('position-history')[1],{sd:2,xp:9000});
  const encode=(chain,index,name,args)=>{const old=o.evidence.chain[chain].receipt.logs[index];Object.assign(old,exchangeInterface.encodeEventLog(exchangeInterface.getEvent(name),args));};
  encode(0,1,'OrderRequest',[1,1,8,0,1,0,1000,0,false,false,true,0,500,0,0,0,0]);
  encode(0,2,'PositionOpened',[1,1,1,500,20000000,0,10000,1000,15000,85000]);
  encode(1,0,'OrderRequest',[1,1,18,0,3,0,1000,0,false,false,true,0,500,0,0,0,0]);
  encode(1,1,'PositionClosed',[1,1,1,9000,10000000,-10000]);
  encode(1,2,'TakerOrderFilled',[9000,9000,9000,1000,110000,29880000,109780000]);
 }
 o.evidenceHash=hash(o.evidence);
 const prev=structuredClone(p.baseline.evidence.preview),m=prev.context.markets[0];m.state.mrk=price*100;m.state.ask=price*100;m.state.bid=(price-.1)*100;
 prev.book.ask[0].p=price*100;prev.book.bid[0].p=(price-.1)*100;if(short){prev.originalInput.direction='short';prev.book.bid[0].p=price*100;prev.book.ask[0].p=Math.round((price+.1)*100);m.state.bid=price*100;m.state.ask=prev.book.ask[0].p;}prev.originalInput.notional=price;prev.originalInput.shockPct=shock;
 prev.inputHash=hash(prev.originalInput);prev.snapshotHashes={context:hash(prev.context),book:hash(prev.book)};
 prev.result=simulate({market:m,context:prev.context,book:prev.book,input:prev.originalInput,now:Date.parse(prev.createdAt)});
 const baseline=createBaseline(prev,Date.parse(p.baseline.evidence.savedAt));
 return attachResearchEvidence(newExperiment(short?'short_full':'long_full'),workspaceReview(tradeReviewPacket(o),baseline));
}
const w=(...experiments)=>({experiments});
test('independent verified lifecycles compare with correct units, equal-weight statistics and risk labels',()=>{
 const a=experiment(),b=experiment({independent:true,price:99.6}),r=compareResearch(w(a,b));
 assert.equal(r.included,2);assert.equal(r.groups.length,1);assert.equal(r.groups[0].comparable,true);
 const g=r.groups[0];assert.ok(Math.abs(g.metrics.tradingFeeBps.mean-21)<1e-9);assert.equal(g.metrics.fundingBps.mean,-1);assert.equal(g.metrics.netBps.mean,978);
 assert.ok(Math.abs(g.metrics.adverseBps.mean-((100/99.5-1)+(100/99.6-1))*5000)<1e-9);
 assert.ok(Math.abs(r.rows[0].sample.stressBufferPct-9.9)<1e-9);
 assert.equal(g.notional.mean,100);assert.equal(g.durationMs.mean,1000);
 assert.deepEqual(sampleStatistics([4,1,2,3]),{n:4,mean:2.5,median:2.5,min:1,max:4});assert.equal(sampleStatistics([]).mean,null);assert.throws(()=>sampleStatistics([NaN]));
});
test('duplicate trades count once; conflicting baselines exclude all variants deterministically',()=>{
 const a=experiment(),b={...a,id:crypto.randomUUID()};const r=compareResearch(w(a,b));assert.equal(r.included,1);assert.equal(r.excluded,1);assert.equal(r.groups[0].comparable,false);
 assert.equal(compareResearch(w(b,a)).rows.find(r=>r.included).id,r.rows.find(r=>r.included).id);
 const conflict=experiment({price:99.6});const bad=compareResearch(w(a,conflict));assert.equal(bad.included,0);assert.ok(bad.rows.every(r=>r.reason.includes('不同基线')));
});
test('different scenario groups cannot silently merge; unverified experiments are explained',()=>{
 const a=experiment(),b=experiment({independent:true,shock:-10}),draft=newExperiment('short_full');
 const r=compareResearch(w(a,b,draft));assert.equal(r.groups.length,2);assert.ok(r.groups.every(g=>!g.comparable));assert.equal(r.rows[2].reason,'缺少事前基线');
 const unsupported={...a,kind:'partial'};assert.equal(compareResearch(w(unsupported)).included,0);
 const mismatch={...a,kind:'short_full'};assert.equal(compareResearch(w(mismatch)).included,0);
});
test('comparison export replays from evidence; tampered metrics or underlying files fail; old research archives stay valid',()=>{
 const workspace=w(experiment(),experiment({independent:true}));const p=researchComparisonPacket(workspace);assert.equal(replayResearchComparison(p).included,2);
 assert.equal(replayResearch(researchPacket(workspace)).status,'reproduced');
 p.report.groups[0].metrics.netBps.mean=999;p.reportHash=hash(p.report);assert.throws(()=>replayResearchComparison(p),/复算/);
 const broken=researchComparisonPacket(workspace);broken.workspace.experiments[0].trade.report.closed[0].realizedPnl=500;broken.workspaceHash=hash(broken.workspace);assert.throws(()=>replayResearchComparison(broken));
});

test('short adverse price direction and source partitioning remain explicit',()=>{
 const long=experiment(),short=experiment({short:true,independent:true,price:100.5,shock:5});
 const r=compareResearch(w(long,short));assert.equal(r.included,2);assert.equal(r.groups.length,2);
 const row=r.rows.find(r=>r.key.direction==='空头');assert.ok(row.sample.adverseBps>0);assert.ok(Math.abs(row.sample.adverseCost-.5)<1e-9);
 // File classification is a provenance label, never proof of authenticity.
 const labeled=experiment({source:'private_testnet_history'});const split=compareResearch(w(long,labeled));assert.equal(split.groups.length,2);assert.deepEqual(new Set(split.groups.map(g=>g.key.source)),new Set(['synthetic','saved_testnet']));
});
