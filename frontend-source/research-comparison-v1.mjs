import {hash} from '../server/integrity.mjs';
import {researchReport,MAX_RESEARCH_BYTES} from './research-workspace-v1.mjs';

export const RESEARCH_COMPARISON_SCHEMA='testnet-research-comparison-v1';
export const COMPARISON_METRICS=[
 {key:'adverseBps',label:'入场不利偏差',unit:'bps'},
 {key:'feeDeltaBps',label:'入场费偏差',unit:'bps'},
 {key:'tradingFeeBps',label:'双边交易费',unit:'bps'},
 {key:'fundingBps',label:'资金损益',unit:'bps'},
 {key:'netBps',label:'已实现净损益',unit:'bps'},
 {key:'stressBufferPct',label:'事前压力缓冲 / 名义金额',unit:'%'}
];
const reasons={unsupported:'此生命周期尚不支持核验',needs_baseline:'缺少事前基线',direction_mismatch:'方向不一致',needs_trade:'缺少成交材料',needs_selection:'尚未选择成交',needs_evidence:'成交证据不足',baseline_mismatch:'基线未匹配',partial:'尚未全量退出',needs_exit:'缺少退出证据',duplicate:'重复成交，仅保留一份',conflict:'同一成交存在不同基线或结果，全部排除',invalid_metrics:'数值不完整或超出范围'};
export function sampleStatistics(values){
 if(!values.length)return {n:0,mean:null,median:null,min:null,max:null};
 if(values.some(v=>!Number.isFinite(v)))throw new Error('统计输入必须为有限数字');
 const sorted=[...values].sort((a,b)=>a-b),n=sorted.length;
 return {n,mean:values.reduce((s,v)=>s+v/n,0),median:n%2?sorted[(n-1)/2]:sorted[n/2-1]/2+sorted[n/2]/2,min:sorted[0],max:sorted[n-1]};
}
export function compareResearch(workspace){
 const verified=researchReport(workspace),experiments=new Map(workspace.experiments.map(e=>[e.id,e]));
 const rows=verified.rows.map(r=>{
  const e=experiments.get(r.id),row={id:r.id,title:e.title,source:r.source,state:r.state,included:false,reason:reasons[r.state]??null,identity:r.identity,groupId:null,sample:null};
  if(r.state!=='verified')return row;
  const j=r.journey,b=e.baseline.evidence.preview.result,ctx=e.trade.observation.evidence.account.snapshot.context;
  const market=ctx.markets.find(m=>m.id===j.marketId),instance=ctx.instances.find(i=>i.id===market.instance_id),token=ctx.tokens.find(t=>t.id===instance.collateral_token_id);
  const baseMarket=e.baseline.evidence.preview.context.markets.find(m=>m.id===j.marketId);
  const notional=j.open.execution.notional,sign=j.direction==='空头'?-1:1;
  const sample={notional,leverage:b.input.leverage,durationMs:j.durationMs,openedAt:j.openedAt,
   adverseBps:sign*j.comparison.priceDeviationBps,feeDeltaBps:j.comparison.feeDelta/notional*10000,
   tradingFeeBps:(j.pnl.entryFee+j.pnl.exitFee)/notional*10000,fundingBps:j.pnl.funding/notional*10000,netBps:j.pnl.net/notional*10000,
   stressBufferPct:(b.stressEquity-b.maintenanceEstimate)/b.notional*100,
   entryFee:j.pnl.entryFee,exitFee:j.pnl.exitFee,funding:j.pnl.funding,net:j.pnl.net,adverseCost:j.comparison.adversePriceCost};
  if(!(notional>0)||!(b.notional>0)||Object.values(sample).some(v=>!Number.isFinite(v))){row.reason=reasons.invalid_metrics;return row;}
  const key={source:r.source,chainId:10143,wallet:ctx?e.trade.observation.evidence.account.snapshot.expectedWallet.toLowerCase():null,accountId:j.accountId,
   marketId:j.marketId,instance:instance.address.toLowerCase(),perpetualId:market.perpetual_id,collateral:token.address.toLowerCase(),decimals:token.decimals,direction:j.direction,
   model:b.modelVersion,assumptions:b.assumptions,feeTier:b.feeTier,feeBps:b.feeBps,initialMargin:baseMarket.config.initial_margin,maintenanceMargin:baseMarket.config.maintenance_margin,
   shockPct:b.input.shockPct,hours:b.input.hours,slippageBps:b.input.slippageBps};
  return {...row,reason:null,groupId:hash(key),sample,key,asset:j.asset,unit:j.unit,baselineHash:r.baselineHash};
 });
 // Resolve duplicate identities before grouping: a changed baseline must not create a second sample.
 const identities=new Map();for(const r of rows)if(r.sample){if(!identities.has(r.identity))identities.set(r.identity,[]);identities.get(r.identity).push(r);}
 for(const same of identities.values()){
  const signatures=new Set(same.map(r=>hash({baseline:r.baselineHash,key:r.key,sample:r.sample})));
  if(signatures.size>1){for(const r of same)r.reason=reasons.conflict;continue;}
  same.sort((a,b)=>a.id.localeCompare(b.id));same[0].included=true;
  for(const r of same.slice(1))r.reason=reasons.duplicate;
 }
 const groups=new Map();for(const r of rows.filter(r=>r.included)){
  if(!groups.has(r.groupId))groups.set(r.groupId,{id:r.groupId,key:r.key,asset:r.asset,unit:r.unit,rows:[]});groups.get(r.groupId).rows.push(r);
 }
 const result=[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(g=>({id:g.id,key:g.key,asset:g.asset,unit:g.unit,
  sampleIds:g.rows.map(r=>r.id).sort(),count:g.rows.length,comparable:g.rows.length>=2,
  metrics:Object.fromEntries(COMPARISON_METRICS.map(m=>[m.key,sampleStatistics(g.rows.map(r=>r.sample[m.key]))])),
  notional:sampleStatistics(g.rows.map(r=>r.sample.notional)),leverage:sampleStatistics(g.rows.map(r=>r.sample.leverage)),durationMs:sampleStatistics(g.rows.map(r=>r.sample.durationMs))}));
 return {model:'research-descriptive-v1',rows,groups:result,included:rows.filter(r=>r.included).length,excluded:rows.filter(r=>!r.included).length,
  note:'同口径分组不等于同一市场时点或独立随机样本。仅描述已导入且核验通过的完整生命周期，不推断收益能力、因果或显著性。bps 除特别标明外以实际入场名义金额归一；不利偏差以预估价格为基准，正数表示成交更差。净损益不含 gas。事前压力情景不是收益预测。文件复算不认证来源或时间。'};
}
export function researchComparisonPacket(workspace){
 const report=compareResearch(workspace),packet={schema:RESEARCH_COMPARISON_SCHEMA,workspace,report,workspaceHash:hash(workspace),reportHash:hash(report)};
 if(new TextEncoder().encode(JSON.stringify(packet,null,2)).length>MAX_RESEARCH_BYTES)throw new Error('完整对比导出超过8MB，请拆分工作区');return packet;
}
export function replayResearchComparison(packet){
 if(packet?.schema!==RESEARCH_COMPARISON_SCHEMA)throw new Error('请选择跨实验对比文件');
 const expected=researchComparisonPacket(packet.workspace);if(hash(expected)!==hash(packet))throw new Error('跨实验对比无法复算');
 return {status:'reproduced',...expected.report};
}
