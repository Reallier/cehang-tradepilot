import {hash} from './integrity.mjs';
import {replayAccount} from './account-verification.mjs';
import {decodeReceipt,normalizeTxHash,EVENT_ABI_HASH} from './events.mjs';

export const HISTORY_AUDIT_SCHEMA='testnet-history-audit-v1';
const fail=code=>{throw new Error(code);};
const uint=v=>Number.isSafeInteger(v)&&v>=0;
const integer=v=>{if(typeof v!=='string'||!/^[-]?\d+$/.test(v))fail('AMOUNT_INVALID');return BigInt(v);};
const rows=(e,kind)=>e.histories[kind].pages.flatMap(p=>p.value.d);
const near=(a,b,tolerance)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance;
const hexInt=v=>{if(typeof v!=='string'||!/^0x[0-9a-fA-F]+$/.test(v))fail('CHAIN_INTEGER_INVALID');const n=Number(BigInt(v));if(!uint(n))fail('CHAIN_INTEGER_INVALID');return n;};
export function verifyEnvelope(e,o,c,exchange){
  const h=normalizeTxHash(o.at?.txid),r=c?.receipt,t=c?.transaction;
  if(!h||!r||!t)fail('RECEIPT_MISSING');
  if(c.txHash!==h||normalizeTxHash(r.transactionHash)!==h||normalizeTxHash(t.hash)!==h||r.status!=='0x1'||hexInt(t.chainId)!==10143)fail('CHAIN_IDENTITY_MISMATCH');
  if(!uint(o.at.b)||!uint(o.at.l)||!uint(o.at.tx)||hexInt(r.blockNumber)!==o.at.b||hexInt(t.blockNumber)!==o.at.b||!uint(e.head)||e.head<o.at.b)fail('BLOCK_MISMATCH');
  if(!normalizeTxHash(r.blockHash)||r.blockHash!==t.blockHash||hexInt(r.transactionIndex)!==o.at.tx||hexInt(t.transactionIndex)!==o.at.tx)fail('BLOCK_IDENTITY_MISMATCH');
  if(typeof t.to!=='string'||t.to.toLowerCase()!==exchange.toLowerCase())fail('TRANSACTION_DESTINATION_MISMATCH');
  if(!Array.isArray(r.logs)||!r.logs.length)fail('LOGS_MISSING');
  for(const l of r.logs){if(l.removed||normalizeTxHash(l.transactionHash)!==h||l.blockHash!==r.blockHash||hexInt(l.blockNumber)!==o.at.b||hexInt(l.transactionIndex)!==o.at.tx)fail('LOG_IDENTITY_MISMATCH');}
}

