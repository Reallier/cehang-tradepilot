import {hash} from '../server/store.mjs';
import {positionExample} from '../server/position-examples.mjs';
import {analyzeAccount} from '../server/account-analysis.mjs';
import {exchangeInterface} from '../server/events.mjs';
// Synthetic: unrelated account and prices, but real REST/contract encoding conventions.
export function fixture(){
 const f=positionExample('long'),wallet='0x'+'3'.repeat(40),txHash='0x'+'a'.repeat(64),blockHash='0x'+'b'.repeat(64),exchange=f.context.instances[0].address;
 f.context.markets[0].perpetual_id=1;Object.assign(f.position,{rq:8,oid:9,fee:'100000',lv:500});
 const snap={expectedWallet:wallet,context:f.context,positions:{mt:26,sn:100,at:f.snapshotAt,d:[f.position]},wallet:{mt:19,sn:100,at:f.snapshotAt,addr:wallet,as:[{id:1,in:1,ft:0,b:'79900000',lb:'0',fr:false,fw:false}]},rpcChainId:10143,rpcHead:100,now:f.now};
 const report=analyzeAccount(snap),account={schema:'account-observation-v1',classification:'private_account_observation',snapshot:snap,snapshotHash:hash(snap),report,reportHash:hash(report)};
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
 return {schema:'trade-history-observation-v1',classification:'private_testnet_history',evidence,evidenceHash:hash(evidence)};
}
