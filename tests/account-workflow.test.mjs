import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {hash} from '../server/store.mjs';
import {positionExample} from '../server/position-examples.mjs';
import {analyzeAccount} from '../server/account-analysis.mjs';
import {verifyObservation,positionScenario,reviewObservation,replayWorkflow} from '../frontend-source/account-workflow.mjs';
import {localObservation} from '../server/local-observation.mjs';
function fixture(){
 const f=positionExample('long'),expectedWallet='0x'+'3'.repeat(40);
 const snapshot={expectedWallet,context:f.context,positions:{mt:26,sn:100,at:f.snapshotAt,d:[f.position]},wallet:{mt:19,sn:100,at:f.snapshotAt,addr:expectedWallet,as:[{id:1,in:1,ft:1,b:'20000000',lb:'1000000',fr:false,fw:false}]},rpcChainId:10143,rpcHead:100,now:f.now};
 const report=analyzeAccount(snapshot);return {schema:'account-observation-v1',classification:'private_account_observation',snapshot,snapshotHash:hash(snapshot),report,reportHash:hash(report)};
}
test('browser verification rejects tampered/rehashed reports and foreign account data',async()=>{
 const p=fixture();assert.equal(await verifyObservation(p),p);
 p.report.positions[0].risk.equity=999;p.reportHash=hash(p.report);await assert.rejects(verifyObservation(p),/复现/);
 const q=fixture();q.snapshot.wallet.addr='0x'+'4'.repeat(40);q.snapshotHash=hash(q.snapshot);await assert.rejects(verifyObservation(q),/IDENTITY/);
});
test('historical stress and review preserve unknown execution evidence and independently reproducible arithmetic',async()=>{
 const p=fixture(),s=positionScenario(p,1,1,-20);
 assert.equal(s.price,84);assert.equal(s.grossPnl,-16);assert.equal(s.equity,3);assert.equal(s.buffer,-2);
 const review=reviewObservation(p,1,1);assert.equal(review.executionDeviation,null);assert.equal(review.chainReceiptVerified,false);
 const record={schema:'account-workflow-review-v1',observation:p,scenario:s,review};assert.equal((await replayWorkflow(record)).status,'reproduced');
 record.scenario.buffer=100;await assert.rejects(replayWorkflow(record),/不一致/);
 const q=fixture();delete q.snapshot.context.markets[0].funding;
 assert.equal(positionScenario(q,1,1,10).equity,null);
});
test('private file access is restricted to explicit loopback-only local configuration',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tp-local-observation-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const filename=path.join(root,'observation.json');fs.writeFileSync(filename,JSON.stringify(fixture()));
 const config={host:'127.0.0.1',secure:false,basePath:'',origins:['http://127.0.0.1:18781']};
 assert.equal(localObservation(config,filename).available,true);
 for(const change of [{secure:true},{host:'0.0.0.0'},{basePath:'/demos/tradepilot'},{origins:['http://evil.example']}])assert.deepEqual(localObservation({...config,...change},'/does/not/exist'),{available:false});
 const p=fixture();p.report.status='forged';fs.writeFileSync(filename,JSON.stringify(p));assert.throws(()=>localObservation(config,filename),/REPLAY/);
});
