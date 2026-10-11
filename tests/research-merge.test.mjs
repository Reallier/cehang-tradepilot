import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../server/integrity.mjs';
import {guidedReview} from '../server/guided-review.mjs';
import {newExperiment,attachResearchEvidence,researchPacket,replayResearch,MAX_RESEARCH_BYTES} from '../frontend-source/research-workspace.mjs';
import {researchComparisonPacket,replayResearchComparison} from '../frontend-source/research-comparison.mjs';
import {mergeResearchFiles} from '../frontend-source/research-merge.mjs';
const raw=workspace=>JSON.stringify(researchPacket(workspace));
const empty=()=>({experiments:[]});

test('merge replays both formats, keeps drafts and order, deduplicates identical IDs, and exports replayable results',()=>{
 const draft=newExperiment('short_full');draft.notes='Unexported notes';
 const current={experiments:[draft]},e=attachResearchEvidence(newExperiment('long_full'),guidedReview()),incoming={experiments:[e]},before=hash(current);
 const result=mergeResearchFiles(current,[raw(incoming),JSON.stringify(researchComparisonPacket(incoming))]);
 assert.deepEqual(result.summary,{files:2,added:1,existing:1,total:2});assert.equal(hash(current),before);
 assert.deepEqual(result.workspace.experiments[0],draft);assert.notEqual(result.workspace.experiments[0],draft);
 assert.equal(replayResearch(researchPacket(result.workspace)).syntheticVerified,1);
 assert.equal(replayResearchComparison(researchComparisonPacket(result.workspace)).included,1);
});

test('a late invalid file or version conflict rejects the entire batch without modifying source',()=>{
 const current={experiments:[newExperiment('short_full')]},before=hash(current),incoming={experiments:[newExperiment('long_full')]};
 assert.throws(()=>mergeResearchFiles(current,[raw(incoming),'{']),/第2个档案/);
 const changed=structuredClone(incoming);changed.experiments[0].notes='different';
 assert.throws(()=>mergeResearchFiles(current,[raw(incoming),raw(changed)]),/不同版本/);
 const localChange=structuredClone(current);localChange.experiments[0].title='locally edited';
 assert.throws(()=>mergeResearchFiles(localChange,[raw(current)]),/不同版本/);
 const tampered=researchComparisonPacket(incoming);tampered.report.included=99;
 assert.throws(()=>mergeResearchFiles(current,[raw(incoming),JSON.stringify(tampered)]),/第2个档案/);
 assert.equal(hash(current),before);
});

test('distinct experiment IDs referencing one lifecycle do not inflate comparison samples',()=>{
 const e=attachResearchEvidence(newExperiment('long_full'),guidedReview()),duplicate={...structuredClone(e),id:crypto.randomUUID()};
 const {workspace}=mergeResearchFiles(empty(),[raw({experiments:[e]}),raw({experiments:[duplicate]})]);
 assert.equal(workspace.experiments.length,2);assert.equal(researchPacket(workspace).report.syntheticVerified,1);
 assert.equal(researchComparisonPacket(workspace).report.included,1);
});

test('merge enforces file count, actual UTF-8 bytes and final experiment limit before returning state',()=>{
 assert.throws(()=>mergeResearchFiles(empty(),[]));assert.throws(()=>mergeResearchFiles(empty(),Array(21).fill(raw(empty()))));
 const large=' '.repeat(MAX_RESEARCH_BYTES/2);
 assert.throws(()=>mergeResearchFiles(empty(),[large,large+' ']),/总计超过8MB/);
 assert.throws(()=>mergeResearchFiles(empty(),['中'.repeat(Math.floor(MAX_RESEARCH_BYTES/3)+1)]),/总计超过8MB/);
 const current={experiments:Array.from({length:20},()=>newExperiment('short_full'))};
 assert.throws(()=>mergeResearchFiles(current,[raw({experiments:[newExperiment('long_full')]})]),/超过20轮/);
 assert.equal(current.experiments.length,20);
 assert.deepEqual(mergeResearchFiles(current,[raw(current)]).summary,{files:1,added:0,existing:20,total:20});
});
