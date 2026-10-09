import {simulate,MODEL_VERSION} from './risk.mjs';
import {decodeReceipt} from './events.mjs';
import {hash} from './store.mjs';

export const AUDIT_VERSION='opening-execution-audit-v1';
export function estimateEvidence(context,book,result){
  return {context,book,snapshotHashes:{context:hash(context),book:hash(book)},evaluatedAt:result.createdAt};
}
function integer(value,name,min=0){if(!Number.isSafeInteger(value)||value<min)throw new Error(`${name}无有效缩放整数`);return value;}
function amount(value,name){if(typeof value!=='string'||!/^\d+$/.test(value))throw new Error(`${name}无完整金额`);const raw=BigInt(value);if(raw>BigInt(Number.MAX_SAFE_INTEGER))throw new Error(`${name}超出当前数值精度范围`);return raw;}
function baseline(intent){
  const e=intent.estimateEvidence,r=intent.result,s=intent.spec;
  if(!e?.context||!e.book||r?.modelVersion!==MODEL_VERSION)throw new Error('记录缺少可复算的提交前行情快照');
  if(hash(e.context)!==e.snapshotHashes?.context||hash(e.book)!==e.snapshotHashes?.book)throw new Error('提交前快照哈希不一致');
  const market=e.context.markets.find(m=>m.id===s.mkt),now=Date.parse(e.evaluatedAt);
  if(!market||!Number.isFinite(now)||e.evaluatedAt!==r.createdAt)throw new Error('提交前市场或时间不一致');
  const reproduced=simulate({market,context:e.context,book:e.book,input:r.input,feeTier:r.feeTier,now});
  if(hash(reproduced)!==hash(r))throw new Error('提交前模型结果无法完整复算');
  if(!r.depthComplete||!r.riskPass||r.rawSize!==s.s||r.marketId!==s.mkt||intent.chainId!==r.chainId||r.chainId!==e.context.chain.chain_id||intent.accountId!==s.acc||s.t!==(r.input.direction==='long'?1:2)||s.lv!==Math.round(r.input.leverage*100))throw new Error('提交请求与预估输入不一致或预估未通过');
  const instance=e.context.instances.find(i=>i.id===market.instance_id),token=e.context.tokens.find(t=>t.id===instance?.collateral_token_id);
  if(!/^0x[0-9a-fA-F]{40}$/.test(instance?.address??''))throw new Error('提交快照缺少交易所地址');
  for(const [key,value] of Object.entries({price:market.config.price_decimals,size:market.config.size_decimals,collateral:token?.decimals}))if(!Number.isInteger(value)||value<0||value>18)throw new Error(`${key}精度无效`);
  return {market,instance,token,result:reproduced};
}
function metric(id,label,unit,estimated,observed,delta=observed===null?null:observed-estimated){return {id,label,unit,estimated,observed,delta};}

