export function stampQuality(time,now){
 if(!Number.isFinite(time))return {state:'unknown',ageMs:null};
 const ageMs=now-time;
 return {state:ageMs< -5000?'future':ageMs>45000?'stale':'fresh',ageMs};
}
export function feedQuality(live,network,marketId,now,error=''){
 const matching=live?.network===network&&live?.selectedId===marketId;
 const market=matching?live.markets.find(m=>m.marketId===marketId):null;
 const rows=matching?live.book??[]:[];
 const price=stampQuality(market?.sourceMs,now);
 const times=rows.map(r=>Date.parse(r.sourceTime));
 const valid=rows.some(r=>r.side==='ask')&&rows.some(r=>r.side==='bid')&&times.every(Number.isFinite);
 const book=stampQuality(valid?Math.min(...times):NaN,now);
 if(valid&&times.some(t=>t>now+5000))book.state='future';
 const source=matching?live.sources?.find(s=>s.stream?.startsWith('order-book@')||s.url?.includes('/book')):null;
 return {price,book,transport:source?.transport==='websocket'?'WebSocket 快照':source?'REST 快照':'未知来源',
  fresh:!error&&price.state==='fresh'&&book.state==='fresh',failed:!!error};
}
