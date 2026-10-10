import {positionRisk,bookRows,marketRow,positionStampWithinSnapshot} from './risk.mjs';
import {hash} from './store.mjs';
export const EXIT_VERSION='position-exit-v1';

// Read-only snapshot scenario. This does not submit a close or reconstruct a settlement.
export function analyzeExit({position,context,book,snapshotAt,input,feeTier=null,now=Date.now()}) {
  const market=context?.markets?.find(m=>m.id===position?.mkt);
  if(!market||position.st!==1||!Number.isSafeInteger(position.pid)||!Number.isSafeInteger(position.acc))throw new Error('需提供可识别的开放仓位快照');
  if(position.cfee!=null&&String(position.cfee)!=='0'||position.e?.length)throw new Error('需提供仓位快照，不能使用结算事件');
  if(!Number.isSafeInteger(position.s)||position.s<1)throw new Error('仓位数量必须是安全整数');
  const pct=input?.closePct;
  if(!Number.isInteger(pct)||pct<1||pct>100)throw new Error('退出比例需为1到100的整数百分比');
  if(!Number.isFinite(now)||!Number.isFinite(snapshotAt?.t)||!Number.isSafeInteger(snapshotAt?.b))throw new Error('快照时间或区块缺失');
  const requestedRaw=Number(BigInt(position.s)*BigInt(pct)/100n);
  if(requestedRaw<1)throw new Error('退出数量不足一个最小数量单位');
  const r=positionRisk(position,market,context,now,snapshotAt.t),row=marketRow(market,context);
  const levels=bookRows(book,market).filter(l=>l.side===(position.sd===1?'bid':'ask'));
  if(new Set(levels.map(l=>l.rawPrice)).size!==levels.length)throw new Error('退出盘口含重复价格档');
  let remaining=requestedRaw,value=0,matchedRaw=0;
  for(const level of levels){const take=Math.min(remaining,level.rawSize);value+=take/10**row.sizeDecimals*level.price;matchedRaw+=take;remaining-=take;if(!remaining)break;}
  const sizeScale=10**row.sizeDecimals,matchedSize=matchedRaw/sizeScale,ratio=matchedRaw/position.s,sign=position.sd===1?1:-1;
  const vwap=matchedRaw?value/matchedSize:null,fees=feeTier===null?market.config.taker_fee:market.config.taker_fees?.[feeTier];
  if(feeTier!==null&&(!Number.isSafeInteger(feeTier)||feeTier<0))throw new Error('账户费用档位无效');
  if(!Number.isSafeInteger(fees)||fees<0)throw new Error('无可核对的退出吃单费率');
  const feeRate=fees/1e6,exitFee=value*feeRate,pricePnl=matchedRaw?matchedSize*(vwap-r.entryPrice)*sign:0;
  const fundingPnl=r.fundingPnl==null?null:r.fundingPnl*ratio,entryFee=r.indicativeEntryFee==null?null:r.indicativeEntryFee*ratio;
  const netPnl=fundingPnl==null||entryFee==null?null:pricePnl+fundingPnl-entryFee-exitFee;
  const residualRaw=position.s-matchedRaw,residualRatio=residualRaw/position.s;
  const blockers=[];
  for(const [label,t] of [['仓位读取',snapshotAt.t],['市场',row.sourceMs],['退出盘口',book.at?.t]])
    if(!Number.isFinite(t)||now-t>45000||t>now+5000)blockers.push(`${label}超出45秒新鲜度窗口`);
  for(const [label,b] of [['仓位',snapshotAt.b],['市场',row.block],['退出盘口',book.at?.b]])
    if(!Number.isSafeInteger(b)||!Number.isSafeInteger(context.chain.gas.h)||b>context.chain.gas.h)blockers.push(`${label}区块尚未由上下文链头覆盖`);
  if(!positionStampWithinSnapshot(position.at,snapshotAt))blockers.push('仓位最后更新时间或区块与读取快照不一致');
  if(!row.open)blockers.push('市场暂停；估算不表示可以执行');
  if(remaining)blockers.push('公开退出盘口不足；以下损益仅覆盖可匹配数量');
  if(r.fundingPnl==null)blockers.push('已应用资金结算信息未知，权益和净损益保持未知');
  if(entryFee==null)blockers.push('留存入场费用未知，净损益保持未知');
  if(r.maintenanceEstimate==null)blockers.push('维持保证金信息未知');
  if(r.status==='at_risk')blockers.push('当前权益低于估算维持保证金；不复刻清算或ADL');
  const report={modelVersion:EXIT_VERSION,classification:'exit_estimate',evaluatedAt:new Date(now).toISOString(),
    marketId:market.id,positionId:position.pid,accountId:position.acc,chainId:row.chainId,asset:row.asset,collateral:row.collateral,
    direction:r.direction,input:{closePct:pct},feeTier,feeBasis:feeTier===null?'public_base':'account_tier',feeBps:fees/100,
    snapshotTime:new Date(snapshotAt.t).toISOString(),bookTime:new Date(book.at.t).toISOString(),current:r,
    requestedRaw,requestedSize:requestedRaw/sizeScale,effectiveClosePct:requestedRaw/position.s*100,
    matchedRaw,matchedSize,uncoveredSize:remaining/sizeScale,depthComplete:remaining===0,coverage:matchedRaw/requestedRaw,
    vwap,notional:value,pricePnl,fundingPnl,entryFee,exitFee,netPnl,
    // Counterfactual mark comparison for the SAME matched quantity, not the requested quantity.
    markPricePnl:r.grossPnl*ratio,adversePriceCost:(r.markPrice-(vwap??r.markPrice))*matchedSize*sign,
    residual:{rawSize:residualRaw,size:residualRaw/sizeScale,grossPnl:r.grossPnl*residualRatio,
      fundingPnl:r.fundingPnl==null?null:r.fundingPnl*residualRatio,entryFee:r.indicativeEntryFee==null?null:r.indicativeEntryFee*residualRatio,
      collateral:null,equity:null,note:'实际留存抵押和权益取决于协议结算；未将比例分摊假设写成实际释放金额。'},
    realizedPnl:null,actualExitFee:null,status:blockers.length?'incomplete':'estimated',blockers,
    assumptions:['即时吃单退出；按返回盘口逐档覆盖，未覆盖数量不计入损益或费用。',
      '价格损益加当前已应用资金损益，再减已收费的入场份额与预估退出费；不是新增收费或已实现收益。',
      '留存入场费和资金损益按数量比例分配；不将其解释为实际抵押释放规则。',
      '预估退出费使用公开基础档或账户档位，不包含builder附加费、gas、未来资金事件与延迟。',
      '浮点金额用于分析，不复刻链上逐笔整数舍入、清算或ADL。哈希检测文件内变更，不认证数据来源。']};
  for(const amount of [value,vwap,pricePnl,fundingPnl,entryFee,exitFee,netPnl,r.equity])if(amount!=null&&!Number.isFinite(amount))throw new Error('退出金额超出数值范围');
  return report;
}

