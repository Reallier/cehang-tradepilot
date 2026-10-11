import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycle} from './settlement-fixture.mjs';
import {exchangeInterface} from '../server/events.mjs';
import {hash} from '../server/integrity.mjs';
import {tradeReviewPacket,replayTradeReview} from '../server/settlement-audit.mjs';
import {tradeReviewPacket as legacyPacket} from '../server/settlement-audit-v2.mjs';
import {workspaceReview} from '../frontend-source/trade-review.mjs';
import {reviewJourneys} from '../frontend-source/review-journeys.mjs';
import {RuntimeDiagnostics} from '../server/runtime-diagnostics.mjs';
import {createResearchClient} from '../frontend-source/research-client.mjs';
import {newExperiment} from '../frontend-source/research-workspace.mjs';

function staged(short=false){
 const p=lifecycle({short,partial:true}),e=p.evidence,h=k=>e.histories[k].pages[0].value.d,prior=h('position-history')[1];
 const tx='0x'+'e'.repeat(64),blockHash='0x'+'f'.repeat(64),at=l=>({b:102,tx:2,l,txid:tx.slice(2),t:prior.at.t+1000}),credit=14925000,balance=109760000,price=short?9000:11000;
 h('order-history').push({...h('order-history')[1],at:at(2),rq:28,oid:29});
 h('fills').push({...h('fills')[1],at:at(2),oid:29});
 h('position-history').push({...prior,at:at(1),sr:13,st:2,rq:28,oid:29,fnd:'-20000'});
 h('account-history').push({...h('account-history')[1],at:at(2),r:28,o:29,a:String(credit),b:String(balance)});
 const meta={transactionHash:tx,blockHash,blockNumber:'0x66',transactionIndex:'0x2',removed:false},address=e.account.snapshot.context.instances[0].address;
 const encode=(name,args,i)=>({...meta,...exchangeInterface.encodeEventLog(exchangeInterface.getEvent(name),args),address,logIndex:'0x'+i.toString(16)});
 const logs=[encode('OrderRequest',[1,1,28,0,short?3:2,0,500,0,false,false,true,0,500,0,0,0,0],10),encode('PositionClosed',[1,1,short?1:0,price,5000000,-20000],11),encode('TakerOrderFilled',[price,price,price,500,55000,credit,balance],12)];
 e.chain.push({txHash:tx,receipt:{...meta,status:'0x1',logs},transaction:{hash:tx,chainId:'0x279f',blockHash,blockNumber:'0x66',transactionIndex:'0x2',to:address}});
 h('order-history').reverse();p.evidenceHash=hash(e);return p;
}
test('staged long and short settlement tracks remaining balances, fees and independent sequential exits',()=>{
 for(const short of [false,true]){
  const p=tradeReviewPacket(staged(short));assert.deepEqual(replayTradeReview(p).closed,['exit_reconciled','exit_reconciled']);
  assert.equal(p.report.closed[0].execution.remainingSize,.5);assert.equal(p.report.closed[1].execution.remainingSize,0);
  assert.equal(p.report.closed[0].execution.remainingEntryFee,.05);assert.equal(p.report.closed[1].execution.remainingEntryFee,0);
  const j=reviewJourneys(workspaceReview(p)).items[0];assert.equal(j.state,'closed');assert.equal(j.exits.length,2);assert.ok(Math.abs(j.pnl.net-9.76)<1e-10);assert.equal(j.pnl.entryFee,.1);
 }
});
test('missing, changed, duplicate and out-of-order prior exits never certify a later close',()=>{
 for(const mutate of [e=>e.chain.splice(1,1),e=>e.histories['position-history'].pages[0].value.d[1].fee='999999',e=>e.histories['position-history'].pages[0].value.d.push(structuredClone(e.histories['position-history'].pages[0].value.d[1])),e=>e.histories['position-history'].pages[0].value.d[2].at.b=100]){
  const p=staged();mutate(p.evidence);p.evidenceHash=hash(p.evidence);let r;try{r=tradeReviewPacket(p);}catch(e){assert.match(e.message,/DUPLICATE_HISTORY_ROW/);continue;}assert.notEqual(r.report.closed.at(-1).status,'exit_reconciled');assert.notEqual(reviewJourneys(workspaceReview(r)).items[0].state,'closed');
 }
});
test('legacy v2 evidence still replays with its original report and limits',()=>{const p=legacyPacket(lifecycle());assert.equal(p.schema,'testnet-trade-review-v2');assert.equal(replayTradeReview(p).closed[0],'exit_reconciled');});
test('worker client rejects cancelled results and terminates workers on success or clear',async()=>{
 const workers=[],client=createResearchClient({factory:()=>{const w={terminate(){this.terminated=true;},postMessage(m){this.sent=m;}};workers.push(w);return w;}});
 const p=client.call('evaluate',{workspace:{experiments:[]}});const rejected=assert.rejects(p,/取消/);client.cancel();await rejected;assert.equal(workers[0].terminated,true);
 workers[0].onmessage({data:{id:workers[0].sent.id,result:'late'}});
 const next=client.call('evaluate',{});workers[1].onmessage({data:{id:workers[1].sent.id,result:'current'}});assert.equal(await next,'current');assert.equal(workers[1].terminated,true);
 const fallback=createResearchClient({factory:null});assert.equal((await fallback.call('evaluate',{workspace:{experiments:[newExperiment('long_full')]}})).report.experiments,1);
});
test('passive diagnostics distinguishes liveness, no observation, cooldown, stale and restriction without fetching',async()=>{
 let now=1000,blocked=null;const d=new RuntimeDiagnostics({now:()=>now}),reader={store:{exists:()=>!!blocked,get:()=>blocked},cooldowns:new Map()};
 assert.equal(d.snapshot(reader).networks[1].status,'not_observed');await d.observe('testnet',async()=>({selectedId:1,markets:[{marketId:1}]}));
 assert.equal(d.snapshot(reader).networks[1].status,'recent_success');now+=46000;assert.equal(d.snapshot(reader).networks[1].status,'stale');
 await assert.rejects(d.observe('testnet',async()=>{throw new Error('429 secret-must-not-escape');}));reader.cooldowns.set('testnet',now+60000);assert.equal(d.snapshot(reader).networks[1].status,'cooldown');
 blocked={blocked:true,status:451};assert.equal(d.snapshot(reader).networks[1].status,'restricted');assert.ok(!JSON.stringify(d.snapshot(reader)).includes('secret-must-not-escape'));
});
