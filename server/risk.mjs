export const MODEL_VERSION = 'isolated-linear-v1';
// The REST snapshot carries observation time; per-position update fields are optional.
// Validate fields when present without inventing an update timestamp from the envelope.
export function positionStampWithinSnapshot(at,snapshotAt) {
  if(!at||typeof at!=='object'||Array.isArray(at)||!Number.isSafeInteger(snapshotAt?.b)||snapshotAt.b<0||!Number.isFinite(snapshotAt?.t))return false;
  return (at.b===undefined||(Number.isSafeInteger(at.b)&&at.b>=0&&at.b<=snapshotAt.b))&&
    (at.t===undefined||(Number.isFinite(at.t)&&at.t>=0&&at.t<=snapshotAt.t+5000));
}
const number = (v, name) => { if(v==null||typeof v==='boolean'||String(v).trim()==='')throw new Error(`${name} 不可为空`); const n = Number(v); if (!Number.isFinite(n)) throw new Error(`${name} 必须是有限数值`); return n; };
const positive = (v, name) => { const n = number(v, name); if (n <= 0) throw new Error(`${name} 必须大于 0`); return n; };
export function marketRow(market, context) {
  const c = market.config, s = market.state, p = 10 ** c.price_decimals;
  if (!s || !Number.isSafeInteger(s.mrk) || !p) throw new Error('无有效市场状态');
  const instance = context.instances.find(i => i.id === market.instance_id);
  const token = context.tokens.find(t => t.id === instance?.collateral_token_id);
  return { marketId: market.id, asset: market.symbol || market.name.replace(/ Perp$/, ''), name: market.name,
    markPrice: s.mrk / p, bid: s.bid / p, ask: s.ask / p, previousPrice: s.prv / p,
    dailyChange: s.prv ? (s.lst - s.prv) / s.prv : null,
    makerFeeBps: c.maker_fee / 100, takerFeeBps: c.taker_fee / 100,
    maxLeverage: c.initial_margin / 100,
    maintenanceRate: c.maintenance_margin > 0 ? 100 / c.maintenance_margin : null,
    fundingBps: market.funding ? market.funding.rate / 100 : null,
    fundingIntervalSec: market.funding_interval_sec, fundingBlock: market.funding?.feb ?? null,
    open: c.is_open, collateral: token?.symbol ?? 'unknown', collateralDecimals: token?.decimals,
    sourceTime: new Date(s.at.t).toISOString(), sourceMs: s.at.t, block: s.at.b,
    chainId: context.chain.chain_id, exchange: instance?.address, collateralAddress: token?.address,
    priceDecimals: c.price_decimals, sizeDecimals: c.size_decimals };
}
export function bookRows(book, market) {
  const p = 10 ** market.config.price_decimals, s = 10 ** market.config.size_decimals;
  if (!Array.isArray(book.bid) || !Array.isArray(book.ask) || !book.at) throw new Error('订单簿结构不完整');
  const sides = ['bid','ask'].flatMap(side => book[side].map(r => {
    if (![r.p,r.s].every(v => Number.isSafeInteger(v) && v > 0)) throw new Error('订单簿含非法价格或数量');
    return {side,price:r.p/p,size:r.s/s,rawPrice:r.p,rawSize:r.s,sourceTime:new Date(book.at.t).toISOString(),block:book.at.b};
  }));
  const bid = sides.filter(r=>r.side==='bid').sort((a,b)=>b.price-a.price);
  const ask = sides.filter(r=>r.side==='ask').sort((a,b)=>a.price-b.price);
  if (!bid.length || !ask.length || bid[0].price >= ask[0].price) throw new Error('订单簿为空或买卖价格交叉');
  return [...bid,...ask];
}
export function scenarioInput(input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('场景输入无效');
  for(const field of ['notional','leverage','hours','shockPct','slippageBps'])if(!['string','number'].includes(typeof input[field]))throw new Error('场景数值类型无效');
  const direction = input.direction;
  if (!['long','short'].includes(direction)) throw new Error('方向必须是 long 或 short');
  const notional = positive(input.notional,'名义金额'), leverage=positive(input.leverage,'杠杆');
  const hours=number(input.hours,'持有小时'), shock=number(input.shockPct,'价格冲击');
  const slippageLimit=positive(input.slippageBps,'滑点上限');
  if(notional>1e7 || leverage>100 || hours<0 || hours>168 || shock<=-100 || shock>100 || slippageLimit>100) throw new Error('场景输入超出允许范围');
  return {direction,notional,leverage,hours,shockPct:shock,slippageBps:slippageLimit};
}
export function simulate({market, context, book, input, now=Date.now(), feeTier=null}) {
  const row = marketRow(market,context), rows = bookRows(book,market), c=market.config;
  const {direction,notional,leverage,hours,shockPct:shock,slippageBps:slippageLimit}=scenarioInput(input);
  const side = direction==='long'?'ask':'bid', levels=rows.filter(r=>r.side===side);
  const scale=10**c.size_decimals, rawSize=Math.floor(notional/levels[0].price*scale);
  if(!Number.isSafeInteger(rawSize) || rawSize<1) throw new Error('金额不足一个最小数量单位');
  const size=rawSize/scale;
  let remaining=size, value=0, matched=0;
  for(const l of levels) { const take=Math.min(remaining,l.size);value+=take*l.price;remaining-=take;matched+=take;if(remaining<=size*1e-12)break; }
  const complete=remaining<=size*1e-12, vwap=matched?value/matched:null, sign=direction==='long'?1:-1;
  const slip=vwap ? sign*(vwap/levels[0].price-1)*10000 : null;
  const fees=feeTier==null ? c.taker_fee : c.taker_fees?.[feeTier];
  if(!Number.isSafeInteger(fees) || fees<0) throw new Error('无可核对的吃单费率');
  const feeRate=fees/1e6, entryFee=value*feeRate, margin=value/leverage;
  const stressPrice=row.markPrice*(1+shock/100), grossPnl=matched*(stressPrice-vwap)*sign;
  const interval=positive(market.funding_interval_sec,'资金费率周期');
  // Scenario assumption: constant latest funding rate, time-proportional estimate.
  // It is not a claim about the exact discrete future funding settlement schedule.
  const fundingRate=market.funding ? market.funding.rate/1e6 : null;
  const funding=fundingRate==null?null:value*fundingRate*sign*(hours*3600/interval);
  const exitFee=matched*stressPrice*feeRate;
  const netPnl=funding==null?null:grossPnl-entryFee-exitFee-funding;
  const equity=funding==null?null:margin+grossPnl-entryFee-funding;
  // The official SDK uses ENTRY notional / encoded maintenance leverage.
  const maintenance=row.maintenanceRate==null?null:value*row.maintenanceRate;
  const age=Math.max(now-row.sourceMs,now-book.at.t);
  const reasons=[];
  if(age>45000 || row.sourceMs>now+5000 || book.at.t>now+5000) reasons.push('行情或订单簿超出45秒新鲜度窗口');
  if(!row.open)reasons.push('市场已暂停');
  if(!complete)reasons.push('公开订单簿深度不足以覆盖全部数量');
  const collateralToken=context.tokens.find(t=>t.id===context.instances.find(i=>i.id===market.instance_id)?.collateral_token_id);
  if(collateralToken&&value*10**collateralToken.decimals<Number(c.min_settle_amount??0))reasons.push('低于协议最小成交额');
  if(slip==null || slip>slippageLimit)reasons.push('预估滑点超过设定上限');
  if(!row.maxLeverage || leverage>row.maxLeverage)reasons.push('杠杆超过协议当前开仓上限');
  if(maintenance==null || equity==null)reasons.push('保证金或资金费率信息不完整');
  else if(equity<=maintenance)reasons.push('冲击场景下权益低于估算维持保证金');
  const usable=margin-entryFee-(funding??0), mm=row.maintenanceRate;
  const liquidation=mm==null||mm>=1?null:Math.max(0,vwap+sign*(maintenance-usable)/matched);
  return {modelVersion:MODEL_VERSION,classification:'simulation',input:{direction,notional,leverage,hours,shockPct:shock,slippageBps:slippageLimit},
    marketId:market.id,asset:row.asset,collateral:row.collateral,chainId:row.chainId,observedAt:row.sourceTime,
    bookTime:new Date(book.at.t).toISOString(),createdAt:new Date(now).toISOString(),ageMs:age,
    size,rawSize,matchedSize:matched,depthComplete:complete,vwap,notional:value,entryFee,exitFee,
    fundingEstimate:funding,feeBps:fees/100,feeTier,margin,stressPrice,grossPnl,netPnl,stressEquity:equity,
    maintenanceEstimate:maintenance,liquidationEstimate:liquidation,slippageBps:slip,
    riskPass:reasons.length===0,blockers:reasons,
    assumptions:['孤立线性仓位，无已有仓位合并、反向持仓、ADL或清算引擎复刻',
      '初始/维持保证金字段为杠杆的百分之一；维持额=入场名义金额*100/raw，依据官方SDK position.rs，尚需实际成交对照',
      '资金费率按当前rate保持不变并按持有时间比例估算；实际按离散资金周期结算',
      '费用默认公开基础档；配置账户后以Account.ft选择费率。余额不代表可全部开仓',
      '费用和PnL以抵押代币计价，不保证AUSD兑美元价格；不包含实际gas、延迟和其他订单竞争'],
    stressRows:[-20,-10,-5,0,5,10,20].map(change=>{const price=row.markPrice*(1+change/100),pnl=funding==null?null:matched*(price-vwap)*sign-entryFee-matched*price*feeRate-funding;return {changePct:change,price,netPnl:pnl,equity:pnl==null?null:margin+pnl,classification:'simulation'};})};
}
export function positionRisk(position,market,context,now=Date.now(),snapshotMs=position.at?.t) {
  const row=marketRow(market,context),sign=position.sd===1?1:position.sd===2?-1:null;
  if(sign==null)throw new Error('无法解释仓位方向');
  if(row.markPrice<=0)throw new Error('标记价格必须大于0');
  const integer=(v,name,signed=false)=>{if(v==null||!/^-?\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||(!signed&&Number(v)<0))throw new Error(`${name} 超出安全整数范围或缺失`);return Number(v);};
  if(![row.sizeDecimals,row.priceDecimals,row.collateralDecimals].every(d=>Number.isInteger(d)&&d>=0&&d<=12))throw new Error('仓位精度不受支持');
  if(position.mkt!=null&&position.mkt!==market.id)throw new Error('仓位与市场不匹配');
  const q=positive(integer(position.s,'仓位数量'),'仓位数量')/10**row.sizeDecimals,residue=integer(position.epr??0,'入场价格余数');
  if(!Number.isSafeInteger(residue)||residue<0||residue>65535)throw new Error('入场价格余数异常');
  const entry=positive((integer(position.ep,'入场价格')+(residue?(sign===1?-1:0)+residue/65536:0))/10**row.priceDecimals,'入场价格');
  const collateral=integer(position.c,'仓位抵押')/10**row.collateralDecimals,fee=position.fee==null?null:integer(position.fee,'入场费用',true)/10**row.collateralDecimals;
  const grossPnl=sign*q*(row.markPrice-entry),funding=market.funding;
  const fundingKnown=Boolean(funding&&Number.isSafeInteger(funding.at?.b)&&Number.isSafeInteger(context.chain.gas.h)&&funding.at.b<=context.chain.gas.h&&
    (funding.feb==null||Number.isSafeInteger(funding.feb)&&funding.feb<=context.chain.gas.h)&&Number.isSafeInteger(position.efs)&&Number.isSafeInteger(funding.sum)&&Number.isSafeInteger(funding.sum-position.efs)&&Number.isSafeInteger(funding.div)&&funding.div>0);
  const fundingPnl=fundingKnown?-sign*q*(funding.sum-position.efs)/10**row.priceDecimals/funding.div:null;
  const maintenance=row.maintenanceRate==null?null:entry*q*row.maintenanceRate,equity=fundingKnown?collateral+grossPnl+fundingPnl:null;
  const liquidation=fundingKnown&&maintenance!=null?Math.max(0,entry+sign*(maintenance-collateral-fundingPnl)/q):null;
  const stale=!Number.isFinite(snapshotMs)||!Number.isFinite(now)||now-row.sourceMs>45000||now-snapshotMs>45000||snapshotMs>now+5000||row.sourceMs>now+5000;
  return {positionId:position.pid,accountId:position.acc,marketId:market.id,asset:row.asset,collateralToken:row.collateral,
    direction:sign===1?'long':'short',size:q,entryPrice:entry,markPrice:row.markPrice,collateral,grossPnl,
    fundingPnl,unrealizedPnl:fundingKnown?grossPnl+fundingPnl:null,indicativeEntryFee:fee,
    equity,maintenanceEstimate:maintenance,liquidationEstimate:liquidation,
    marginBuffer:equity==null||maintenance==null?null:equity-maintenance,status:stale||!fundingKnown||maintenance==null?'incomplete':equity<=maintenance?'at_risk':'above_estimated_margin',
    sourceTime:Number.isFinite(position.at?.t)?new Date(position.at.t).toISOString():null,marketTime:row.sourceTime,
    note:'实际仓位的估算风险；入场费已由协议收取，不再从仓位权益重复扣除。保留Q16价格余数。未来资金事件或陈旧数据标为不完整。'};
}
