import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store,hash} from '../server/store.mjs';
import {positionExample} from '../server/position-examples.mjs';
import {analyzeAccount} from '../server/account-analysis.mjs';
import {HistoryReader,collectHistory,normalizeTxHash} from '../server/trade-history.mjs';
import {exchangeInterface,decodeReceipt} from '../server/events.mjs';
import {analyzeHistory,historyAuditPacket,replayHistoryAudit} from '../server/history-audit.mjs';

import {fixture} from './history-fixture.mjs';
const rehash=p=>(p.evidenceHash=hash(p.evidence),p);
test('observed opening links REST, block-global logs, transaction-local indexes and zero-based enums',()=>{
 const p=fixture(),r=analyzeHistory(p),o=r.orders[0];assert.equal(o.status,'opening_reconciled');assert.equal(o.execution.price,100);assert.equal(o.execution.size,1);assert.equal(o.execution.fee,.1);assert.equal(o.execution.collateral,20);assert.equal(o.execution.accountDebit,20.1);assert.equal(o.execution.remainingAccountBalance,79.9);assert.equal(o.feeReference.residual,0);assert.equal(o.baseline,null);assert.equal(o.executionDeviation,null);assert.equal(o.realizedPnl,null);assert.equal(replayHistoryAudit(historyAuditPacket(p)).status,'reproduced');
});
test('independent altered identities, receipt metadata, fee and deposit cannot pass even with recomputed hashes',()=>{
 const mutations=[e=>e.chain[0].transaction.chainId='0x8f',e=>e.chain[0].receipt.status='0x0',e=>e.chain[0].receipt.blockHash='0x'+'c'.repeat(64),e=>e.chain[0].transaction.to='0x'+'9'.repeat(40),e=>e.chain[0].receipt.logs[3].transactionIndex='0x2',e=>e.chain[0].receipt.logs[3].removed=true,e=>e.histories['order-history'].pages[0].value.d[0].at.l=33,e=>e.histories['order-history'].pages[0].value.d[0].t=2,e=>e.histories.fills.pages[0].value.d[0].s=999,e=>e.histories['position-history'].pages[0].value.d[0].c='19000000',e=>e.histories['account-history'].pages[0].value.d[0].a='-20000000'];
 for(const mutate of mutations){const p=fixture();mutate(p.evidence);assert.notEqual(analyzeHistory(rehash(p)).orders[0].status,'opening_reconciled');}
 const p=historyAuditPacket(fixture());p.report.realizedPnl=100;p.reportHash=hash(p.report);assert.throws(()=>replayHistoryAudit(p),/REPLAY/);
});
test('missing receipts, partial history, malformed hashes and duplicate fills remain distinguishable',()=>{
 let p=fixture();p.evidence.chain=[];assert.notEqual(analyzeHistory(rehash(p)).orders[0].status,'opening_reconciled');
 p=fixture();p.evidence.histories.fills.complete=false;p.evidence.histories.fills.pages[0].value.np='next';assert.equal(analyzeHistory(rehash(p)).historyComplete,false);
 p=fixture();p.evidence.histories.fills.pages[0].value.d.push(p.evidence.histories.fills.pages[0].value.d[0]);assert.throws(()=>analyzeHistory(rehash(p)),/DUPLICATE/);
 assert.equal(normalizeTxHash('a'.repeat(64)),'0x'+'a'.repeat(64));assert.equal(normalizeTxHash('0x'+'A'.repeat(64)),'0x'+'a'.repeat(64));assert.equal(normalizeTxHash('f'.repeat(63)),null);
});
test('decoder does not treat REST enum or block log index as contract and local index',()=>{
 const p=fixture(),e=p.evidence,o=e.histories['order-history'].pages[0].value.d[0],r=e.chain[0].receipt,args={exchange:e.account.snapshot.context.instances[0].address,perpetualId:1,accountId:1,requestId:8,orderType:1,rawSize:1000,apiOrder:o};
 assert.equal(decodeReceipt(r,args).verified,true);o.at.l=33;assert.equal(decodeReceipt(r,args).verified,false);o.at.l=3;args.orderType=2;assert.equal(decodeReceipt(r,args).verified,false);
});
test('history reader denies writes, arbitrary queries and RPC before any network request',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tp-history-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));let calls=0;
 const reader=new HistoryReader(new Store(root),{request:async()=>{calls++;return new Response('{}');}});
 for(const [network,target,options] of [['mainnet','/v1/trading/fills?count=100',{auth:true}],['testnet','/v1/trading/fills?count=100',{auth:true,method:'POST'}],['testnet','/v1/trading/fills?count=100&evil=1',{auth:true}],['testnet','/v1/trading/fills?count=100&count=100',{auth:true}],['testnet','/v1/trading/orders',{method:'POST'}]])await assert.rejects(reader.call(network,target,options));
 for(const [method,params] of [['eth_sendRawTransaction',['0x00']],['eth_getTransactionReceipt',['bad']],['eth_call',[]]])await assert.rejects(reader.rpc('testnet',method,params));
 const r=await collectHistory(reader,{eligibility:{blocked:true},expectedWallet:'0x'+'3'.repeat(40)});assert.equal(r.status,'not_ready');assert.equal(calls,0);
});
test('collection is bounded, keeps truncation explicit and stops immediately on a history rejection',async t=>{
 const p=fixture(),s=p.evidence.account.snapshot,eligibility={approved:true,blocked:false,reference:'synthetic',checkedAt:new Date(s.now).toISOString()};
 for(const reject of [false,true]){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tp-history-bounds-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const calls=[];
  const reader=new HistoryReader(new Store(root),{now:()=>s.now,request:async(url,options)=>{
   calls.push(url);const body=options.body?JSON.parse(options.body):null;
   if(body)return new Response(JSON.stringify({result:body.method==='eth_chainId'?'0x279f':'0x64'}));
   if(url.endsWith('/wallet'))return new Response(JSON.stringify(s.wallet));if(url.endsWith('/positions'))return new Response(JSON.stringify(s.positions));if(url.endsWith('/context'))return new Response(JSON.stringify(s.context));
   if(reject)return new Response('{}',{status:429,headers:{'Retry-After':'60'}});
   return new Response(JSON.stringify({d:[],np:`cursor-${calls.length}`}));
  }});reader.key=()=>({token:'synthetic',secret:'1'.repeat(64)});
  if(reject){await assert.rejects(collectHistory(reader,{eligibility,expectedWallet:s.expectedWallet}),/429/);assert.equal(calls.length,6);await assert.rejects(reader.call('testnet','/v1/trading/fills?count=100',{auth:true}));assert.equal(calls.length,6);}
  else {const r=await collectHistory(reader,{eligibility,expectedWallet:s.expectedWallet});assert.equal(calls.length,14);assert.ok(Object.values(r.evidence.histories).every(h=>h.complete===false&&h.pages.length===2));}
 }
});
