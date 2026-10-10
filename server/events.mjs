import {Interface} from 'ethers';
import abi from './vendor/perpl-exchange-events.json' with {type:'json'};
// Pinned file digest is checked by regression tests; import JSON keeps browser verification local.
export const EVENT_ABI_HASH='3db1ccbe08a86fbe4b66a8a5a7688e43503f7a57c81da8b2cac5fb39761e9553',exchangeInterface=new Interface(abi);
export function normalizeTxHash(value){return typeof value==='string'&&/^(?:0x)?[0-9a-fA-F]{64}$/.test(value)?'0x'+value.replace(/^0x/,'').toLowerCase():null;}
export function decodeReceipt(receipt,{exchange,perpetualId,accountId,requestId,orderType,rawSize,apiOrder}) {
  const decoded=[];
  // REST OrderType is 1..4; contract OrderType is zero-based (SDK types/order.rs).
  if(![1,2,3,4].includes(orderType))return {verified:false,reason:'不支持的订单类型',decoded,abiSha256:EVENT_ABI_HASH};
  const logs=receipt?.logs??[];
  let previous=-1;
  for(const log of logs){const index=Number(BigInt(log.logIndex));if(!Number.isSafeInteger(index)||index<=previous||log.removed)return {verified:false,reason:'回执日志顺序或状态无效',decoded,abiSha256:EVENT_ABI_HASH};previous=index;}
  // REST at.l is transaction-local, whereas RPC logIndex is block-global.
  for(const [transactionLogIndex,log] of logs.entries()){if(log.address.toLowerCase()!==exchange.toLowerCase())continue;
    try{const event=exchangeInterface.parseLog({topics:log.topics,data:log.data});if(!event)continue;
      const args=Object.fromEntries(event.fragment.inputs.map((input,i)=>[input.name,typeof event.args[i]==='bigint'?event.args[i].toString():event.args[i]]));
      decoded.push({name:event.name,args,logIndex:Number(BigInt(log.logIndex)),transactionLogIndex});
    }catch{/* Unknown ABI/version fails the association check, never counts as proof. */}
  }
  decoded.sort((a,b)=>a.logIndex-b.logIndex);
  const isRequest=e=>/^OrderRequest(V2)?$/.test(e.name);
  const matching=decoded.filter(e=>isRequest(e)&&e.args.perpId===String(perpetualId)&&e.args.accountId===String(accountId)
    &&e.args.orderDescId===String(requestId)&&e.args.orderType===String(orderType-1)&&e.args.lotLNS===String(rawSize));
  if(matching.length!==1)return {verified:false,reason:'回执中无唯一匹配的协议OrderRequest事件',decoded,abiSha256:EVENT_ABI_HASH};
  const request=matching[0],next=decoded.find(e=>isRequest(e)&&e.logIndex>request.logIndex);
  const group=decoded.filter(e=>e.logIndex>=request.logIndex&&(!next||e.logIndex<next.logIndex));
  const apiLog=group.find(e=>e.transactionLogIndex===apiOrder.at.l);
  const fills=group.filter(e=>/^TakerOrderFilled(V2)?$/.test(e.name));
  const size=fills.reduce((sum,e)=>sum+BigInt(e.args.lotLNS),0n),fee=fills.reduce((sum,e)=>sum+BigInt(e.args.feeCNS),0n);
  const weighted=fills.reduce((sum,e)=>sum+BigInt(e.args.entryPricePNS)*BigInt(e.args.lotLNS),0n);
  const apiSize=BigInt(apiOrder.fs??0),apiFee=BigInt(apiOrder.f??'0');
  const filled=apiSize>0n;
  // No future matching/settlement or unknown event shape can be guessed into proof.
  const verified=Boolean(apiLog && (filled?/^TakerOrderFilled(V2)?$/.test(apiLog.name)&&fills.length&&size===apiSize&&fee===apiFee:size===0n&&fee===0n&&apiFee===0n));
  return {verified,reason:verified?'请求、账户、市场及成交数量/费用与链事件一致':'API日志位置或成交数量/费用与链事件不一致',
    request,group,decoded,rawFilledSize:size.toString(),rawFee:fee.toString(),
    fillPriceScaled:size>0n?Number(weighted)/Number(size):null,abiSha256:EVENT_ABI_HASH};
}
