import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {guidedReview} from '../server/guided-review.mjs';
import {hash,Store} from '../server/store.mjs';
import {HistoryReader,collectHistory} from '../server/trade-history.mjs';
import {tradeReviewPacket,replayTradeReview} from '../server/settlement-audit.mjs';
import {selectExperimentReceipts,verifyReceiptTarget,verifyReceiptSelection,RECEIPT_TARGET_SCHEMA} from '../server/receipt-selection.mjs';
const target={schema:RECEIPT_TARGET_SCHEMA,chainId:10143,accountId:1,marketId:1,openingOrderId:9};
function evidence(){const e=structuredClone(guidedReview().trade.observation.evidence),orders=e.histories['order-history'].pages[0].value.d;for(let n=0;n<4;n++)orders.unshift({...orders.at(-2),oid:40+n,at:{...orders[0].at,txid:String(n+1).repeat(64)}});return e;}
test('selection finds full lifecycle beyond first four hashes without discarding unrelated history',()=>{
 const e=evidence(),count=e.histories['order-history'].pages[0].value.d.length,selection=selectExperimentReceipts(e,target);assert.deepEqual(selection.orderIds,[9,19]);assert.equal(selection.hashes.length,2);assert.equal(e.histories['order-history'].pages[0].value.d.length,count);
 e.receiptSelection=selection;assert.equal(verifyReceiptSelection(e).receiptsAvailable,true);
 e.chain[1].receipt=null;assert.equal(verifyReceiptSelection(e).receiptsAvailable,false);
});
test('ambiguous or absent target, foreign account, malformed target and five related receipts fail closed',()=>{
 assert.throws(()=>verifyReceiptTarget({...target,chainId:143}));assert.throws(()=>verifyReceiptTarget({...target,extra:true}));
 const e=evidence();assert.throws(()=>selectExperimentReceipts(e,{...target,accountId:2}));assert.throws(()=>selectExperimentReceipts(e,{...target,openingOrderId:123}));
 const positions=e.histories['position-history'].pages[0].value.d;positions.push({...positions[0]});assert.throws(()=>selectExperimentReceipts(e,target));positions.pop();
 const orders=e.histories['order-history'].pages[0].value.d;for(let n=0;n<3;n++){const oid=60+n;orders.push({...orders.at(-1),oid,at:{...orders.at(-1).at,txid:String(n+4).repeat(64)}});positions.push({...positions.at(-1),oid});}
 assert.throws(()=>selectExperimentReceipts(e,target),/EXCEEDS_FOUR/);
});
test('replay binds target selection to preserved history and rejects rehashed removal of exit receipt',()=>{
 const e=evidence();e.receiptSelection=selectExperimentReceipts(e,target);e.receiptCoverageComplete=false;
 const packet={schema:'trade-history-observation-v1',classification:'synthetic_testnet_history',evidence:e,evidenceHash:hash(e)};
 const r=tradeReviewPacket(packet);assert.equal(r.report.closed[0].status,'exit_reconciled');assert.equal(replayTradeReview(r).status,'reproduced');
 e.receiptSelection.hashes.pop();e.receiptSelection.orderIds.pop();e.chain.pop();packet.evidenceHash=hash(e);assert.throws(()=>tradeReviewPacket(packet),/SELECTION_MISMATCH/);
});
test('bounded targeted collection fetches only selected receipts, retains history, and rejects invalid target before network',async t=>{
 const e=evidence(),s=e.account.snapshot,calls=[],root=fs.mkdtempSync(path.join(os.tmpdir(),'tp-target-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const reader=new HistoryReader(new Store(root),{now:()=>s.now,request:async(url,options)=>{
  const body=options.body?JSON.parse(options.body):null;calls.push(body??url);
  if(body){const c=e.chain.find(c=>c.txHash===body.params[0]);const value=body.method==='eth_chainId'?'0x279f':body.method==='eth_blockNumber'?'0x6e':body.method==='eth_getTransactionReceipt'?c?.receipt:c?.transaction;return new Response(JSON.stringify({result:value}));}
  if(url.endsWith('/wallet'))return new Response(JSON.stringify(s.wallet));if(url.endsWith('/positions'))return new Response(JSON.stringify(s.positions));if(url.endsWith('/context'))return new Response(JSON.stringify(s.context));
  const kind=new URL(url).pathname.split('/').at(-1);return new Response(JSON.stringify(e.histories[kind].pages[0].value));
 }});reader.key=()=>({token:'synthetic',secret:'1'.repeat(64)});
 const options={eligibility:{approved:true,blocked:false,reference:'synthetic',checkedAt:new Date(s.now).toISOString()},expectedWallet:s.expectedWallet,receiptTarget:target};
 await assert.rejects(collectHistory(reader,{...options,receiptTarget:{...target,chainId:143}}));assert.equal(calls.length,0);
 const p=await collectHistory(reader,options);assert.equal(calls.length,14);assert.equal(p.evidence.receiptCoverageComplete,false);assert.deepEqual(p.evidence.receiptSelection.orderIds,[9,19]);assert.equal(p.evidence.histories['order-history'].pages[0].value.d.length,6);
 const txCalls=calls.filter(c=>c.method?.startsWith('eth_getTransaction'));assert.equal(txCalls.length,4);assert.ok(txCalls.every(c=>e.chain.some(x=>x.txHash===c.params[0])));
 const review=tradeReviewPacket(p);assert.equal(review.report.closed[0].status,'exit_reconciled');assert.equal(review.report.opening.targetReceiptCoverage.receiptsAvailable,true);
});
