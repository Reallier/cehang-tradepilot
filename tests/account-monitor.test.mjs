import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {AccountMonitor} from '../server/account-monitor.mjs';
import {monitorExample} from '../server/monitor-example.mjs';
import {localMonitor} from '../server/local-monitor.mjs';
import {accountChanges,monitorFreshness} from '../frontend-source/account-changes.mjs';
import {hash} from '../server/integrity.mjs';
import {analyzeAccount} from '../server/account-analysis.mjs';
const rebuild=p=>{p.snapshotHash=hash(p.snapshot);p.report=analyzeAccount(p.snapshot);p.reportHash=hash(p.report);return p;};

test('monitor deduplicates in-flight reads and enforces 60 seconds between successful rounds',async()=>{
 const fixture=monitorExample();let now=fixture.previous.snapshot.now,calls=0,resolve;
 const m=new AccountMonitor({now:()=>now,collect:()=>{calls++;return new Promise(r=>resolve=r);}});
 const first=m.step();await m.step();assert.equal(calls,1);resolve(fixture.previous);await first;
 await m.step();assert.equal(calls,1);now+=60000;const second=m.step();resolve(fixture.packet);await second;
 assert.equal(calls,2);assert.equal(m.value.previous,fixture.previous);assert.equal(m.value.packet,fixture.packet);
});
test('429 respects longer Retry-After across restart; failures retain last evidence and stop after three',async()=>{
 const fixture=monitorExample();let now=fixture.packet.snapshot.now;
 const initial={...fixture,failures:0,nextAttemptAt:null};
 const m=new AccountMonitor({initial,now:()=>now,cooldownUntil:()=>now+600000,collect:async()=>{throw new Error('429 secret-body');}});
 await m.step();assert.equal(m.value.state,'backoff');assert.equal(m.value.packet,fixture.packet);assert.equal(Date.parse(m.value.nextAttemptAt),now+600000);
 m.stop();let calls=0;const restored=new AccountMonitor({initial:{...m.value,state:'idle'},now:()=>now,collect:async()=>{calls++;throw new Error('timeout');}});
 await restored.step();assert.equal(calls,0);now+=600000;await restored.step();now=Date.parse(restored.value.nextAttemptAt);await restored.step();assert.equal(restored.value.state,'stopped');assert.equal(calls,2);assert.doesNotMatch(JSON.stringify(restored.value),/secret-body/);
});
test('authentication, restriction, validation and backwards observation stop without further requests',async()=>{
 for(const message of ['401','403','451','WALLET_IDENTITY_MISMATCH','READINESS_STOP']){
  let calls=0;const m=new AccountMonitor({collect:async()=>{calls++;throw new Error(message);}});await m.step();await m.step();assert.equal(m.value.state,'stopped');assert.equal(calls,1);
 }
 const f=monitorExample(),m=new AccountMonitor({initial:{...f,failures:0,nextAttemptAt:null},collect:async()=>f.previous});await m.step();assert.equal(m.value.state,'stopped');assert.equal(m.value.packet,f.packet);
});
test('risk changes distinguish direction, incomplete data, disappearing positions and wallet identity',()=>{
 const f=monitorExample(),r=accountChanges(f.previous,f.packet);assert.equal(r.rows[0].markDelta,-10.5);assert.equal(r.rows[0].pnlDelta,-10.5);assert.equal(r.rows[1].pnlDelta,5.25);
 const missing=structuredClone(f.packet);missing.snapshot.positions.d=[];rebuild(missing);assert.ok(accountChanges(f.previous,missing).rows.every(r=>r.state==='no_longer_observed'&&r.pnlDelta===null));
 const stale=structuredClone(f.packet);stale.snapshot.wallet.at.t-=50000;rebuild(stale);assert.ok(accountChanges(f.previous,stale).rows.every(r=>r.state==='unknown'&&r.bufferDelta===null));
 const other=structuredClone(f.packet);other.snapshot.expectedWallet=other.snapshot.wallet.addr='0x'+'8'.repeat(40);rebuild(other);assert.equal(accountChanges(f.previous,other).state,'different_identity');
 assert.equal(accountChanges(f.packet,f.previous).state,'not_newer');
});
test('freshness uses protocol timestamps and collection state, never relabels failed reads as fresh',()=>{
 const f=monitorExample(),now=f.packet.snapshot.now;
 assert.equal(monitorFreshness(f,now),'fresh');assert.equal(monitorFreshness(f,now+45001),'stale');
 assert.equal(monitorFreshness({...f,state:'backoff'},now),'backoff');assert.equal(monitorFreshness({...f,state:'stopped'},now),'stopped');
 f.packet.snapshot.positions.at.t-=50000;assert.equal(monitorFreshness(f,now),'stale');
});
test('private monitor files are denied on all public listener/origin/path variants and replayed locally',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tp-monitor-')),file=path.join(dir,'latest.json');
 try{
  const config={host:'127.0.0.1',secure:false,basePath:'',origins:['http://localhost:8780']};fs.writeFileSync(file,JSON.stringify(monitorExample()));
  assert.equal(localMonitor(config,file).available,true);
  for(const override of [{host:'0.0.0.0'},{secure:true},{basePath:'/demos/tradepilot'},{origins:['https://public.example']}])assert.deepEqual(localMonitor({...config,...override},file),{available:false});
  const p=monitorExample();p.packet.report.positionCount=999;fs.writeFileSync(file,JSON.stringify(p));assert.throws(()=>localMonitor(config,file));
 }finally{fs.rmSync(dir,{recursive:true});}
});


