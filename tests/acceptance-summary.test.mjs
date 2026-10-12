import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptanceSummary} from '../server/acceptance-summary.mjs';
import {lifecycle} from './settlement-fixture.mjs';
import {guidedReview} from '../server/guided-review.mjs';
import {newExperiment,attachResearchEvidence,researchPacket} from '../frontend-source/research-workspace.mjs';
const packet=(raw=lifecycle())=>researchPacket({experiments:[attachResearchEvidence(newExperiment('long_full'),raw)]});
test('acceptance summary deduplicates repeated private archives without releasing identities or financial values',()=>{
 const p=packet(),out=acceptanceSummary([p,p],'2026-10-12');assert.equal(out.counts.closedLifecycles,1);assert.equal(out.counts.longFull,1);assert.equal(out.counts.baselineMatched,0);assert.equal(out.independentlyVerifiableFromSummary,false);
 assert.deepEqual(Object.keys(out).sort(),['schema','reviewedOn','chainId','source','independentlyVerifiableFromSummary','counts','checks','limitation'].sort());
 const text=JSON.stringify(out);assert.ok(!/0x[0-9a-f]{40}|wallet|txHash|realizedPnl|accountId|orderId/i.test(text));
});
test('acceptance summary excludes unfinished exits and refuses synthetic or corrupted input',()=>{
 assert.equal(acceptanceSummary([packet(lifecycle({partial:true}))],'2026-10-12').counts.closedLifecycles,0);
 const synthetic=researchPacket({experiments:[attachResearchEvidence(newExperiment('long_full'),guidedReview())]});assert.throws(()=>acceptanceSummary([synthetic],'2026-10-12'),/private testnet/);
 const corrupt=packet();corrupt.report.savedTestnetVerified=999;assert.throws(()=>acceptanceSummary([corrupt],'2026-10-12'));
 assert.throws(()=>acceptanceSummary([],'2026-10-12'));
});
