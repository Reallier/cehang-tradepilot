import {replayAccount} from '../server/account-verification.mjs';
function collateralIdentity(snapshot,market){
 const instance=snapshot.context.instances.find(i=>i.id===market?.instance_id);
 const token=snapshot.context.tokens.find(t=>t.id===instance?.collateral_token_id);
 if(!Number.isSafeInteger(instance?.id)||instance.id<0||!Number.isSafeInteger(token?.id)||token.id<0||
    typeof token.address!=='string'||!/^0x[0-9a-f]{40}$/i.test(token.address)||
    !Number.isInteger(token.decimals)||token.decimals<0||token.decimals>12)return null;
 return JSON.stringify([instance.id,token.id,token.address.toLowerCase(),token.decimals]);
}
export function accountChanges(previous,current){
 replayAccount(current);if(!previous)return {state:'first',rows:[]};replayAccount(previous);
 if(previous.classification!==current.classification||previous.snapshot.expectedWallet.toLowerCase()!==current.snapshot.expectedWallet.toLowerCase()||previous.report.chainId!==current.report.chainId)return {state:'different_identity',rows:[]};
 if(current.snapshot.now<=previous.snapshot.now)return {state:'not_newer',rows:[]};
 const key=p=>`${p.accountId}:${p.marketId}:${p.positionId}`;
 const before=new Map(previous.report.positions.map(p=>[key(p),p])),after=new Map(current.report.positions.map(p=>[key(p),p]));
 const valid=!previous.report.issues.length&&!current.report.issues.length;
 const rows=[...new Set([...before.keys(),...after.keys()])].map(id=>{
  const a=before.get(id),b=after.get(id),r=b??a;
  const oldMarket=previous.snapshot.context.markets.find(m=>m.id===a?.marketId),newMarket=current.snapshot.context.markets.find(m=>m.id===b?.marketId);
  const oldToken=collateralIdentity(previous.snapshot,oldMarket),newToken=collateralIdentity(current.snapshot,newMarket);
  const comparable=valid&&a?.risk?.status!=='incomplete'&&b?.risk?.status!=='incomplete'&&a?.risk&&b?.risk&&oldToken!==null&&oldToken===newToken;
  const delta=k=>comparable&&Number.isFinite(a.risk[k])&&Number.isFinite(b.risk[k])?b.risk[k]-a.risk[k]:null;
  return {id,accountId:r.accountId,positionId:r.positionId,asset:r.risk?.asset??'未知市场',unit:r.risk?.collateralToken??'—',state:!a?'newly_observed':!b?'no_longer_observed':comparable?'compared':'unknown',markDelta:delta('markPrice'),pnlDelta:delta('unrealizedPnl'),bufferDelta:delta('marginBuffer'),changed:comparable?['markPrice','size','collateral','fundingPnl','maintenanceEstimate'].filter(k=>a.risk[k]!==b.risk[k]):[]};
 });
 return {state:'compared',rows};
}
export function monitorFreshness(m,now=Date.now()){
 if(m?.state==='backoff')return 'backoff';if(m?.state==='stopped')return 'stopped';
 if(!m?.packet)return 'unavailable';
 const s=m.packet.snapshot,stamps=[s.now,s.wallet.at.t,s.positions.at.t,...s.context.markets.filter(m=>s.positions.d.some(p=>p.mkt===m.id)).map(m=>m.state.at.t)];
 if(m.packet.report.status==='incomplete'||stamps.some(t=>!Number.isFinite(t)||now-t>45000||t>now+5000)||now-Date.parse(m.nextAttemptAt)>15000)return 'stale';
 return 'fresh';
}