test('third 429 persists the later server or local cooldown through serialization and manual restart',async()=>{
 for(const retryAfterMs of [600000,1000]){
  let now=1800000000000,calls=0,serverUntil=0;
  const m=new AccountMonitor({now:()=>now,cooldownUntil:()=>serverUntil,collect:async()=>{
   calls++;serverUntil=now+retryAfterMs;throw new Error('协议返回429，已暂停请求并遵守Retry-After');
  }});
  for(let i=0;i<3;i++){await m.step();if(i<2)now=Date.parse(m.value.nextAttemptAt);}
  assert.equal(calls,3);assert.equal(m.value.state,'stopped');
  const expected=now+Math.max(240000,retryAfterMs);
  assert.equal(Date.parse(m.value.nextAttemptAt),expected);
  await m.step();assert.equal(calls,3); // Stopped never restarts itself.
  const persisted=JSON.parse(JSON.stringify(m.value));let restartedCalls=0;
  // Same restore as the CLI, without the previous reader's in-memory cooldown map.
  const restored=new AccountMonitor({initial:{...persisted,state:'idle',failures:0},now:()=>now,collect:async()=>{
   restartedCalls++;throw new Error('401');
  }});
  await restored.step();assert.equal(restartedCalls,0);
  now=expected-1;await restored.step();assert.equal(restartedCalls,0);
  now=expected;await restored.step();assert.equal(restartedCalls,1);
  assert.equal(restored.value.state,'stopped');
 }
});
test('missing or invalid collateral identity on either side never produces numeric changes',()=>{
 for(const sides of [['previous'],['packet'],['previous','packet']]){
  for(const address of [undefined,null,'', 'not-an-address','0x1234']){
   const f=monitorExample();
   for(const side of sides){for(const t of f[side].snapshot.context.tokens)t.address=address;rebuild(f[side]);}
   const rows=accountChanges(f.previous,f.packet).rows;
   assert.equal(rows.length,3);
   for(const r of rows){assert.equal(r.state,'unknown');assert.equal(r.pnlDelta,null);assert.equal(r.markDelta,null);assert.equal(r.bufferDelta,null);assert.deepEqual(r.changed,[]);}
  }
 }
 const invalidId=monitorExample();
 for(const p of [invalidId.previous,invalidId.packet]){
  p.snapshot.context.tokens[0].id=-1;p.snapshot.context.instances[0].collateral_token_id=-1;rebuild(p);
 }
 assert.equal(accountChanges(invalidId.previous,invalidId.packet).rows[0].state,'unknown');
});
test('collateral identity normalizes address case but rejects changed precision or address',()=>{
 const f=monitorExample(),lower='0x'+'ab'.repeat(20);
 f.previous.snapshot.context.tokens[0].address=lower;
 f.packet.snapshot.context.tokens[0].address='0x'+lower.slice(2).toUpperCase();
 rebuild(f.previous);rebuild(f.packet);
 let r=accountChanges(f.previous,f.packet).rows[0];assert.equal(r.state,'compared');assert.equal(r.pnlDelta,-10.5);
 f.packet.snapshot.context.tokens[0].decimals+=1;rebuild(f.packet);
 r=accountChanges(f.previous,f.packet).rows[0];assert.equal(r.state,'unknown');assert.equal(r.pnlDelta,null);
 f.packet.snapshot.context.tokens[0].decimals-=1;f.packet.snapshot.context.tokens[0].address='0x'+'cd'.repeat(20);rebuild(f.packet);
 r=accountChanges(f.previous,f.packet).rows[0];assert.equal(r.state,'unknown');assert.equal(r.bufferDelta,null);
});