// No pre-trade baseline is required or fabricated. Current context is explicitly
// an after-the-fact reference, never historical fee/margin configuration proof.
export function analyzeHistory(packet,{allowPartial=false}={}){
  if(packet.schema!=='trade-history-observation-v1'||!['private_testnet_history','synthetic_testnet_history'].includes(packet.classification)||hash(packet.evidence)!==packet.evidenceHash)fail('HISTORY_INTEGRITY_INVALID');
  const e=packet.evidence;replayAccount(e.account);
  for(const k of ['order-history','fills','position-history','account-history']){
    const h=e.histories?.[k];if(!h||!Array.isArray(h.pages)||!h.pages.length||h.pages.length>2)fail('HISTORY_SCHEMA_INVALID');
    const seen=new Set();
    for(const p of h.pages){if(!Array.isArray(p.value?.d)||p.value.d.length>100)fail('HISTORY_SCHEMA_INVALID');for(const row of p.value.d){const sig=hash(row);if(seen.has(sig))fail('DUPLICATE_HISTORY_ROW');seen.add(sig);}}
    if(h.complete!==!h.pages.at(-1).value.np)fail('HISTORY_COVERAGE_INVALID');
  }
  const snap=e.account.snapshot,ctx=snap.context,accounts=new Map(snap.wallet.as.map(a=>[a.id,a]));
  const reports=[];
  // Only terminal fully-filled opening orders are supported in this version.
  const candidates=rows(e,'order-history').filter(o=>[1,2].includes(o.t)&&(allowPartial?[3,4,5,6].includes(o.st):o.st===4)&&o.fs>0);
  for(const o of candidates){
    const report={orderId:o.oid,marketId:o.mkt,accountId:o.acc,txHash:normalizeTxHash(o.at?.txid),status:'incomplete',checks:[],execution:null,baseline:null,executionDeviation:null,realizedPnl:null};
    const check=(id,ok)=>{report.checks.push({id,passed:ok});if(!ok)fail(id);};
    try {
      const a=accounts.get(o.acc),m=ctx.markets.find(m=>m.id===o.mkt),inst=ctx.instances.find(i=>i.id===m?.instance_id),tok=ctx.tokens.find(t=>t.id===inst?.collateral_token_id);
      check('ACCOUNT_MARKET_IDENTITY',Boolean(a&&m&&inst&&tok&&a.in===inst.id));
      check('ORDER_FIELDS',[o.oid,o.rq,o.os,o.fs,o.fp,o.lv].every(uint)&&(allowPartial?o.os>=o.fs:o.os===o.fs)&&o.fs>0&&o.fp>0&&integer(o.f)>=0n&&integer(o.bfa??'0')===0n);
      check('SCALING',[m.config.price_decimals,m.config.size_decimals,tok.decimals].every(d=>uint(d)&&d<=12));
      const chain=e.chain.filter(c=>c.txHash===report.txHash);check('UNIQUE_RECEIPT',chain.length===1);
      verifyEnvelope(e,o,chain[0],inst.address);check('CHAIN_ENVELOPE',true);
      const decoded=decodeReceipt(chain[0].receipt,{exchange:inst.address,perpetualId:m.perpetual_id,accountId:o.acc,requestId:o.rq,orderType:o.t,rawSize:o.os,apiOrder:o});
      check('REQUEST_AND_FILL_EVENTS',decoded.verified);
      check('REQUEST_LEVERAGE',decoded.request.args.leverageHdths===String(o.lv));
      check('REQUEST_IOC',o.fl===4&&decoded.request.args.immediateOrCancel===true);
      const fills=decoded.group.filter(x=>/^TakerOrderFilled(V2)?$/.test(x.name));
      check('NO_BUILDER_FEES',fills.every(f=>f.args.builderFeeCNS==null||f.args.builderFeeCNS==='0'));
      check('API_CHAIN_PRICE',near(decoded.fillPriceScaled,o.fp,0.999999));
      const apiFills=rows(e,'fills').filter(f=>f.acc===o.acc&&f.mkt===o.mkt&&f.oid===o.oid&&normalizeTxHash(f.at?.txid)===report.txHash);
      check('FILL_HISTORY_COVERAGE',apiFills.length===fills.length&&fills.every(f=>apiFills.filter(x=>x.at.l===f.transactionLogIndex&&x.at.b===o.at.b&&x.at.tx===o.at.tx&&x.t===o.t&&x.l===2&&uint(x.s)&&uint(x.p)&&String(x.s)===f.args.lotLNS&&String(x.p)===f.args.entryPricePNS&&x.f===f.args.feeCNS&&integer(x.bfa??'0')===0n).length===1));
      const opened=decoded.group.filter(x=>/^PositionOpened(V2)?$/.test(x.name)&&x.args.accountId===String(o.acc)&&x.args.perpId===String(m.perpetual_id));
      check('SINGLE_OPEN_POSITION',opened.length===1&&fills.length===1);
      const ev=opened[0],pRows=rows(e,'position-history').filter(p=>p.acc===o.acc&&p.mkt===o.mkt&&p.oid===o.oid&&p.rq===o.rq&&p.sr===21&&normalizeTxHash(p.at?.txid)===report.txHash);
      check('POSITION_HISTORY_IDENTITY',pRows.length===1);
      const p=pRows[0];
      check('POSITION_EVENT_AMOUNTS',p.at.l===ev.transactionLogIndex&&p.at.b===o.at.b&&p.at.tx===o.at.tx&&uint(p.pid)&&p.st===1&&p.sd===o.t&&ev.args.positionType===String(p.sd-1)&&p.c===ev.args.depositCNS&&String(p.ep)===ev.args.pricePNS&&String(p.s)===ev.args.lotLNS&&p.fee===o.f&&String(p.epr??0)===String(ev.args.priceResiduePNSQ16??0)&&integer(p.cfee??'0')===0n);
      check('PROTOCOL_FEE_COMPONENTS',integer(ev.args.insFeeCNS)+integer(ev.args.protFeeCNS)===integer(o.f));
      const settlements=rows(e,'account-history').filter(a=>a.id===o.acc&&a.in===inst.id&&a.m===o.mkt&&a.r===o.rq&&a.o===o.oid&&a.et===4&&normalizeTxHash(a.at?.txid)===report.txHash);
      check('ACCOUNT_SETTLEMENT',settlements.length===1&&settlements[0].at.l===fills[0].transactionLogIndex&&settlements[0].at.b===o.at.b&&settlements[0].at.tx===o.at.tx&&settlements[0].a===fills[0].args.amountCNS&&settlements[0].b===fills[0].args.balanceCNS&&settlements[0].f===o.f);
      check('COLLATERAL_PLUS_FEE_DEBIT',-integer(settlements[0].a)===integer(p.c)+integer(o.f));
      const ps=10**m.config.price_decimals,ss=10**m.config.size_decimals,cs=10**tok.decimals,size=o.fs/ss,price=decoded.fillPriceScaled/ps,fee=Number(integer(o.f))/cs,collateral=Number(integer(p.c))/cs;
      check('NUMERIC_RANGE',[fee,collateral,price,size].every(Number.isFinite)&&[p.c,o.f].every(v=>integer(v)<=BigInt(Number.MAX_SAFE_INTEGER)));
      const tier=a.ft,rate=tier===0?m.config.taker_fee:m.config.taker_fees?.[tier];
      report.execution={positionId:p.pid,size,price,fee,collateral,accountDebit:Number(-integer(settlements[0].a))/cs,remainingAccountBalance:Number(integer(settlements[0].b))/cs,insuranceFee:Number(integer(ev.args.insFeeCNS))/cs,protocolFee:Number(integer(ev.args.protFeeCNS))/cs,collateralizedPnl:Number(integer(ev.args.pnlCollateralizedCNS))/cs,notional:price*size,confirmationsObserved:e.head-o.at.b+1};
      report.feeReference={classification:'current_schedule_comparison_not_historical_proof',feeTier:tier,rateMicros:rate??null,expectedFee:Number.isFinite(rate)?price*size*rate/1e6:null,actualFee:fee,residual:Number.isFinite(rate)?fee-price*size*rate/1e6:null};
      report.status='opening_reconciled';
    }catch(error){report.status=report.checks.some(c=>!c.passed)?'mismatch':'incomplete';report.reason=error.message;}
    reports.push(report);
  }
  return {schema:HISTORY_AUDIT_SCHEMA,classification:packet.classification==='synthetic_testnet_history'?'synthetic_testnet_history_audit':'private_testnet_history_audit',collectedAt:e.collectedAt,abiSha256:EVENT_ABI_HASH,historyComplete:Object.values(e.histories).every(h=>h.complete),receiptCoverageComplete:e.receiptCoverageComplete,orders:reports,openPositionsObserved:snap.positions.d.length,preTradeBaseline:null,realizedPnl:null,limitations:['仅支持单笔全部成交IOC开仓，其他成交结构不自动通过。','历史资料和RPC回执一致性不构成共识最终性证明。','当前费率不能证明历史费率；缺少交易前基线，执行偏差保持未知。','开仓账户扣款包含仓位抵押与费用，不是已实现亏损；退出结算尚未核验。']};
}
export function historyAuditPacket(observation){const report=analyzeHistory(observation);return {schema:HISTORY_AUDIT_SCHEMA,observation,observationHash:hash(observation),report,reportHash:hash(report)};}
export function replayHistoryAudit(packet){if(packet.schema!==HISTORY_AUDIT_SCHEMA||hash(packet.observation)!==packet.observationHash||hash(packet.report)!==packet.reportHash||hash(analyzeHistory(packet.observation))!==packet.reportHash)fail('HISTORY_AUDIT_REPLAY_MISMATCH');return {status:'reproduced',classification:packet.report.classification,orders:packet.report.orders.map(o=>({status:o.status,checks:o.checks.length})),realizedPnl:null};}
