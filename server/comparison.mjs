import {simulate,MODEL_VERSION} from './risk.mjs';
import {hash} from './integrity.mjs';

export function comparePlans({market,context,book,inputs,now=Date.now()}) {
  if(!Array.isArray(inputs)||inputs.length!==2)throw new Error('需提供恰好两个交易方案');
  if(inputs.some(i=>!i||typeof i!=='object'||Array.isArray(i)))throw new Error('交易方案输入无效');
  const results=inputs.map(input=>simulate({market,context,book,input,now}));
  return {classification:'simulation_comparison',modelVersion:MODEL_VERSION,
    evaluatedAt:new Date(now).toISOString(),marketId:market.id,asset:results[0].asset,
    collateral:results[0].collateral,chainId:context.chain.chain_id,
    originalInput:inputs,inputHash:hash(inputs),
    snapshotHashes:{context:hash(context),book:hash(book)},context,book,results};
}

// Check the whole model result, including blockers, nulls and stress rows.
// Hashes detect changes against the record, not source authenticity.
function equalResult(actual,expected,field='result') {
  if(typeof actual==='number') {
    if(typeof expected!=='number'||!Number.isFinite(expected)||!Number.isFinite(actual)||
      Math.abs(actual-expected)>Math.max(1e-9,Math.abs(actual)*1e-12))throw new Error(`复算不一致: ${field}`);
    return;
  }
  if(actual===null||typeof actual!=='object') {
    if(actual!==expected)throw new Error(`复算不一致: ${field}`);
    return;
  }
  if(!expected||typeof expected!=='object'||Array.isArray(actual)!==Array.isArray(expected)||
    Object.keys(actual).length!==Object.keys(expected).length)throw new Error(`复算结构不一致: ${field}`);
  for(const key of Object.keys(actual))equalResult(actual[key],expected[key],`${field}.${key}`);
}

export function replayComparison(record) {
  if(!/^comparison_[a-f0-9-]{36}$/.test(record.id??'')||record.classification!=='simulation_comparison'||
    record.modelVersion!==MODEL_VERSION||!record.context||!record.book)throw new Error('需要当前模型的完整方案对比证据');
  if(hash(record.originalInput)!==record.inputHash)throw new Error('对比输入哈希不一致');
  if(hash(record.context)!==record.snapshotHashes?.context||hash(record.book)!==record.snapshotHashes?.book)throw new Error('公共快照哈希不一致');
  const now=Date.parse(record.evaluatedAt),market=record.context.markets.find(m=>m.id===record.marketId);
  if(!Number.isFinite(now)||!market)throw new Error('对比时间或市场无效');
  const reproduced=comparePlans({market,context:record.context,book:record.book,inputs:record.originalInput,now});
  for(const field of ['results','asset','collateral','chainId'])equalResult(reproduced[field],record[field],field);
  return {id:record.id,model:MODEL_VERSION,status:'reproduced',plans:2,checked:'complete model results, risk blockers and stress rows'};
}
