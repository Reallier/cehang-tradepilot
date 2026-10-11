import {lifecycle} from './settlement-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fixture} from './history-fixture.mjs';
import {hash} from '../server/integrity.mjs';
import {exchangeInterface,EVENT_ABI_HASH,decodeReceipt} from '../server/events.mjs';
import {analyzeTrades,tradeReviewPacket,replayTradeReview} from '../server/settlement-audit.mjs';
import {workspaceReview,replayWorkspaceReview,importTradeReview} from '../frontend-source/trade-review.mjs';
const rehash=p=>(p.evidenceHash=hash(p.evidence),p);
test('browser ABI constant matches shipped ABI bytes',()=>assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../server/vendor/perpl-exchange-events.json',import.meta.url))).digest('hex'),EVENT_ABI_HASH));
test('synthetic long and short full/partial exits split deposit return, funding and both fees',()=>{
 for(const short of [false,true])for(const partial of [false,true])for(const partialEntry of [false,true]){
  const p=lifecycle({short,partial,partialEntry}),r=analyzeTrades(p);assert.equal(r.opening.orders[0].status,'opening_reconciled');assert.equal(r.closed[0].status,'exit_reconciled',JSON.stringify(r.closed[0]));
  assert.equal(r.closed[0].realizedPnl,partial?4.885:9.78);assert.equal(r.closed[0].execution.accountCredit,partial?14.935:29.88);
  const packet=tradeReviewPacket(p);assert.equal(replayTradeReview(packet).status,'reproduced');assert.equal(replayWorkspaceReview(workspaceReview(importTradeReview(packet))).closed[0],'exit_reconciled');
 }
});
test('tampered close, omitted lifecycle and foreign block cannot claim settled PnL',()=>{
 const mutations=[e=>e.histories['position-history'].pages[0].value.d[1].dpnl='9999999',e=>e.histories['position-history'].pages[0].value.d[1].fee='110000',e=>e.histories['account-history'].pages[0].value.d[1].a='40000000',e=>e.chain[1].transaction.chainId='0x8f',e=>e.chain[1].receipt.logs[1].blockHash='0x'+'e'.repeat(64),e=>{e.histories['position-history'].complete=false;e.histories['position-history'].pages[0].value.np='missing';},e=>e.histories['position-history'].pages[0].value.d.push({...e.histories['position-history'].pages[0].value.d[0],sr:16})];
 for(const mutation of mutations){const p=lifecycle();mutation(p.evidence);const r=analyzeTrades(rehash(p)).closed[0];assert.notEqual(r.status,'exit_reconciled');assert.equal(r.realizedPnl,null);}
 const packet=tradeReviewPacket(lifecycle());packet.report.closed[0].realizedPnl=123;packet.reportHash=hash(packet.report);assert.throws(()=>replayTradeReview(packet),/MISMATCH/);
});
