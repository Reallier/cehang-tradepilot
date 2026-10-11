import {hash} from '../server/integrity.mjs';
import {verifyBaseline} from '../server/pretrade-baseline.mjs';
import {importTradeReview,workspaceReview,replayWorkspaceReview} from './trade-review.mjs';
import {reviewJourneys} from './review-journeys.mjs';

export const RESEARCH_SCHEMA='testnet-research-workspace-v1',MAX_RESEARCH_BYTES=8*1024*1024;
export const EXPERIMENT_TYPES=[
 {id:'short_full',label:'空头单次开平仓',direction:'空头',supported:true,purpose:'核对空头的预估成交价、交易费、资金损益和完整退出结算。'},
 {id:'long_full',label:'多头单次开平仓',direction:'多头',supported:true,purpose:'核对多头的事前基线、成交偏差和完整退出结算。'},
 {id:'size_leverage',label:'规模与杠杆对照',supported:false,purpose:'先分别建立多头或空头实验；跨实验归因尚未实现。'},
 {id:'partial',label:'分批成交与退出',supported:false,purpose:'多次退出的生命周期核验需要先扩展；现阶段不自动判定实验完成。'},
 {id:'funding',label:'跨资金费周期',supported:false,purpose:'需要跨周期观察与资金事件归因；单笔结算不足以验证整个周期。'},
 {id:'monitor',label:'长时间只读观察',supported:false,purpose:'需要观察完整率、间隔和恢复证据；交易记录不能替代采集质量验收。'}
];
export function emptyResearch(){return {experiments:[]};}
export function newExperiment(kind,id=crypto.randomUUID(),now=Date.now()){
 const type=EXPERIMENT_TYPES.find(t=>t.id===kind);if(!type)throw new Error('未知实验类型');
 return {id,kind,title:type.label,purpose:type.purpose,notes:'',createdAt:new Date(now).toISOString(),baseline:null,trade:null,journeyId:null};
}
function text(value,max){if(typeof value!=='string'||value.length>max)throw new Error('实验文字超出长度或格式要求');}
function testnetBaseline(p){verifyBaseline(p);if(p.evidence.preview.network!=='testnet'||p.evidence.preview.result.chainId!==10143)throw new Error('实验台只接受 Monad 测试网基线');}
function rowsFor(e){
 if(e.baseline)testnetBaseline(e.baseline);
 if(!e.trade)return [];
 const c=e.trade.observation.classification;
 if(!['private_testnet_history','synthetic_testnet_history'].includes(c)||e.trade.observation.evidence.account.report.chainId!==10143)throw new Error('成交材料不是受支持的测试网观察');
 return reviewJourneys(workspaceReview(e.trade,e.baseline)).items;
}
export function researchReport(workspace){
 if(!workspace||Object.keys(workspace).join()!=='experiments'||!Array.isArray(workspace.experiments)||workspace.experiments.length>20)throw new Error('研究工作区最多包含20轮实验');
 if(new TextEncoder().encode(JSON.stringify(workspace)).length>MAX_RESEARCH_BYTES)throw new Error('研究工作区超过8MB，请拆分保存');
 const ids=new Set(),rows=workspace.experiments.map(e=>{
  if(!e||Object.keys(e).sort().join()!==['id','kind','title','purpose','notes','createdAt','baseline','trade','journeyId'].sort().join()||
   typeof e.id!=='string'||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(e.id)||ids.has(e.id)||!Number.isFinite(Date.parse(e.createdAt)))throw new Error('实验标识或结构无效');
  ids.add(e.id);text(e.title,120);text(e.purpose,800);text(e.notes,2000);
  if(e.journeyId!==null&&typeof e.journeyId!=='string')throw new Error('成交选择无效');
  const type=EXPERIMENT_TYPES.find(t=>t.id===e.kind);if(!type)throw new Error('未知实验类型');
  const journeys=rowsFor(e),j=journeys.find(j=>j.id===e.journeyId);
  if(e.journeyId!==null&&!j)throw new Error('所选成交不在当前证据中');
  const source=e.trade?(e.trade.observation.classification==='synthetic_testnet_history'?'synthetic':'saved_testnet'):'none';
  const direction=e.baseline?.evidence.preview.result.input.direction;
  let state=!type.supported?'unsupported':!e.baseline?'needs_baseline':direction!==(e.kind==='short_full'?'short':'long')?'direction_mismatch':!e.trade?'needs_trade':!j?'needs_selection':j.direction!==type.direction?'direction_mismatch':j.open.status!=='opening_reconciled'?'needs_evidence':j.comparison?.status!=='compared'?'baseline_mismatch':j.state==='closed'?'verified':j.state==='partial'?'partial':j.state==='exit_missing'?'needs_exit':'needs_evidence';
  const identity=j?JSON.stringify([source,10143,e.trade.observation.evidence.account.snapshot.expectedWallet.toLowerCase(),j.accountId,j.marketId,j.open.orderId,j.open.txHash]):null;
  return {id:e.id,kind:e.kind,state,source,identity,duplicate:false,journey:j??null,
   choices:journeys.map(j=>({id:j.id,label:`${j.asset} · ${j.direction} · #${j.open.orderId}`})),
   baselineHash:e.baseline?.evidenceHash??null,
   note:'复算保存的文件，不实时查询链、不认证文件来源或保存时间；不证明策略收益。'};
 });
 const counts=new Map();for(const r of rows)if(r.identity)counts.set(r.identity,(counts.get(r.identity)??0)+1);
 for(const r of rows)r.duplicate=!!r.identity&&counts.get(r.identity)>1;
 const unique=source=>new Set(rows.filter(r=>r.state==='verified'&&r.source===source).map(r=>r.identity)).size;
 return {rows,experiments:rows.length,savedTestnetVerified:unique('saved_testnet'),syntheticVerified:unique('synthetic'),
  coverage:EXPERIMENT_TYPES.map(t=>({kind:t.id,supported:t.supported,savedTestnet:new Set(rows.filter(r=>r.kind===t.id&&r.state==='verified'&&r.source==='saved_testnet').map(r=>r.identity)).size,synthetic:new Set(rows.filter(r=>r.kind===t.id&&r.state==='verified'&&r.source==='synthetic').map(r=>r.identity)).size}))};
}
export function researchPacket(workspace){const report=researchReport(workspace);const packet={schema:RESEARCH_SCHEMA,workspace,report,workspaceHash:hash(workspace),reportHash:hash(report)};if(new TextEncoder().encode(JSON.stringify(packet,null,2)).length>MAX_RESEARCH_BYTES)throw new Error('完整导出超过8MB，请拆分工作区');return packet;}
export function replayResearch(p){
 if(p?.schema!==RESEARCH_SCHEMA)throw new Error('请选择测试网研究工作区文件');
 const expected=researchPacket(p.workspace);if(hash(expected)!==hash(p))throw new Error('研究工作区无法复算');
 return {status:'reproduced',...expected.report};
}
export function attachResearchEvidence(experiment,packet){
 let e={...experiment};
 if(packet?.schema==='pretrade-baseline-v1'){testnetBaseline(packet);e.baseline=structuredClone(packet);}
 else if(packet?.schema==='account-trade-workspace-v1'){replayWorkspaceReview(packet);e.trade=structuredClone(packet.trade);e.baseline=structuredClone(packet.baseline);e.journeyId=null;}
 else {e.trade=structuredClone(importTradeReview(packet));e.journeyId=null;}
 const rows=rowsFor(e),matched=rows.filter(j=>j.comparison?.status==='compared');
 if(!rows.some(j=>j.id===e.journeyId))e.journeyId=matched.length===1?matched[0].id:rows.length===1?rows[0].id:null;
 researchReport({experiments:[e]});return e;
}
export function parseResearchFile(raw){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_RESEARCH_BYTES)throw new Error('研究文件超过8MB');
 const p=JSON.parse(raw);replayResearch(p);return p.workspace;
}
