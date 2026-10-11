import test from 'node:test';import assert from 'node:assert/strict';
import {fixture} from './risk-fixture.mjs';import {manualBaselinePreview} from '../server/manual-baseline.mjs';import {createBaseline,verifyBaseline} from '../server/pretrade-baseline.mjs';
test('manual long/short baselines use opposite book sides, preserve raw quantity and adverse shock, and reproduce',()=>{
 const f=fixture();for(const direction of ['long','short']){const p=manualBaselinePreview({...f,marketId:1,rawSize:100,leverage:2,direction});assert.equal(p.result.rawSize,100);assert.equal(p.result.vwap,direction==='long'?100:99);assert.equal(p.result.input.shockPct,direction==='long'?-5:5);const b=createBaseline(p,f.now);verifyBaseline(b);assert.equal(b.evidence.preview.originalInput.direction,direction);}
});
test('manual preparation rejects foreign chains, bad direction, leverage and size, scope excess or missing side',()=>{
 const f=fixture(),base={...f,marketId:1,rawSize:100,direction:'short'};
 for(const override of [{direction:'sell'},{leverage:6},{rawSize:0},{rawSize:1000},{context:{...f.context,chain:{chain_id:143}}},{book:{...f.book,bid:[]}}])assert.throws(()=>manualBaselinePreview({...base,...override}));
});
