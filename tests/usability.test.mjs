import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../server/store.mjs';
import {comparePlans} from '../server/comparison.mjs';
import {saveStudy,readStudies,TASK_IDS} from '../server/usability.mjs';
import {fixture} from './risk-fixture.mjs';
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'tp-study-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const store=new Store(root),f=fixture(),comparison=store.create('comparison',comparePlans({...f,inputs:[f.input,f.input]}));const d={participant:'P-01',origin:'external',consent:true,role:'',notes:'',comparisonId:comparison.id,tasks:TASK_IDS.map(id=>({id,outcome:'unassisted',seconds:null}))};return {store,d,comparison};}
test('observer sessions remain separate by origin; unmeasured time stays unknown and unattempted tasks are excluded',t=>{
 const {store,d}=setup(t);saveStudy(store,d);saveStudy(store,{...d,origin:'automated',tasks:d.tasks.map(x=>({...x,seconds:100}))});
 saveStudy(store,{...d,tasks:d.tasks.map(x=>({...x,outcome:x.id==='limits'?'not_attempted':'assisted',seconds:x.id==='limits'?null:10}))});
 const s=readStudies(store),external=s.summaries.find(x=>x.origin==='external');assert.equal(external.sessions,2);assert.equal(external.tasks[0].unassistedRate,.5);assert.equal(external.tasks[0].meanSeconds,10);assert.equal(external.tasks[0].measured,1);assert.equal(external.tasks[3].attempted,1);assert.equal(external.tasks[3].meanSeconds,null);assert.ok(s.records.every(x=>x.verifiedInterview===false));
});
test('reject duplicate tasks, fabricated invalid timings, absent consent and arbitrary evidence IDs',t=>{
 const {store,d}=setup(t);for(const bad of [{...d,consent:false},{...d,participant:'a@b.com'},{...d,comparisonId:'../secret'}, {...d,tasks:[d.tasks[0],d.tasks[0],d.tasks[2],d.tasks[3]]}, ...['1',NaN,-1].map(seconds=>({...d,tasks:d.tasks.map(x=>({...x,seconds}))})), {...d,tasks:d.tasks.map(x=>({...x,outcome:'not_attempted',seconds:0}))}])assert.throws(()=>saveStudy(store,bad));assert.equal(store.list('usability_').length,0);
});
test('changed or deleted linked comparison invalidates sessions without concealing them',t=>{
 const {store,d,comparison}=setup(t);saveStudy(store,d);const changed={...comparison,asset:'changed'};store.save(comparison.id,changed);let s=readStudies(store);assert.equal(s.records[0].integrity,'invalid');assert.equal(s.summaries.find(x=>x.origin==='external').sessions,0);fs.rmSync(path.join(store.root,comparison.id+'.json'));s=readStudies(store);assert.equal(s.records.length,1);assert.equal(s.records[0].integrity,'invalid');
});
