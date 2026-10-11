import {replayTradeReview as replayV2} from './settlement-audit-v2.mjs';
import {hash} from './integrity.mjs';
import {analyzeHistory,verifyEnvelope} from './history-audit.mjs';
import {decodeReceipt,normalizeTxHash} from './events.mjs';
const abs=n=>n<0n?-n:n;
const rows=(e,k)=>e.histories[k].pages.flatMap(p=>p.value.d);
const int=v=>{if(typeof v!=='string'||!/^[-]?\d+$/.test(v))throw new Error('INVALID_AMOUNT');const n=BigInt(v);if(n>BigInt(Number.MAX_SAFE_INTEGER)||n< -BigInt(Number.MAX_SAFE_INTEGER))throw new Error('UNSAFE_AMOUNT');return n;};
export const TRADE_REVIEW_SCHEMA='testnet-trade-review-v3';
export function analyzeTrades(observation){
 const opening=analyzeHistory(observation,{allowPartial:true}),e=observation.evidence,snap=e.account.snapshot,ctx=snap.context;
 const orders=rows(e,'order-history'),positions=rows(e,'position-history'),settlements=rows(e,'account-history');
 const orderAt=(a,b)=>(a.at?.b-b.at?.b)||(a.at?.tx-b.at?.tx)||(a.at?.l-b.at?.l);
 const closed=[],states=new Map();
 for(const o of orders.filter(o=>[3,4].includes(o.t)&&[3,4,5,6].includes(o.st)&&o.fs>0).sort(orderAt)){
  const r={orderId:o.oid,accountId:o.acc,marketId:o.mkt,txHash:normalizeTxHash(o.at?.txid),status:'incomplete',checks:[],execution:null,realizedPnl:null};
  const check=(id,ok)=>{r.checks.push({id,passed:!!ok});if(!ok)throw new Error(id);};
  try{
   const m=ctx.markets.find(m=>m.id===o.mkt),a=snap.wallet.as.find(a=>a.id===o.acc),inst=ctx.instances.find(i=>i.id===m?.instance_id),token=ctx.tokens.find(t=>t.id===inst?.collateral_token_id);
   check('ACCOUNT_MARKET_IDENTITY',a&&inst&&token&&a.in===inst.id);
   check('ORDER_FIELDS',[o.os,o.fs,o.fp,o.rq,o.oid].every(x=>Number.isSafeInteger(x)&&x>=0)&&o.fs>0&&o.fs<=o.os&&o.fp>0&&o.fl===4&&int(o.f)>=0n&&int(o.bfa??'0')===0n);
   const chain=e.chain.filter(c=>c.txHash===r.txHash);check('UNIQUE_RECEIPT',chain.length===1);verifyEnvelope(e,o,chain[0],inst.address);check('CHAIN_ENVELOPE',true);
   const d=decodeReceipt(chain[0].receipt,{exchange:inst.address,perpetualId:m.perpetual_id,accountId:o.acc,requestId:o.rq,orderType:o.t,rawSize:o.os,apiOrder:o});check('REQUEST_FILL',d.verified&&d.request.args.immediateOrCancel===true);
   const fills=d.group.filter(x=>/^TakerOrderFilled(V2)?$/.test(x.name));check('SINGLE_FILL_SUPPORTED',fills.length===1&&int(fills[0].args.builderFeeCNS??'0')===0n);
   const f=fills[0],historyFills=rows(e,'fills').filter(x=>x.acc===o.acc&&x.mkt===o.mkt&&x.oid===o.oid&&normalizeTxHash(x.at?.txid)===r.txHash);
   check('FILL_HISTORY',historyFills.length===1&&historyFills[0].at.l===f.transactionLogIndex&&historyFills[0].at.b===o.at.b&&historyFills[0].at.tx===o.at.tx&&historyFills[0].t===o.t&&historyFills[0].l===2&&String(historyFills[0].s)===f.args.lotLNS&&String(historyFills[0].p)===f.args.entryPricePNS&&historyFills[0].f===o.f&&int(historyFills[0].bfa??'0')===0n&&Math.abs(d.fillPriceScaled-o.fp)<1);
   const pr=positions.filter(p=>p.acc===o.acc&&p.mkt===o.mkt&&p.oid===o.oid&&p.rq===o.rq&&[13,14].includes(p.sr)&&normalizeTxHash(p.at?.txid)===r.txHash);check('SINGLE_EXIT_EVENT',pr.length===1);
   const p=pr[0],evs=d.group.filter(x=>(p.sr===13?x.name==='PositionClosed':x.name==='PositionDecreased')&&x.args.accountId===String(o.acc)&&x.args.perpId===String(m.perpetual_id));check('EXIT_EVENT_IDENTITY',evs.length===1);
   const ev=evs[0];check('EXIT_AMOUNTS',p.at.l===ev.transactionLogIndex&&p.at.b===o.at.b&&p.at.tx===o.at.tx&&p.sd===o.t-2&&ev.args.positionType===String(p.sd-1)&&p.s===o.fs&&p.dpnl===ev.args.deltaPnlCNS&&p.fnd===ev.args.fundingCNS&&p.cfee===o.f);
   const prior=opening.orders.filter(x=>x.status==='opening_reconciled'&&x.execution.positionId===p.pid&&x.accountId===p.acc&&x.marketId===p.mkt);check('VERIFIED_OPENING',prior.length===1);
   const related=positions.filter(x=>x.pid===p.pid&&x.acc===p.acc&&x.mkt===p.mkt);check('SUPPORTED_LIFECYCLE',related.filter(x=>x.sr===21).length===1&&related.every(x=>[21,13,14].includes(x.sr))&&Object.values(e.histories).every(h=>h.complete));
   const op=related.find(x=>x.sr===21);check('OPEN_PRECEDES_EXIT',op.at.b<o.at.b||op.at.b===o.at.b&&(op.at.tx<o.at.tx||op.at.tx===o.at.tx&&op.at.l<p.at.l));
   const key=`${p.acc}:${p.mkt}:${p.pid}`,earlier=related.filter(x=>x!==op&&orderAt(x,p)<0);
   const previous=states.get(key),state=previous??{size:op.s,deposit:int(op.c),entryFee:int(op.fee),exits:0,last:op};
   check('EXIT_SEQUENCE',earlier.length===state.exits&&related.filter(x=>orderAt(x,p)===0).length===1&&orderAt(state.last,p)<0&&state.size>0);
   check('EXIT_SIZE_RANGE',Number.isSafeInteger(p.s)&&p.s>0&&p.s<=state.size);
   const cs=10**token.decimals,ss=10**m.config.size_decimals,ps=10**m.config.price_decimals;check('SCALING',[token.decimals,m.config.size_decimals,m.config.price_decimals].every(x=>Number.isInteger(x)&&x>=0&&x<=12));
   let release;
   if(p.sr===13){check('FULL_CLOSE_SIZE',p.s===state.size&&p.st===2&&String(p.xp)===ev.args.pricePNS);release=state.deposit;}
   else {check('PARTIAL_CLOSE_SIZE',int(ev.args.startLotLNS)===BigInt(state.size)&&int(ev.args.startLotLNS)-int(ev.args.endLotLNS)===BigInt(p.s)&&p.s>0&&p.s<state.size&&p.st===1&&int(ev.args.startDepositCNS)===state.deposit);release=int(ev.args.startDepositCNS)-int(ev.args.endDepositCNS);}
   check('EXIT_COLLATERAL_AND_PRICE',release>=0n&&int(p.c)===-release&&p.ep===op.ep&&p.sd===op.sd&&Math.abs(p.xp-d.fillPriceScaled)<1);
   const entryShare=int(p.fee)-int(p.cfee);check('ENTRY_FEE_SHARE',entryShare>=0n&&entryShare<=state.entryFee&&(p.s===state.size?entryShare===state.entryFee:abs(entryShare*BigInt(state.size)-state.entryFee*BigInt(p.s))<=BigInt(state.size)));
   const st=settlements.filter(x=>x.id===o.acc&&x.in===inst.id&&x.m===o.mkt&&x.r===o.rq&&x.o===o.oid&&x.et===4&&normalizeTxHash(x.at?.txid)===r.txHash);check('ACCOUNT_SETTLEMENT',st.length===1&&st[0].at.l===f.transactionLogIndex&&st[0].at.b===o.at.b&&st[0].at.tx===o.at.tx&&st[0].a===f.args.amountCNS&&st[0].b===f.args.balanceCNS&&st[0].f===o.f);
   check('COLLATERAL_PNL_FEE_CREDIT',release+int(p.dpnl)+int(p.fnd)-int(p.cfee)===int(st[0].a));
   r.execution={positionId:p.pid,size:p.s/ss,price:d.fillPriceScaled/ps,fee:Number(int(p.cfee))/cs,entryFeeShare:Number(entryShare)/cs,grossPnl:Number(int(p.dpnl))/cs,fundingPnl:Number(int(p.fnd))/cs,collateralReleased:Number(release)/cs,accountCredit:Number(int(st[0].a))/cs,remainingAccountBalance:Number(int(st[0].b))/cs,partial:p.sr===14};
   r.execution.remainingSize=(state.size-p.s)/ss;r.execution.remainingCollateral=Number(state.deposit-release)/cs;r.execution.remainingEntryFee=Number(state.entryFee-entryShare)/cs;
   check('REMAINING_BALANCES',state.deposit>=release&&(p.s<state.size||state.deposit===release));
   states.set(key,{size:state.size-p.s,deposit:state.deposit-release,entryFee:state.entryFee-entryShare,exits:state.exits+1,last:p});
   r.realizedPnl=Number(int(p.dpnl)+int(p.fnd)-int(p.fee))/cs;r.status='exit_reconciled';
  }catch(error){r.reason=error.message;r.status=r.checks.some(c=>!c.passed)?'mismatch':'incomplete';}
  closed.push(r);
 }
 return {schema:TRADE_REVIEW_SCHEMA,collectedAt:e.collectedAt,opening,closed,limitations:['支持单次开仓后按顺序部分退出及最终退出，每次仅一个吃单成交事件；加仓、保证金变更和其他复杂事件拒绝自动通过。','测试用例通过不代表实际发生过对应交易。','缺少回执、历史覆盖或金额关联时，实际净损益保持未知。']};
}
export function tradeReviewPacket(observation){const report=analyzeTrades(observation);return {schema:TRADE_REVIEW_SCHEMA,observation,observationHash:hash(observation),report,reportHash:hash(report)};}
export function replayTradeReview(p){if(p?.schema==='testnet-trade-review-v2')return replayV2(p);if(p.schema!==TRADE_REVIEW_SCHEMA||hash(p.observation)!==p.observationHash||hash(p.report)!==p.reportHash||hash(analyzeTrades(p.observation))!==p.reportHash)throw new Error('TRADE_REVIEW_MISMATCH');return {status:'reproduced',opening:p.report.opening.orders.map(o=>o.status),closed:p.report.closed.map(o=>o.status)};}
