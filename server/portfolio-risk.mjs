import {analyzeAccount} from './account-analysis.mjs';
import {hash} from './integrity.mjs';

export const PORTFOLIO_SCHEMA='account-portfolio-review-v1';
const finite=Number.isFinite;
function observation(packet){
 if(packet?.schema!=='account-observation-v1'||!['private_account_observation','synthetic_account_observation'].includes(packet.classification))throw new Error('需要账户观察包');
 if(hash(packet.snapshot)!==packet.snapshotHash||hash(packet.report)!==packet.reportHash||hash(analyzeAccount(packet.snapshot))!==packet.reportHash)throw new Error('观察包无法复算');
}
// No wallet/free balance is added: isolated collateral cannot offset another position's deficit.
export function portfolioRisk(packet,shockPct){
 if(!finite(shockPct)||shockPct<=-100||shockPct>100)throw new Error('价格冲击必须大于 -100% 且不超过 100%');
 observation(packet);
 const {snapshot:s,report}=packet,groups=new Map();
 const rows=report.positions.map(p=>{
  const account=s.wallet.as.find(a=>a.id===p.accountId),instance=s.context.instances.find(i=>i.id===account.in);
  const token=s.context.tokens.find(t=>t.id===instance.collateral_token_id);
  const identified=Boolean(token&&Number.isSafeInteger(token.id)&&/^0x[\da-f]{40}$/i.test(token.address)&&Number.isInteger(token.decimals));
  const key=JSON.stringify([report.chainId,account.id,instance.id,identified?token.id:null,identified?token.address.toLowerCase():null]);
  if(!groups.has(key))groups.set(key,{key,accountId:account.id,instanceId:instance.id,tokenId:identified?token.id:null,tokenAddress:identified?token.address.toLowerCase():null,unit:identified?token.symbol:'未知币种',identified,rows:[]});
  const r=p.risk,sign=r?.direction==='long'?1:-1;
  const price=r?r.markPrice*(1+shockPct/100):null;
  const delta=r?sign*r.size*(price-r.markPrice):null;
  const equity=finite(r?.equity)?r.equity+delta:null,buffer=finite(equity)&&finite(r?.maintenanceEstimate)?equity-r.maintenanceEstimate:null;
  const complete=identified&&r?.status!=='incomplete'&&finite(buffer)&&!report.issues.length;
  const row={accountId:p.accountId,positionId:p.positionId,marketId:p.marketId,groupKey:key,asset:r?.asset??`市场 #${p.marketId}`,direction:r?.direction??null,
   markPrice:r?.markPrice??null,scenarioPrice:price,collateral:r?.collateral??null,grossExposure:r?r.size*r.markPrice:null,signedExposure:r?sign*r.size*r.markPrice:null,
   baseEquity:r?.equity??null,scenarioEquity:equity,scenarioPnl:finite(r?.unrealizedPnl)?r.unrealizedPnl+delta:null,deltaPnl:delta,lossContribution:finite(delta)?Math.max(0,-delta):null,
   maintenance:r?.maintenanceEstimate??null,buffer,liquidationEstimate:r?.liquidationEstimate??null,
   distanceToLiquidationPct:finite(r?.liquidationEstimate)?sign*(r.markPrice-r.liquidationEstimate)/r.markPrice*100:null,
   status:!complete?'unknown':buffer<=0?'threshold_crossed':'above_threshold',
   reason:!r?p.reason??'NO_RISK_INPUT':!identified?'TOKEN_IDENTITY_UNKNOWN':report.issues.length?report.issues.join(','):r.status==='incomplete'?'INCOMPLETE_RISK_INPUT':null};
  groups.get(key).rows.push(row);return row;
 });
 const metrics=['collateral','grossExposure','signedExposure','baseEquity','scenarioEquity','scenarioPnl','deltaPnl','lossContribution'];
 const summary=[...groups.values()].map(({rows:items,...g})=>{
  const known=items.filter(r=>r.status!=='unknown'),complete=g.identified&&known.length===items.length;
  const totals=Object.fromEntries(metrics.map(k=>[k,complete?items.reduce((a,r)=>a+r[k],0):null]));
  const knownSubtotal=Object.fromEntries(metrics.map(k=>[k,known.length?known.reduce((a,r)=>a+r[k],0):null]));
  const totalLoss=known.reduce((a,r)=>a+r.lossContribution,0);
  return {...g,positionCount:items.length,knownCount:known.length,unknownCount:items.length-known.length,complete,totals,knownSubtotal,
   thresholdCount:known.filter(r=>r.status==='threshold_crossed').length,
   positions:items.map(r=>({...r,lossSharePct:r.status==='unknown'||!complete||totalLoss===0?null:r.lossContribution/totalLoss*100})).sort((a,b)=>(b.lossContribution??-1)-(a.lossContribution??-1)||a.positionId-b.positionId)};
 });
 return {model:'isolated-portfolio-v1',classification:packet.classification,chainId:report.chainId,observedAt:report.evaluatedAt,shockPct,issues:report.issues,
  positionCount:rows.length,accountCount:report.accountCount,unknownCount:rows.filter(r=>r.status==='unknown').length,
  thresholdCount:rows.filter(r=>r.status==='threshold_crossed').length,groups:summary,
  note:'同一百分比冲击应用于所有观察标记价；沿用逐仓模型，资金保持观察值。损益变化相对观察时刻，情景未实现盈亏相对入场。不含未来资金、退出费、Gas或提前清算路径；超过阈值后的数值不可视为可实现损益。各组不互相抵押，不计入账户可用余额。'};
}
export function portfolioPacket(observation,shockPct){
 const report=portfolioRisk(observation,shockPct);
 return {schema:PORTFOLIO_SCHEMA,observation,shockPct,report,reportHash:hash(report)};
}
export function replayPortfolio(packet){
 if(packet?.schema!==PORTFOLIO_SCHEMA)throw new Error('账户总览格式无效');
 const expected=portfolioPacket(packet.observation,packet.shockPct);
 if(hash(expected)!==hash(packet))throw new Error('账户总览结果与观察不一致');
 return {status:'reproduced',classification:expected.report.classification,positions:expected.report.positionCount,groups:expected.report.groups.length,chainReceiptVerified:false};
}
