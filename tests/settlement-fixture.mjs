import {fixture} from './history-fixture.mjs';
import {hash} from '../server/integrity.mjs';
import {exchangeInterface} from '../server/events.mjs';
const rehash=p=>(p.evidenceHash=hash(p.evidence),p);
export function lifecycle({short=false,partial=false,partialEntry=false}={}){
 const p=fixture(),e=p.evidence,h=k=>e.histories[k].pages[0].value.d,open=h('position-history')[0],order=h('order-history')[0];
 const encode=(name,args,meta,index)=>({...meta,...exchangeInterface.encodeEventLog(exchangeInterface.getEvent(name),args),address:e.account.snapshot.context.instances[0].address,logIndex:'0x'+index.toString(16)});
 if(short||partialEntry){
  if(short){order.t=2;open.sd=2;h('fills')[0].t=2;}
  if(partialEntry){order.os=2000;order.st=5;}
  const r=e.chain[0].receipt,meta=r.logs[1];
  r.logs[1]=encode('OrderRequest',[1,1,8,0,short?1:0,0,order.os,0,false,false,true,0,500,0,0,0,0],meta,31);
  r.logs[2]=encode('PositionOpened',[1,1,short?1:0,500,20000000,0,10000,1000,15000,85000],meta,32);
 }
 const tx='0x'+'c'.repeat(64),blockHash='0x'+'d'.repeat(64),size=partial?500:1000,release=partial?10000000:20000000,pnl=partial?5000000:10000000,fee=partial?55000:110000,funding=-10000,credit=release+pnl+funding-fee;
 const at=l=>({b:101,tx:2,l,txid:tx.slice(2),t:order.at.t+1000}),price=short?9000:11000;
 const close={at:at(2),acc:1,mkt:1,rq:18,oid:19,t:short?4:3,st:4,os:size,fs:size,fp:price,f:String(fee),lv:500,fl:4};
 h('order-history').push(close);h('fills').push({at:at(2),mkt:1,acc:1,oid:19,t:close.t,l:2,p:price,s:size,f:String(fee)});
 h('position-history').push({...open,at:at(1),sr:partial?14:13,st:partial?1:2,oid:19,rq:18,s:size,c:String(-release),xp:price,dpnl:String(pnl),fnd:String(funding),cfee:String(fee),fee:String(fee+(partial?50000:100000))});
 h('account-history').push({at:at(2),in:1,id:1,et:4,m:1,r:18,o:19,a:String(credit),b:String(79900000+credit),f:String(fee)});
 const meta={transactionHash:tx,blockHash,blockNumber:'0x65',transactionIndex:'0x2',removed:false};
 const logs=[encode('OrderRequest',[1,1,18,0,short?3:2,0,size,0,false,false,true,0,500,0,0,0,0],meta,10),encode(partial?'PositionDecreased':'PositionClosed',partial?[1,1,short?1:0,20000000,10000000,1000,500,pnl,funding]:[1,1,short?1:0,price,pnl,funding],meta,11),encode('TakerOrderFilled',[price,price,price,size,fee,credit,79900000+credit],meta,12)];
 e.chain.push({txHash:tx,receipt:{...meta,status:'0x1',logs},transaction:{hash:tx,chainId:'0x279f',blockHash,blockNumber:'0x65',transactionIndex:'0x2',to:logs[0].address}});
 return rehash(p);
}
