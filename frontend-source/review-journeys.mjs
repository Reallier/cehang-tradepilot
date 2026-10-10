// Presentation projection of a workspace already reproduced by workspaceReview.
// Display association never upgrades an unverified settlement to a passed one.
export function reviewJourneys(packet){
 const {trade,comparisons}=packet,e=trade.observation.evidence,ctx=e.account.snapshot.context;
 const history=k=>e.histories[k].pages.flatMap(p=>p.value.d);
 const orders=history('order-history'),positions=history('position-history');
 const identity=r=>`${r.accountId}:${r.marketId}`;
 const orderMeta=r=>{const rows=orders.filter(o=>o.acc===r.accountId&&o.mkt===r.marketId&&o.oid===r.orderId);return rows.length===1?rows[0]:null;};
 const positionId=r=>{
  if(r.execution?.positionId!=null)return r.execution.positionId;
  const rows=positions.filter(p=>p.acc===r.accountId&&p.mkt===r.marketId&&p.oid===r.orderId);
  return rows.length===1?rows[0].pid:null;
 };
 const items=trade.report.opening.orders.map((open,i)=>{
  const market=ctx.markets.find(m=>m.id===open.marketId),instance=ctx.instances.find(v=>v.id===market?.instance_id),token=ctx.tokens.find(t=>t.id===instance?.collateral_token_id),meta=orderMeta(open);
  return {id:`${identity(open)}:${open.orderId}`,accountId:open.accountId,marketId:open.marketId,positionId:positionId(open),asset:market?.symbol??`市场 ${open.marketId}`,unit:token?.symbol??'抵押代币',direction:meta?.t===1?'多头':meta?.t===2?'空头':'方向未知',openedAt:meta?.at?.t??null,open,exits:[],comparison:comparisons[i]??null};
 });
 const unlinked=[];
 for(const exit of trade.report.closed){
  const pid=positionId(exit),matches=items.filter(j=>identity(j)===identity(exit)&&pid!=null&&j.positionId===pid);
  if(matches.length===1)matches[0].exits.push(exit);else unlinked.push(exit);
 }
 for(const j of items){
  const exit=j.exits.length===1?j.exits[0]:null,verified=j.open.status==='opening_reconciled'&&exit?.status==='exit_reconciled';
  j.state=j.open.status!=='opening_reconciled'||j.exits.length>1||j.exits.some(x=>x.status!=='exit_reconciled')?'review':verified?(exit.execution.partial?'partial':'closed'):'exit_missing';
  j.closedAt=exit?orderMeta(exit)?.at?.t??null:null;
  j.durationMs=j.openedAt!=null&&j.closedAt!=null&&j.closedAt>=j.openedAt?j.closedAt-j.openedAt:null;
  j.pnl=verified?{price:exit.execution.grossPnl,funding:exit.execution.fundingPnl,entryFee:exit.execution.entryFeeShare,exitFee:exit.execution.fee,net:exit.realizedPnl}:null;
 }
 return {items,unlinked};
}

// Keep nonzero sub-unit differences visible without inventing token precision.
export function reviewNumber(value,digits=6,{signed=false}={}){
 if(typeof value!=='number'||!Number.isFinite(value))return '—';
 if(value===0)return '0';
 const magnitude=Math.abs(value);
 const body=magnitude<10**-digits?magnitude.toExponential(4):magnitude.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:digits});
 return `${value<0?'−':signed?'+':''}${body}`;
}
