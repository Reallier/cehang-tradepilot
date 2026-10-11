import {simulate,scenarioInput,bookRows,marketRow} from './risk.mjs';
import {replayComparison} from './comparison.mjs';
import {decisionLimits,planDecision} from './decision-metrics.mjs';
import {hash} from './integrity.mjs';

export const SIZING_SCHEMA='budget-sizing-review-v1';
// Search target notional on a cent grid. Protocol quantity rounding still happens
// in simulate(), identically to previews. This is not a search over leverage.
export function sizingSettings(value={}){
 const max=Number(value.maxNotional),baseIndex=value.baseIndex??0;
 if(!['number','string'].includes(typeof value.maxNotional)||!Number.isFinite(max)||max<1||max>1e7)throw new Error('搜索上限须为1至1000万');
 if(baseIndex!==0&&baseIndex!==1)throw new Error('请选择方案 A 或 B');
 return {baseIndex,maxNotional:Math.floor(max*100+Number.EPSILON*max*200)/100};
}
export function sizeByBudget(comparison,limitsInput,settingsInput){
 replayComparison(comparison);
 const limits=decisionLimits(limitsInput),settings=sizingSettings(settingsInput);
 const market=comparison.context.markets.find(m=>m.id===comparison.marketId),context=comparison.context,book=comparison.book;
 const input=scenarioInput(comparison.originalInput[settings.baseIndex]);
 const base={model:'budget-sizing-v1',evaluatedAt:comparison.evaluatedAt,limits,settings,
  fixed:{direction:input.direction,leverage:input.leverage,hours:input.hours,shockPct:input.shockPct,slippageBps:input.slippageBps},
  step:0.01,min:null,max:null,next:null,evaluations:0};
 if(limits.maxMargin===null&&limits.maxLoss===null)return {...base,status:'unset',reason:'至少设置一项预算后再搜索'};
 const token=context.tokens.find(t=>t.id===context.instances.find(i=>i.id===market.instance_id)?.collateral_token_id);
 const minRaw=Number(market.config.min_settle_amount??0);
 if(!token||!Number.isInteger(token.decimals)||token.decimals<0||token.decimals>12||!Number.isSafeInteger(minRaw)||minRaw<0||
  !Number.isInteger(market.config.size_decimals)||market.config.size_decimals<0||market.config.size_decimals>12)
  return {...base,status:'unknown',reason:'数量精度、抵押代币或最小成交额无法确认'};
 if(book.ask.length>1000||book.bid.length>1000)return {...base,status:'unknown',reason:'订单簿超过本地搜索处理上限'};
 const row=marketRow(market,context);bookRows(book,market);
 if(!Number.isFinite(row.markPrice)||row.markPrice<=0)return {...base,status:'unknown',reason:'缺少有效标记价'};
 const cache=new Map(),now=Date.parse(comparison.evaluatedAt);
 function evaluate(cents){
  if(cache.has(cents))return cache.get(cents);
  if(cache.size>=70)throw new Error('搜索达到本地计算上限');
  let result;
  try{result=simulate({market,context,book,input:{...input,notional:cents/100},now});}
  catch(e){if(e.message!=='金额不足一个最小数量单位')throw e;}
  const decision=result?planDecision({results:[result]},limits).plans[0]:null;
  const value={target:cents/100,result:result??null,decision,
   minimumMet:!!result&&result.notional*10**token.decimals>=minRaw};
  cache.set(cents,value);return value;
 }
 const cap=Math.round(settings.maxNotional*100);
 // Filled value is monotone in target size, including when book depth runs out.
 let low=100,high=cap;
 if(!evaluate(high).minimumMet)return {...base,status:'none',reason:'搜索上限内未达到最小数量或协议最小成交额',evaluations:cache.size};
 while(low<high){const mid=Math.floor((low+high)/2);if(evaluate(mid).minimumMet)high=mid;else low=mid+1;}
 const first=evaluate(low),passed=v=>v.minimumMet&&v.decision?.status==='within_budget';
 if(!passed(first))return {...base,status:first.decision?.status==='unknown'?'unknown':'none',
  reason:'最小可计算规模未通过预算或模型条件',next:first,evaluations:cache.size};
 const minimum=first;high=cap;
 // For a sorted book and fixed linear-model assumptions, after the minimum,
 // passing sizes form a prefix: margin increases, slippage worsens, loss is
 // convex from zero, and margin-buffer per unit cannot recover after failure.
 while(low<high){const mid=Math.ceil((low+high)/2);if(passed(evaluate(mid)))low=mid;else high=mid-1;}
 const maximum=evaluate(low),next=low<cap?evaluate(low+1):null;
 return {...base,status:'range',reason:next?'上一个步长通过；下一个步长已受约束':'已到达用户设置的搜索上限',
  min:minimum,max:maximum,next,evaluations:cache.size};
}
export function sizingPacket(comparison,limits,settings){
 const report=sizeByBudget(comparison,limits,settings);
 const evidence={comparison,limits:report.limits,settings:report.settings};
 return {schema:SIZING_SCHEMA,evidence,report,evidenceHash:hash(evidence),reportHash:hash(report)};
}
export function replaySizing(packet){
 if(packet?.schema!==SIZING_SCHEMA)throw new Error('需要完整预算搜索证据');
 const expected=sizingPacket(packet.evidence.comparison,packet.evidence.limits,packet.evidence.settings);
 if(hash(expected)!==hash(packet))throw new Error('预算搜索无法复现');
 return {status:'reproduced',classification:'simulation_budget_range',result:expected.report.status};
}
