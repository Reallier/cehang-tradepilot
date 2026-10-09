import {exchangeInterface} from './events.mjs';
import {simulate} from './risk.mjs';
import {estimateEvidence} from './execution-audit.mjs';

export const EXECUTION_EXAMPLES=[{id:'full',label:'合成 · 全部成交'},{id:'partial',label:'合成 · 部分成交'},{id:'unconfirmed',label:'合成 · 缺少回执'},{id:'mismatch',label:'合成 · 费用不匹配'},{id:'zero',label:'合成 · 未成交取消'}];
// Synthetic local fixtures, never inserted into the order ledger or sent to a network.
export function executionExample(id){
 if(!EXECUTION_EXAMPLES.some(x=>x.id===id))throw new Error('合成案例不存在');
 const now=1791500000000,exchange='0x'+'1'.repeat(40),txHash='0x'+'a'.repeat(64),blockHash='0x'+'b'.repeat(64);
 const market={id:1,name:'BTC',symbol:'BTC',instance_id:1,perpetual_id:1,funding_interval_sec:3600,
 config:{is_open:true,price_decimals:2,size_decimals:3,initial_margin:1000,maintenance_margin:2000,maker_fee:100,taker_fee:1000,taker_fees:[1000,500],min_settle_amount:'0'},
 state:{at:{t:now,b:100},mrk:10000,bid:9900,ask:10000,prv:10000,lst:10000},funding:{at:{t:now,b:90},feb:90,rate:1000,sum:200,div:1}};
 const context={chain:{chain_id:10143,gas:{h:100}},instances:[{id:1,address:exchange,collateral_token_id:1}],tokens:[{id:1,symbol:'TESTUSD',decimals:6,address:'0x'+'2'.repeat(40)}],markets:[market]};
 const book={at:{t:now,b:100},bid:[{p:9900,s:20000}],ask:[{p:10000,s:1000},{p:11000,s:10000}]};
 const input={direction:'long',notional:50,leverage:3,hours:1,shockPct:-5,slippageBps:25};
 const result=simulate({market,context,book,input,now,feeTier:0});
 const spec={rq:8,mkt:1,acc:7,t:1,p:0,s:result.rawSize,ms:25,mnp:0,fl:4,lv:300,lb:0};
 const filled=id==='zero'?0:id==='partial'?250:500,fee=id==='zero'?0:id==='partial'?25065:50128;
 const event=(name,args,index)=>({...exchangeInterface.encodeEventLog(exchangeInterface.getEvent(name),args),address:exchange,logIndex:`0x${index.toString(16)}`,transactionHash:txHash,blockHash,blockNumber:'0x65',removed:false});
 const logs=[event('OrderRequest',[1,7,8,0,1,0,500,0,false,false,true,0,300,0,0,0,0],1)];
 if(filled)logs.push(event('TakerOrderFilled',[10025,10025,10025,filled,fee,0,1000000],2));
 const order={rq:8,mkt:1,acc:7,t:1,os:500,fs:filled,fp:filled?10025:0,f:String(fee),st:id==='zero'?5:id==='partial'?3:4,at:{t:now+4000,b:101,l:filled?2:1,txid:txHash}};
 const receipt={status:'0x1',transactionHash:txHash,blockNumber:'0x65',blockHash,logs};
 const transaction={hash:txHash,chainId:'0x279f',blockNumber:'0x65',blockHash};
 const intent={id:`sample_${id}`,synthetic:true,source:'local_synthetic_fixture',chainId:10143,accountId:7,createdAt:new Date(now+1000).toISOString(),spec,result,estimateEvidence:estimateEvidence(context,book,result),
  reconciliation:{order,txHash,receipt,transaction,chainVerified:false},status:'synthetic'};
 if(id==='unconfirmed'){intent.reconciliation.receipt=null;intent.reconciliation.transaction=null;}
 if(id==='mismatch')intent.reconciliation.order.f=String(fee+1);
 return intent;
}
