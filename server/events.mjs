import fs from 'node:fs';
import {Interface} from 'ethers';
import {hash} from './store.mjs';
const raw=fs.readFileSync(new URL('./vendor/perpl-exchange-events.json',import.meta.url),'utf8');
export const EVENT_ABI_HASH=hash(raw),exchangeInterface=new Interface(JSON.parse(raw));
export function decodeReceipt(receipt,{exchange,perpetualId,accountId,requestId,orderType,rawSize,apiOrder}) {
  const decoded=[];
  for(const log of receipt?.logs??[]){if(log.address.toLowerCase()!==exchange.toLowerCase())continue;
    try{const event=exchangeInterface.parseLog({topics:log.topics,data:log.data});if(!event)continue;
      const args=Object.fromEntries(event.fragment.inputs.map((input,i)=>[input.name,typeof event.args[i]==='bigint'?event.args[i].toString():event.args[i]]));
      decoded.push({name:event.name,args,logIndex:Number(BigInt(log.logIndex))});
    }catch{/* Unknown ABI/version fails the association check, never counts as proof. */}
  }
  decoded.sort((a,b)=>a.logIndex-b.logIndex);
  const isRequest=e=>/^OrderRequest(V2)?$/.test(e.name);
  const matching=decoded.filter(e=>isRequest(e)&&e.args.perpId===String(perpetualId)&&e.args.accountId===String(accountId)
    &&e.args.orderDescId===String(requestId)&&e.args.orderType===String(orderType)&&e.args.lotLNS===String(rawSize));
  if(matching.length!==1)return {verified:false,reason:'回执中无唯一匹配的协议OrderRequest事件',decoded,abiSha256:EVENT_ABI_HASH};
  const request=matching[0],next=decoded.find(e=>isRequest(e)&&e.logIndex>request.logIndex);
  const group=decoded.filter(e=>e.logIndex>=request.logIndex&&(!next||e.logIndex<next.logIndex));
  const apiLog=group.find(e=>e.logIndex===apiOrder.at.l);
  const fills=group.filter(e=>/^TakerOrderFilled(V2)?$/.test(e.name));
  const size=fills.reduce((sum,e)=>sum+BigInt(e.args.lotLNS),0n),fee=fills.reduce((sum,e)=>sum+BigInt(e.args.feeCNS),0n);
  const weighted=fills.reduce((sum,e)=>sum+BigInt(e.args.entryPricePNS)*BigInt(e.args.lotLNS),0n);
  const apiSize=BigInt(apiOrder.fs??0),apiFee=BigInt(apiOrder.f??'0');
  const filled=apiSize>0n;
  // No future matching/settlement or unknown event shape can be guessed into proof.
  const verified=Boolean(apiLog && (!filled||(fills.length&&size===apiSize&&fee===apiFee)));
  return {verified,reason:verified?'请求、账户、市场及成交数量/费用与链事件一致':'API日志位置或成交数量/费用与链事件不一致',
    request,group,decoded,rawFilledSize:size.toString(),rawFee:fee.toString(),
    fillPriceScaled:size>0n?Number(weighted)/Number(size):null,abiSha256:EVENT_ABI_HASH};
}
