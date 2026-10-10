import {analyzeAccount} from '../server/account-analysis.mjs';
import {positionRisk} from '../server/risk.mjs';

const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');
export async function verifyObservation(packet){
  if(packet?.schema!=='account-observation-v1'||!['private_account_observation','synthetic_account_observation'].includes(packet.classification))throw new Error('请选择只读采集导出的账户观察 JSON，不要导入密钥文件。');
  if(await digest(packet.snapshot)!==packet.snapshotHash||await digest(packet.report)!==packet.reportHash)throw new Error('数据包校验失败，快照或报告已被改动。');
  const report=analyzeAccount(packet.snapshot);
  if(await digest(report)!==packet.reportHash)throw new Error('当前模型无法复现此报告。请重新采集。');
  return packet;
}
export function positionScenario(packet,positionId,accountId,shockPct){
  if(!Number.isFinite(shockPct)||shockPct<=-100||shockPct>100)throw new Error('价格情景超出范围');
  const s=packet.snapshot,p=s.positions.d.find(p=>p.pid===positionId&&p.acc===accountId);
  if(!p)throw new Error('观察包中没有该持仓');
  const market=s.context.markets.find(m=>m.id===p.mkt),base=positionRisk(p,market,s.context,s.now,s.positions.at.t);
  const mark=base.markPrice*(1+shockPct/100),sign=base.direction==='long'?1:-1;
  const pnl=sign*base.size*(mark-base.entryPrice),equity=base.fundingPnl==null?null:base.collateral+pnl+base.fundingPnl;
  return {shockPct,price:mark,grossPnl:pnl,equity,buffer:equity==null||base.maintenanceEstimate==null?null:equity-base.maintenanceEstimate,
    base,classification:'historical_position_scenario',note:'基于保存观察的静态价格冲击；资金保持观察值，不含未来资金、退出费及提前清算。'};
}
export function reviewObservation(packet,positionId,accountId){
  const s=packet.snapshot,p=s.positions.d.find(p=>p.pid===positionId&&p.acc===accountId);
  if(!p)throw new Error('观察包中没有该持仓');
  const r=packet.report.positions.find(r=>r.positionId===positionId&&r.accountId===accountId)?.risk;
  return {classification:'position_observation_review',observedAt:packet.report.evaluatedAt,positionId,accountId,
    observed:r,preTradeBaseline:null,executionDeviation:null,settledPnl:null,chainReceiptVerified:false,
    checks:[{label:'账户与市场身份',status:'观察包内匹配'},{label:'风险模型复算',status:'一致'},
      {label:'交易前预演基线',status:'未提供，不能倒填'},{label:'单笔成交及链上回执',status:'未核验'},
      {label:'实际退出与已实现盈亏',status:'未核验'}],note:'持仓均价与留存入场费用来自API观察，不等同单笔成交回执或已实现收益。'};
}
export async function replayWorkflow(record){
  if(record?.schema!=='account-workflow-review-v1')throw new Error('复盘格式无效');
  await verifyObservation(record.observation);
  const {positionId,accountId}=record.review??{};
  const review=reviewObservation(record.observation,positionId,accountId);
  const scenario=positionScenario(record.observation,positionId,accountId,record.scenario?.shockPct);
  if(await digest(review)!==await digest(record.review)||await digest(scenario)!==await digest(record.scenario))throw new Error('复盘结果与观察不一致');
  return {status:'reproduced',classification:'private_historical_position_review',chainReceiptVerified:false};
}
