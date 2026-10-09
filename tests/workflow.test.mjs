import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store,hash} from '../server/store.mjs';
import {savePreset,readPreset,setPresetArchived,listPresets} from '../server/presets.mjs';
import {RiskWatch,replayWatch} from '../server/risk-watch.mjs';
import {positionExample} from '../server/position-examples.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9);
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tp-flow-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return new Store(dir);}
test('presets persist network/market/normalized inputs, archive reversibly and reject changed or excessive parameters',t=>{
 const store=setup(t),input={direction:'short',notional:'300',leverage:'2',hours:'12',shockPct:'5',slippageBps:'25'},r=savePreset(store,{name:'观察',network:'testnet',marketId:10,input});
 input.notional='500';const restored=readPreset(new Store(store.root),r.id);
 assert.deepEqual(restored.payload.input,{direction:'short',notional:300,leverage:2,hours:12,shockPct:5,slippageBps:25});assert.equal(restored.payload.network,'testnet');assert.equal(restored.payload.marketId,10);assert.equal(restored.previewId,undefined);
 assert.throws(()=>savePreset(store,{...r.payload,name:'观察'}),/同名/);setPresetArchived(store,r.id,true);assert.ok(readPreset(store,r.id).archivedAt);setPresetArchived(store,r.id,false);assert.equal(readPreset(store,r.id).archivedAt,null);
 for(const bad of [{...r.payload,input:{...r.payload.input,notional:0}},{...r.payload,network:'else'},{...r.payload,marketId:null},{...r.payload,input:{...r.payload.input,hours:[]}}])assert.throws(()=>savePreset(store,bad));
 const changed={...r,payload:{...r.payload,input:{...r.payload.input,leverage:99}}};store.save(r.id,changed);assert.throws(()=>readPreset(store,r.id),/校验/);assert.equal(listPresets(store)[0].integrity,'invalid');
 assert.equal(fs.statSync(store.file(r.id)).mode&0o777,0o600);
});
test('risk lifecycle distinguishes caution/insolvency/unknown/error/absence/recovery, no duplicated state alerts',async t=>{
 const store=setup(t);let clock=Date.UTC(2026,9,9,8),networkCalls=0;
 const monitor=new RiskWatch(store,{account:()=>{networkCalls++;throw Error('never');},context:()=>{networkCalls++;throw Error('never');}},{now:()=>clock});
 const w=monitor.add({source:'synthetic',positionId:1,accountId:1,marketId:1,warningBufferPct:50});
 for(const [stage,state,equity,pct] of [['healthy','healthy',24,380],['caution','caution',7,40],['at_risk','at_risk',4,-20],['funding_unknown','incomplete',null,null],['read_error','read_error',null,null],['not_observed','not_observed',null,null],['stale','incomplete',null,null],['recovered','healthy',24,380]]){
  clock+=1000;await monitor.refresh('testnet','synthetic',stage);const r=monitor.get(w.id).history.at(-1).report;assert.equal(r.state,state);assert.equal(r.risk?.equity??null,equity);if(pct==null)assert.equal(r.bufferPct,null);else near(r.bufferPct,pct);
 }
 const before=monitor.get(w.id);clock+=1000;await monitor.refresh('testnet','synthetic','healthy');const after=monitor.get(w.id);
 assert.equal(after.events.length,before.events.length);assert.equal(after.lastGood.report.state,'healthy');assert.equal(networkCalls,0);
 monitor.acknowledge(w.id,after.events.at(-1).id);assert.ok(monitor.get(w.id).events.at(-1).acknowledgedAt);assert.equal(replayWatch(monitor.packet(w.id)).samples,9);
});
test('same-network observed reads coalesce, survive restart budget and scope to exact account/position',async t=>{
 const store=setup(t),f=positionExample('long');let clock=f.now,calls=0,contexts=0;
 const other={...f.position,pid:2,acc:2};
 const perpl={account:async()=>{calls++;await new Promise(resolve=>setImmediate(resolve));return {configured:true,positions:{at:f.snapshotAt,d:[f.position,other]},sources:[]};},context:async()=>{contexts++;return {value:f.context,source:{}};}};
 const monitor=new RiskWatch(store,perpl,{now:()=>clock});
 const a=monitor.add({source:'account',network:'testnet',positionId:1,accountId:1,marketId:1,warningBufferPct:50}),b=monitor.add({source:'account',network:'testnet',positionId:2,accountId:2,marketId:1,warningBufferPct:50});
 const [first,second]=await Promise.all([monitor.refresh('testnet','account'),monitor.refresh('testnet','account')]);assert.deepEqual(first,second);assert.equal(calls,1);assert.equal(contexts,1);assert.equal(first.watches.length,2);
 for(const w of [a,b])assert.equal(monitor.get(w.id).history.at(-1).report.state,'healthy');
 const restarted=new RiskWatch(new Store(store.root),perpl,{now:()=>clock});assert.equal((await restarted.refresh('testnet','account')).cached,true);assert.equal(calls,1);
 clock+=60001;await restarted.refresh('testnet','account');assert.equal(calls,2);assert.equal(restarted.get(a.id).history.at(-1).report.state,'incomplete');
});
test('reader failures retain prior valid evidence; absent or malformed responses cannot imply closure',async t=>{
 const store=setup(t),f=positionExample('long');let clock=f.now,mode='valid';
 const perpl={account:async()=>{if(mode==='error')throw Error('429 已暂停');return {configured:mode!=='unconfigured',positions:{at:{t:clock,b:100},d:mode==='absent'?[]:mode==='malformed'?null:[f.position]},sources:[]};},context:async()=>{f.context.markets[0].state.at.t=clock;return {value:f.context,source:{}};}};
 const m=new RiskWatch(store,perpl,{now:()=>clock}),w=m.add({source:'account',network:'testnet',positionId:1,accountId:1,marketId:1,warningBufferPct:50});
 await m.refresh('testnet','account');const good=m.get(w.id).lastGood.reportHash;
 for(const [value,state] of [['error','read_error'],['absent','not_observed'],['unconfigured','unconfigured'],['malformed','read_error']]){clock+=60001;mode=value;await m.refresh('testnet','account');const saved=m.get(w.id);assert.equal(saved.history.at(-1).report.state,state);assert.equal(saved.lastGood.reportHash,good);assert.equal(saved.history.at(-1).report.risk,null);}
});
test('watch thresholds preserve historical decisions; bounded histories, archive restore and full replay reject tampering',async t=>{
 const store=setup(t);let clock=Date.UTC(2026,9,9,8);const m=new RiskWatch(store,{}, {now:()=>clock}),w=m.add({source:'synthetic',positionId:1,accountId:1,marketId:1,warningBufferPct:50});
 await m.refresh('testnet','synthetic','caution');m.update(w.id,{warningBufferPct:20});clock++;await m.refresh('testnet','synthetic','caution');assert.equal(m.get(w.id).history[0].report.state,'caution');assert.equal(m.get(w.id).history[1].report.state,'healthy');
 m.update(w.id,{archived:true});clock++;await m.refresh('testnet','synthetic','at_risk');assert.equal(m.get(w.id).history.length,2);m.update(w.id,{archived:false});
 for(let i=0;i<35;i++){clock++;await m.refresh('testnet','synthetic',i%2?'healthy':'read_error');}assert.equal(m.get(w.id).history.length,30);assert.equal(m.get(w.id).events.length,30);
 const p=m.packet(w.id);assert.equal(replayWatch(p).status,'reproduced');
 for(const mutate of [x=>x.samples[0].snapshot.watch.positionId=77,x=>x.samples[0].report.state=x.samples[0].report.state==='healthy'?'caution':'healthy',x=>x.classification='account_watch']){const q=structuredClone(p);mutate(q);assert.throws(()=>replayWatch(q));}
 const changed=structuredClone(p);changed.samples[0].report.bufferPct=999;changed.samples[0].reportHash=hash(changed.samples[0].report);assert.throws(()=>replayWatch(changed),/完整结果/);
 assert.throws(()=>m.update(w.id,{warningBufferPct:NaN}));assert.throws(()=>m.get('../secret'));
});