// Pure analysis of stored evidence. No RPC, account reads, submits or state updates.
export function auditExecution(intent,{synthetic=false}={}){
  synthetic=synthetic||intent.synthetic===true||intent.id?.startsWith('sample_');
  const report={version:AUDIT_VERSION,classification:synthetic?'synthetic_execution_audit':'stored_execution_audit',
    sourceId:intent.id,chainId:intent.chainId??null,asset:intent.result?.asset??null,collateral:intent.result?.collateral??null,
    status:'unavailable',baselineReproduced:false,receiptConsistent:false,fillCoverage:'unknown',rows:[],checks:[],
    execution:null,apiObservation:null,
    note:synthetic?'合成演练，没有网络交易、真实账户或链上成交。':'本地保存证据复核；未重新请求链节点，不构成来源真实性认证。'};
  const check=(id,label,ok,detail)=>report.checks.push({id,label,status:ok?'passed':'failed',detail});
  if(![1,2].includes(intent.spec?.t)){check('scope','开仓模型范围',false,'本轮支持开仓执行核对；平仓有独立结算口径，待后续实现。');return report;}
  let b;
  try{b=baseline(intent);report.baselineReproduced=true;check('baseline','提交前快照与模型复算',true,'完整模型、方向、市场、数量与提交请求一致。');}
  catch(e){check('baseline','提交前快照与模型复算',false,e.message);return report;}
  const pScale=10**b.market.config.price_decimals,sScale=10**b.market.config.size_decimals,cScale=10**b.token.decimals,r=b.result;
  report.rows=[metric('size','成交数量',r.asset,r.size,null),metric('vwap','成交均价',r.collateral,r.vwap,null),metric('notional','同数量名义金额',r.collateral,null,null),metric('fee','同数量交易费',r.collateral,null,null)];
  const rec=intent.reconciliation,o=rec?.order;
  if(!o){check('order','协议订单观察',false,'尚无匹配订单；无法将未找到解释为未成交。');return report;}
  let rawFilled,rawFee;
  try{
    if(o.rq!==intent.spec.rq||o.acc!==intent.spec.acc||o.mkt!==intent.spec.mkt||o.t!==intent.spec.t||o.os!==intent.spec.s)throw new Error('协议订单身份、方向或原始数量不匹配');
    rawFilled=integer(o.fs,'成交数量');if(rawFilled>intent.spec.s)throw new Error('成交数量超过请求数量');
    integer(o.fp,'成交价格',rawFilled?1:0);rawFee=amount(o.f,'交易费');
    if(rawFilled===0&&(o.fp!==0||rawFee!==0n))throw new Error('零成交与价格/交易费不一致');
    if(o.st===4&&rawFilled!==intent.spec.s)throw new Error('Filled状态与成交数量不一致');
    report.apiObservation={rawSize:rawFilled,rawFee:o.f,vwap:rawFilled?o.fp/pScale:null,size:rawFilled/sScale,fee:Number(rawFee)/cScale};
    check('order','协议订单身份与金额',true,'API观察仅作为待核对信息，不直接填入链证据列。');
  }catch(e){report.status='mismatch';check('order','协议订单身份与金额',false,e.message);return report;}
  const receipt=rec.receipt,tx=rec.transaction;
  if(!receipt||!tx){check('receipt','保存的回执与交易',false,'回执或交易缺失；协议观察不视为成交已核验。');return report;}
  let events;
  try{
    const h=o.at?.txid;if(!/^0x[0-9a-fA-F]{64}$/.test(h??''))throw new Error('协议订单无有效交易哈希');
    if(intent.chainId!==10143||rec.txHash?.toLowerCase()!==h.toLowerCase()||receipt.status!=='0x1'||receipt.transactionHash?.toLowerCase()!==h.toLowerCase()||tx.hash?.toLowerCase()!==h.toLowerCase())throw new Error('链、交易哈希或成功状态不一致');
    if(tx.chainId==null||Number(BigInt(tx.chainId))!==10143)throw new Error('保存的交易链ID不一致或缺失');
    integer(o.at.b,'订单区块',1);integer(o.at.l,'订单日志');
    if(Number(BigInt(receipt.blockNumber))!==o.at.b||Number(BigInt(tx.blockNumber))!==o.at.b||!/^0x[0-9a-fA-F]{64}$/.test(receipt.blockHash??'')||tx.blockHash?.toLowerCase()!==receipt.blockHash.toLowerCase())throw new Error('区块高度或区块哈希不一致');
    if(!Array.isArray(receipt.logs)||receipt.logs.some(l=>l.removed||l.transactionHash&&l.transactionHash.toLowerCase()!==h.toLowerCase()||l.blockHash&&l.blockHash.toLowerCase()!==receipt.blockHash.toLowerCase()))throw new Error('日志被移除或来自其他交易/区块');
    events=decodeReceipt(receipt,{exchange:b.instance.address,perpetualId:b.market.perpetual_id,accountId:intent.spec.acc,requestId:intent.spec.rq,orderType:intent.spec.t,rawSize:intent.spec.s,apiOrder:o});
    if(!events.verified)throw new Error(events.reason);
    if(events.request.args.leverageHdths!==String(intent.spec.lv)||events.request.args.immediateOrCancel!==true)throw new Error('请求事件的杠杆或IOC类型与本应用预估不一致');
    const fills=events.group.filter(e=>/^TakerOrderFilled(V2)?$/.test(e.name));
    if(fills.some(e=>BigInt(e.args.builderFeeCNS??'0')!==0n)||BigInt(o.bfa??'0')!==0n)throw new Error('非零builder附加费事件口径尚待核验，保留为未支持证据');
    if(rawFilled&&Math.abs(events.fillPriceScaled-o.fp)>=1+1e-9)throw new Error('API与事件加权均价相差至少一个价格单位');
    check('receipt','链/区块/请求事件与成交核对',true,'保存的回执、请求、成交数量和费用一致；API均价允许不足一个价格单位的取整差异。');
    report.receiptConsistent=true;
  }catch(e){report.status='mismatch';check('receipt','链/区块/请求事件与成交核对',false,e.message);return report;}
  report.fillCoverage=rawFilled===0?'zero':rawFilled===intent.spec.s?'full':'partial';
  report.status=rawFilled?'rechecked':'no_fill';
  const size=rawFilled/sScale,vwap=rawFilled?events.fillPriceScaled/pScale:null,fee=Number(rawFee)/cScale;
  const plannedMatched=r.vwap*size,actualNotional=vwap===null?0:vwap*size,matchedFee=plannedMatched*r.feeBps/10000;
  report.rows=[metric('size','成交数量',r.asset,r.size,size),metric('vwap','成交均价',r.collateral,r.vwap,vwap),metric('notional','同数量名义金额',r.collateral,plannedMatched,actualNotional),metric('fee','同数量交易费',r.collateral,matchedFee,fee)];
  const submitted=Date.parse(intent.createdAt),observed=o.at.t,delay=Number.isFinite(submitted)&&Number.isFinite(observed)&&observed>=submitted?observed-submitted:null;
  report.execution={size,vwap,fee,rawFilledSize:events.rawFilledSize,rawFee:events.rawFee,fillRatio:rawFilled/intent.spec.s,
    priceDeviationBps:vwap===null?null:(vwap/r.vwap-1)*10000,
    adversePriceCost:vwap===null?null:(r.input.direction==='long'?1:-1)*(vwap-r.vwap)*size,
    feeDelta:fee-matchedFee,feePriceComponent:(actualNotional-plannedMatched)*r.feeBps/10000,
    feeResidual:fee-actualNotional*r.feeBps/10000,observedDelayMs:delay,
    fundingPaid:null,realizedPnl:null,abiSha256:events.abiSha256};
  report.limitations=['费用仅比较本笔开仓；部分成交按实际已成交数量缩放估算，未成交数量不计成本。',
    '费用剩余差额可能来自取整、费率或协议费用；不是因果归因。非零builder费当前不支持。',
    '观察时间差不是独立测量的链结算延迟。实际资金费用、平仓费用与已实现损益未核验，保持未知。',
    '保存证据可能过时或被整体替换；本地复算及哈希不认证节点来源，也不确认当前链最终性。'];
  return report;
}
export function auditPacket(intent,{synthetic=false}={}){
  const report=auditExecution(intent,{synthetic});return {schema:AUDIT_VERSION,classification:report.classification,intentSnapshot:intent,intentHash:hash(intent),report,reportHash:hash(report)};
}
export function replayAudit(packet){
  if(packet.schema!==AUDIT_VERSION||!['synthetic_execution_audit','stored_execution_audit'].includes(packet.classification))throw new Error('执行报告版本或分类无效');
  if(hash(packet.intentSnapshot)!==packet.intentHash||hash(packet.report)!==packet.reportHash)throw new Error('执行证据或报告哈希不一致');
  const report=auditExecution(packet.intentSnapshot,{synthetic:packet.classification==='synthetic_execution_audit'});
  if(report.classification!==packet.classification||hash(report)!==packet.reportHash)throw new Error('执行报告无法完整复算');
  return {status:'reproduced',classification:packet.classification,sourceId:report.sourceId,resultStatus:report.status,receiptConsistent:report.receiptConsistent,note:'哈希与复算不证明来源真实性；合成样例不是真实链成交。'};
}
