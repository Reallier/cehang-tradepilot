import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {guidedReview} from '../server/guided-review.mjs';
import {hash} from '../server/integrity.mjs';
import {newExperiment,attachResearchEvidence,researchPacket,replayResearch} from '../frontend-source/research-workspace.mjs';
import {experimentProgress} from '../frontend-source/research-progress.mjs';
import {archiveExperiment} from '../server/research-archive.mjs';
import {replayResearchComparison} from '../frontend-source/research-comparison.mjs';
const target={schema:'testnet-receipt-target-v1',chainId:10143,accountId:1,marketId:1,openingOrderId:9};
function sample(){
 const p=guidedReview(),e=attachResearchEvidence(newExperiment('long_full'),p.baseline);
 const history=structuredClone(p.trade.observation);history.classification='private_testnet_history';
 return {workspace:researchPacket({experiments:[e]}),history,experimentId:e.id,target};
}
test('baseline window expires without mutating evidence; matched historical trades never require refresh',()=>{
 const s=sample(),e=s.workspace.workspace.experiments[0],r=s.workspace.report.rows[0],expiry=Date.parse(e.baseline.evidence.validUntil),saved=Date.parse(e.baseline.evidence.savedAt),before=hash(e);
 assert.equal(experimentProgress(e,r,expiry-1500).remainingSeconds,2);
 assert.equal(experimentProgress(e,r,expiry).window,'valid');
 assert.equal(experimentProgress(e,r,expiry+1).window,'expired');
 assert.equal(experimentProgress(e,r,saved-1).window,'clock_invalid');assert.equal(hash(e),before);
 const a=archiveExperiment({...s,now:expiry+999999});assert.equal(a.summary.progress.comparison,'matched');assert.equal(a.summary.progress.settlement,'verified');assert.equal(a.summary.progress.eligible,true);assert.match(a.summary.progress.next,/导出归档/);
});
test('offline archive preserves baseline, existing experiments and source; all outputs independently replay',()=>{
 const s=sample(),before=hash(s),a=archiveExperiment(s);
 assert.equal(hash(s),before);assert.deepEqual(a.research.workspace.experiments[0].baseline,s.workspace.workspace.experiments[0].baseline);
 assert.equal(replayResearch(a.research).savedTestnetVerified,1);assert.equal(replayResearchComparison(a.comparison).included,1);
 assert.equal(a.summary.progress.opening,'verified');assert.equal(a.summary.progress.settlement,'verified');
});
test('late execution still reconciles settlement while excluded from baseline comparison',()=>{
 const s=sample(),o=s.history;
 // Shift all history event times together; saved pretrade evidence stays untouched.
 for(const h of Object.values(o.evidence.histories))for(const page of h.pages)for(const row of page.value.d)row.at.t+=300000;
 o.evidenceHash=hash(o.evidence);
 const a=archiveExperiment(s);assert.equal(a.summary.progress.opening,'verified');assert.equal(a.summary.progress.settlement,'verified');assert.equal(a.summary.state,'baseline_mismatch');assert.equal(a.comparison.report.included,0);assert.match(a.summary.progress.next,/保留本次结算/);
});
test('archive refuses wrong targets, changed selection, synthetic material and tampering',()=>{
 const s=sample();assert.throws(()=>archiveExperiment({...s,target:{...target,openingOrderId:999}}));
 assert.throws(()=>archiveExperiment({...s,experimentId:crypto.randomUUID()}));
 assert.throws(()=>archiveExperiment({...s,history:guidedReview().trade.observation}),/PRIVATE_HISTORY/);
 const a=archiveExperiment(s);assert.throws(()=>archiveExperiment({...s,workspace:a.research,target:{...target,openingOrderId:999}}),/TARGET_CHANGED/);
 s.history.evidence.histories['fills'].pages[0].value.d[0].p++;assert.throws(()=>archiveExperiment(s));
});
test('CLI writes private complete archive once, leaves input bytes untouched and refuses overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tradepilot-archive-'));
 try{
  const s=sample();for(const key of ['workspace','history','target'])fs.writeFileSync(path.join(dir,key+'.json'),JSON.stringify(s[key]));
  const input=fs.readFileSync(path.join(dir,'workspace.json'));
  const output=path.join(dir,'out'),args=['scripts/archive-experiment.mjs','--workspace',path.join(dir,'workspace.json'),'--history',path.join(dir,'history.json'),'--target',path.join(dir,'target.json'),'--experiment',s.experimentId,'--output-dir',output];
  const r=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.ok(fs.existsSync(path.join(output,'COMPLETE')));assert.equal(fs.statSync(output).mode&0o777,0o700);
  for(const f of ['research.json','comparison.json','summary.json'])assert.equal(fs.statSync(path.join(output,f)).mode&0o777,0o600);
  assert.deepEqual(fs.readFileSync(path.join(dir,'workspace.json')),input);assert.equal(spawnSync(process.execPath,args).status,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
