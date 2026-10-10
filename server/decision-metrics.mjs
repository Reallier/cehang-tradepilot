import {hash} from './integrity.mjs';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function decisionLimits(input={}){
 const result={};
 for(const key of ['maxMargin','maxLoss']){
  const v=input[key];
  if(v==null||v===''){result[key]=null;continue;}
  if(!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1e9)throw new Error('预算须为0至10亿的数值，留空表示不设此项约束');
  result[key]=Number(v);
 }
 return result;
}
export function planDecision(comparison,limitsInput={}){
 const limits=decisionLimits(limitsInput);
 return {version:'plan-decision-v1',limits,plans:comparison.results.map((r,index)=>{
  const complete=r.depthComplete===true;
  const totalCost=finite(r.fundingEstimate)&&finite(r.entryFee)&&finite(r.exitFee)?r.entryFee+r.exitFee+r.fundingEstimate:null;
  const scenarioLoss=finite(r.netPnl)?Math.max(0,-r.netPnl):null;
  const buffer=finite(r.stressEquity)&&finite(r.maintenanceEstimate)?r.stressEquity-r.maintenanceEstimate:null;
  const checks=[['maxMargin','保证金预算',r.margin],['maxLoss','所选情景净亏损',scenarioLoss]].map(([key,label,value])=>({key,label,limit:limits[key],value,status:limits[key]==null?'unset':!complete||!finite(value)?'unknown':value>limits[key]?'exceeded':'within'}));
  const status=!complete||!finite(r.netPnl)||!finite(buffer)?'unknown':!r.riskPass?'model_blocked':checks.some(c=>c.status==='exceeded')?'over_budget':checks.every(c=>c.status==='unset')?'unconstrained':'within_budget';
  return {index,totalCost,scenarioLoss,marginBuffer:buffer,coveragePct:finite(r.size)&&r.size>0&&finite(r.matchedSize)?Math.min(100,100*r.matchedSize/r.size):null,checks,status};
 })};
}
export function decisionPacket(comparison,limits){
 const report=planDecision(comparison,limits);
 const evidence={comparison,limits:report.limits};
 return {schema:'plan-decision-review-v1',evidence,evidenceHash:hash(evidence),report,reportHash:hash(report)};
}
export function alternativePreset(input,kind){
 const base={notional:Number(input.notional),leverage:Number(input.leverage),hours:Number(input.hours)};
 if(kind==='half')base.notional=Math.max(1,base.notional/2);
 if(kind==='leverage')base.leverage=Math.max(1,base.leverage/2);
 return base;
}
