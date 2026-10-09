export const POSITION_EXAMPLES=[
 {id:'long',label:'多头 · 全量退出',closePct:100},
 {id:'partial',label:'多头 · 退出50%',closePct:50},
 {id:'short',label:'空头 · 买回退出',closePct:100},
 {id:'funding_unknown',label:'资金事件尚未应用',closePct:100},
 {id:'shallow',label:'退出盘口覆盖不足',closePct:100},
 {id:'stale',label:'仓位快照陈旧',closePct:100}
];
export function positionExample(id,closePct) {
 const example=POSITION_EXAMPLES.find(e=>e.id===id);if(!example)throw new Error('持仓案例不存在');
 const now=Date.UTC(2026,9,9,8),at={t:now,b:100};
 const market={id:1,name:'BTC',symbol:'BTC',instance_id:1,funding_interval_sec:3600,
  config:{is_open:true,price_decimals:2,size_decimals:3,initial_margin:1000,maintenance_margin:2000,maker_fee:100,taker_fee:1000,taker_fees:[1000,500]},
  state:{at,mrk:10500,bid:10400,ask:10600,prv:10000,lst:10500},funding:{at:{t:now-1000,b:90},feb:90,rate:1000,sum:200,div:1}};
 const position={at:{t:now-86400000,b:10},mkt:1,acc:1,pid:1,st:1,sd:1,s:1000,ep:10000,epr:0,c:'20000000',fee:'1000000',cfee:'0',efs:100};
 const context={chain:{chain_id:10143,gas:{h:100}},instances:[{id:1,address:'0x'+'1'.repeat(40),collateral_token_id:1}],tokens:[{id:1,symbol:'TESTUSD',decimals:6,address:'0x'+'2'.repeat(40)}],markets:[market]};
 const book={at,bid:[{p:10400,s:400},{p:10300,s:2000}],ask:[{p:10600,s:400},{p:10700,s:2000}]};
 const snapshotAt={...at};
 if(id==='short'){position.sd=2;position.ep=11000;}
 if(id==='funding_unknown'){market.funding.at={t:now+1000,b:101};market.funding.feb=101;}
 if(id==='shallow')book.bid=[{p:10400,s:250}];
 if(id==='stale')snapshotAt.t=now-60000;
 return {position,context,book,snapshotAt,input:{closePct:closePct??example.closePct},feeTier:null,now};
}
