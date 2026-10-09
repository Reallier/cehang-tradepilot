export const now=1791500000000;
export function fixture(){const market={id:1,name:'BTC',symbol:'BTC',instance_id:1,perpetual_id:1,funding_interval_sec:3600,
 config:{is_open:true,price_decimals:2,size_decimals:3,initial_margin:1000,maintenance_margin:2000,maker_fee:100,taker_fee:1000,taker_fees:[1000,500],min_settle_amount:'0'},
 state:{at:{t:now,b:100},mrk:10000,bid:9900,ask:10000,prv:10000,lst:10000},funding:{at:{t:now,b:90},feb:90,rate:1000,sum:200,div:1}};
 const context={chain:{chain_id:10143,gas:{h:100}},instances:[{id:1,address:'0x'+'1'.repeat(40),collateral_token_id:1}],tokens:[{id:1,symbol:'TESTUSD',decimals:6,address:'0x'+'2'.repeat(40)}],markets:[market]};
 const book={at:{t:now,b:100},bid:[{p:9900,s:20000}],ask:[{p:10000,s:1000},{p:11000,s:10000}]};
 const input={direction:'long',notional:200,leverage:2,hours:2,shockPct:0,slippageBps:100};return {market,context,book,input,now};}