export function exitPacket(snapshot,{classification='observed_position_exit_estimate'}={}) {
  if(!['observed_position_exit_estimate','synthetic_position_exit'].includes(classification))throw new Error('退出来源分类无效');
  const saved={...structuredClone(snapshot),sourceKind:classification},report=analyzeExit(saved);
  return {schema:EXIT_VERSION,classification,snapshot:saved,snapshotHash:hash(saved),report,reportHash:hash(report)};
}
export function replayExit(packet) {
  if(packet.schema!==EXIT_VERSION||!['observed_position_exit_estimate','synthetic_position_exit'].includes(packet.classification))throw new Error('退出模型或来源分类无效');
  if(packet.snapshot?.sourceKind!==packet.classification)throw new Error('退出来源分类与快照不一致');
  if(hash(packet.snapshot)!==packet.snapshotHash||hash(packet.report)!==packet.reportHash)throw new Error('退出证据哈希不一致');
  const report=analyzeExit(packet.snapshot);
  if(hash(report)!==packet.reportHash)throw new Error('退出完整结果复算不一致');
  return {model:EXIT_VERSION,status:'reproduced',classification:packet.classification,checked:'complete result, residual position, blockers and nulls'};
}

export async function observedExit(perpl,network,{positionId,accountId,closePct}) {
  if(!Number.isSafeInteger(positionId)||!Number.isSafeInteger(accountId))throw new Error('请选择实际账户仓位');
  const [account,ctx]=await Promise.all([perpl.account(network),perpl.context(network)]);
  if(!account.configured)throw new Error('此网络尚未配置独立Perpl只读账户');
  const matches=account.positions.d.filter(p=>p.pid===positionId&&p.acc===accountId);
  if(matches.length!==1)throw new Error('实际仓位不存在或不唯一，请重新读取');
  const position=matches[0],acc=account.wallet.as?.find(a=>a.id===accountId),market=ctx.value.markets.find(m=>m.id===position.mkt);
  if(!market||!Number.isSafeInteger(acc?.ft)||acc.ft<0)throw new Error('市场或实际账户费用档位缺失');
  const book=await perpl.cached(network,`/v1/market-data/${market.id}/book`,3000);
  return exitPacket({position,context:ctx.value,book:book.value,snapshotAt:account.positions.at,
    input:{closePct},feeTier:acc.ft,now:Date.now(),sources:[...account.sources,ctx.source,book.source]});
}
