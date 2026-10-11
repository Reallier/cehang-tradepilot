import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedReview} from '../server/guided-review.mjs';
import {workspaceReview} from '../frontend-source/trade-review.mjs';
import {hash} from '../server/integrity.mjs';
import {newExperiment,attachResearchEvidence,researchReport,researchPacket,replayResearch,parseResearchFile,MAX_RESEARCH_BYTES} from '../frontend-source/research-workspace.mjs';
const complete=()=>attachResearchEvidence(newExperiment('long_full'),guidedReview());
const report=e=>researchReport({experiments:[e]});
test('research derives lifecycle coverage, separates synthetic evidence and deduplicates repeated trades',()=>{
 const a=complete(),b={...a,id:crypto.randomUUID()};const w={experiments:[a,b]};const p=researchPacket(w);
 assert.equal(p.report.syntheticVerified,1);assert.equal(p.report.savedTestnetVerified,0);assert.ok(p.report.rows.every(r=>r.duplicate&&r.state==='verified'));
 assert.equal(replayResearch(p).status,'reproduced');assert.deepEqual(parseResearchFile(JSON.stringify(p,null,2)),w);
});
test('draft, direction mismatch and unsupported experiments cannot inflate coverage',()=>{
 const e=newExperiment('short_full');assert.equal(report(e).rows[0].state,'needs_baseline');
 const short=attachResearchEvidence(e,guidedReview());assert.equal(report(short).rows[0].state,'direction_mismatch');
 for(const kind of ['partial','funding','monitor','size_leverage']){const p=report({...complete(),kind});assert.equal(p.rows[0].state,'unsupported');assert.equal(p.syntheticVerified,0);}
});
test('raw trade preserves baseline; explicit null in restored review removes stale baseline',()=>{
 const p=guidedReview(),e=attachResearchEvidence(newExperiment('long_full'),p.baseline);
 assert.equal(report(e).rows[0].state,'needs_trade');const t=attachResearchEvidence(e,p.trade);assert.equal(report(t).rows[0].state,'verified');
 const cleared=attachResearchEvidence(t,workspaceReview(p.trade,null));assert.equal(cleared.baseline,null);assert.equal(report(cleared).rows[0].state,'needs_baseline');
});
test('rewriting report, unknown selection, duplicate IDs and malformed or oversized archives fail closed',()=>{
 const p=researchPacket({experiments:[complete()]});p.report.savedTestnetVerified=99;p.reportHash=hash(p.report);assert.throws(()=>replayResearch(p),/复算/);
 const e=complete();assert.throws(()=>report({...e,journeyId:'unknown'}));assert.throws(()=>researchReport({experiments:[e,e]}));assert.throws(()=>report({...e,id:'------------------------------------'}));
 assert.throws(()=>parseResearchFile('invalid'));assert.throws(()=>parseResearchFile(' '.repeat(MAX_RESEARCH_BYTES+1)));assert.throws(()=>report({...e,notes:'x'.repeat(2001)}));
});
test('import rejects altered trade evidence instead of trusting stored status',()=>{
 const p=guidedReview();p.trade.report.closed[0].status='made_up';assert.throws(()=>attachResearchEvidence(newExperiment('long_full'),p));
});
