import {hash} from './store.mjs';
import {positionExample} from './position-examples.mjs';
import {analyzeAccount} from './account-analysis.mjs';
import {exchangeInterface} from './events.mjs';
// Synthetic: unrelated account and prices, but real REST/contract encoding conventions.
function openingFixture(){
 const f=positionExample('long'),wallet='0x'+'3'.repeat(40),txHash='0x'+'a'.repeat(64),blockHash='0x'+'b'.repeat(64),exchange=f.context.instances[0].address;
 f.context.markets[0].perpetual_id=1;Object.assign(f.position,{rq:8,oid:9,fee:'100000',lv:500});
 const snap={expectedWallet:wallet,context:f.context,positions:{mt:26,sn:100,at:f.snapshotAt,d:[f.position]},wallet:{mt:19,sn:100,at:f.snapshotAt,addr:wallet,as:[{id:1,in:1,ft:0,b:'79900000',lb:'0',fr:false,fw:false}]},rpcChainId:10143,rpcHead:100,now:f.now};
 const report=analyzeAccount(snap),account={schema:'account-observation-v1',classification:'synthetic_account_observation',snapshot:snap,snapshotHash:hash(snap),report,reportHash:hash(report)};
 const at=l=>({b:100,tx:3,l,txid:txHash.slice(2),t:f.now});
 const order={at:at(3),acc:1,mkt:1,rq:8,oid:9,t:1,st:4,os:1000,fs:1000,fp:10000,f:'100000',lv:500,fl:4};
 const opening={...f.position,at:at(2),sr:21};
 const fill={at:at(3),mkt:1,acc:1,oid:9,t:1,l:2,p:10000,s:1000,f:'100000'};
 const settlement={at:at(3),in:1,id:1,et:4,m:1,r:8,o:9,a:'-20100000',b:'79900000',f:'100000'};
 const meta={transactionHash:txHash,blockHash,blockNumber:'0x64',transactionIndex:'0x3',removed:false};
 const event=(name,args,index)=>({...meta,...exchangeInterface.encodeEventLog(exchangeInterface.getEvent(name),args),address:exchange,logIndex:'0x'+index.toString(16)});
 // Foreign log counts toward transaction-local at.l, but is not decoded as Perpl.
 const logs=[{...meta,address:'0x'+'9'.repeat(40),logIndex:'0x1e',topics:[],data:'0x'},event('OrderRequest',[1,1,8,0,0,0,1000,0,false,false,true,0,500,0,0,0,0],31),event('PositionOpened',[1,1,0,500,20000000,0,10000,1000,15000,85000],32),event('TakerOrderFilled',[10000,10000,10000,1000,100000,-20100000,79900000],33)];
 const receipt={...meta,status:'0x1',logs},transaction={hash:txHash,chainId:'0x279f',blockHash,blockNumber:'0x64',transactionIndex:'0x3',to:exchange};
 const histories=Object.fromEntries(Object.entries({'order-history':[order],fills:[fill],'position-history':[opening],'account-history':[settlement]}).map(([k,d])=>[k,{pages:[{value:{d,np:''}}],complete:true}]));
 const evidence={account,histories,chain:[{txHash,receipt,transaction}],head:110,collectedAt:new Date(f.now).toISOString(),receiptCoverageComplete:true};
 return {schema:'trade-history-observation-v1',classification:'synthetic_testnet_history',evidence,evidenceHash:hash(evidence)};
}

function lifecycle({short=false,partial=false,partialEntry=false}={}){
 const p=openingFixture(),e=p.evidence,h=k=>e.histories[k].pages[0].value.d,open=h('position-history')[0],order=h('order-history')[0];
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
 p.evidenceHash=hash(e);return p;
}

import {simulate} from './risk.mjs';
import {createBaseline,compareBaseline} from './pretrade-baseline.mjs';
import {tradeReviewPacket} from './settlement-audit.mjs';
export function guidedReview(){
 const observation=lifecycle(),e=observation.evidence,at=e.histories['order-history'].pages[0].value.d[0].at.t-10000;
 const context=structuredClone(e.account.snapshot.context),market=context.markets[0];
 context.chain.gas.h=99;market.state.at={t:at,b:99};market.state.mrk=9950;market.state.bid=9940;market.state.ask=9950;
 market.funding.at={t:at,b:90};
 const book={at:{t:at,b:99},bid:[{p:9940,s:10000}],ask:[{p:9950,s:10000}]};
 const input={direction:'long',notional:99.5,leverage:5,hours:0,shockPct:-5,slippageBps:100};
 const preview={id:'preview_synthetic-guided',network:'testnet',createdAt:new Date(at).toISOString(),context,book,originalInput:input,inputHash:hash(input),snapshotHashes:{context:hash(context),book:hash(book)},result:simulate({context,market,book,input,now:at})};
 const baseline=createBaseline(preview,at+1000);
 // The case is a completed lifecycle: its final account observation is empty.
 const snap=e.account.snapshot;snap.positions.d=[];snap.positions.at={t:at+11000,b:101};snap.wallet.as[0].b='109780000';snap.wallet.at=snap.positions.at;snap.wallet.sn=101;snap.positions.sn=101;snap.context.chain.gas.h=110;snap.rpcHead=110;snap.now=at+12000;
 e.account.snapshotHash=hash(snap);e.account.report=analyzeAccount(snap);e.account.reportHash=hash(e.account.report);e.collectedAt=new Date(snap.now).toISOString();observation.evidenceHash=hash(e);
 const trade=tradeReviewPacket(observation);
 return {schema:'account-trade-workspace-v1',trade,baseline,comparisons:trade.report.opening.orders.map(o=>compareBaseline(baseline,observation,o))};
}
