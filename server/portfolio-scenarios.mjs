import {portfolioRisk} from './portfolio-risk.mjs';
import {hash} from './integrity.mjs';
export const SCENARIO_SCHEMA='account-portfolio-scenario-v1';
const number=(v,min,max,name)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error(name+'超出范围');return v;};
export function defaultScenario(observation){return {hours:8,markets:[...new Set(observation.report.positions.map(p=>p.marketId))].map(marketId=>{const m=observation.snapshot.context.markets.find(m=>m.id===marketId);return {marketId,shockPct:-10,fundingBps:Number.isFinite(m?.funding?.rate)?m.funding.rate/100:null,exitSlippageBps:10,exitDepthPct:100};})};}
export function portfolioScenario(observation,scenario){
 const base=portfolioRisk(observation,0),s=observation.snapshot;
 if(!scenario||Object.keys(scenario).sort().join()!=='hours,markets'||!Array.isArray(scenario.markets))throw new Error('情景格式无效');
 number(scenario.hours,0,168,'持有时间');const ids=new Set(base.groups.flatMap(g=>g.positions.map(p=>p.marketId))),inputs=new Map();
 for(const m of scenario.markets){if(!m||Object.keys(m).sort().join()!=='exitDepthPct,exitSlippageBps,fundingBps,marketId,shockPct'||!ids.has(m.marketId)||inputs.has(m.marketId))throw new Error('情景市场不匹配或重复');number(m.shockPct,-99,100,'价格冲击');if(m.fundingBps!==null)number(m.fundingBps,-1000,1000,'每期资金费率');number(m.exitSlippageBps,0,1000,'退出不利偏差');number(m.exitDepthPct,0,100,'可成交比例');inputs.set(m.marketId,m);}
 if(inputs.size!==ids.size)throw new Error('每个持仓市场都必须指定情景');
 const groups=base.groups.map(g=>{
  const positions=g.positions.map(p=>{
   const x=inputs.get(p.marketId),risk=observation.report.positions.find(r=>r.accountId===p.accountId&&r.positionId===p.positionId).risk,m=s.context.markets.find(m=>m.id===p.marketId),a=s.wallet.as.find(a=>a.id===p.accountId),sign=p.direction==='long'?1:-1;
   const price=p.markPrice==null?null:p.markPrice*(1+x.shockPct/100),delta=price==null||!risk?null:sign*risk.size*(price-p.markPrice);
   const interval=m?.funding_interval_sec,rate=a.ft===0?m?.config.taker_fee:m?.config.taker_fees?.[a.ft];
   const funding=scenario.hours===0?0:x.fundingBps==null||!risk||!Number.isFinite(interval)||interval<=0?null:risk.size*price*x.fundingBps/10000*sign*scenario.hours*3600/interval;
   const covered=risk?risk.size*x.exitDepthPct/100:null,executionPrice=price==null?null:price*(1-sign*x.exitSlippageBps/10000);
   const slippage=covered==null||price==null?null:covered*price*x.exitSlippageBps/10000;
   const exitFee=covered===0?0:covered==null||executionPrice==null||!Number.isFinite(rate)?null:covered*executionPrice*rate/1e6;
   const equity=delta==null||p.baseEquity==null||funding==null?null:p.baseEquity+delta-funding;
   const buffer=equity==null||p.maintenance==null?null:equity-p.maintenance,net=equity==null||exitFee==null||slippage==null?null:equity-exitFee-slippage;
   const complete=p.status!=='unknown'&&[equity,buffer,net].every(Number.isFinite);
   return {accountId:p.accountId,positionId:p.positionId,marketId:p.marketId,asset:p.asset,direction:p.direction,scenarioPrice:price,priceDelta:delta,fundingCost:funding,coveredSize:covered,uncoveredSize:risk&&covered!=null?risk.size-covered:null,exitFee,slippageCost:slippage,preExitEquity:equity,preExitBuffer:buffer,afterCostEquity:net,complete,status:!complete?'unknown':buffer<=0?'threshold_crossed':'above_threshold',loss:complete?Math.max(0,p.baseEquity-net):null};
  });const complete=g.identified&&positions.every(p=>p.complete);
  return {key:g.key,unit:g.unit,tokenAddress:g.tokenAddress,accountId:g.accountId,complete,positions,totals:Object.fromEntries(['priceDelta','fundingCost','exitFee','slippageCost','afterCostEquity','loss'].map(k=>[k,complete?positions.reduce((a,p)=>a+p[k],0):null]))};
 });return {model:'portfolio-scenario-v1',classification:observation.classification,groups,note:'逐市场静态情景；资金费按假设恒定费率和观察期线性估算，不是离散结算证明。可成交比例为用户假设，不读取当前盘口；剩余仓位仍有风险。退出费按观察账户档位，不含Gas及未来规则变化。保证金阈值使用退出前权益；不模拟提前清算，不跨抵押代币合计。'};
}
export function portfolioScenarioPacket(observation,scenario){const report=portfolioScenario(observation,scenario);return {schema:SCENARIO_SCHEMA,observation,scenario,report,reportHash:hash(report)};}
export function replayPortfolioScenario(p){if(p?.schema!==SCENARIO_SCHEMA||hash(portfolioScenarioPacket(p.observation,p.scenario))!==hash(p))throw new Error('逐市场情景无法复算');return {status:'reproduced',groups:p.report.groups.length};}
