import {positionRisk,positionStampWithinSnapshot} from './risk.mjs';
const address=v=>typeof v==='string'&&/^0x[0-9a-fA-F]{40}$/.test(v);
const uint=v=>Number.isSafeInteger(v)&&v>=0;
const fail=code=>{const e=new Error(code);e.code=code;throw e;};

export function analyzeAccount(snapshot) {
  const {context,wallet,positions,expectedWallet,rpcChainId,rpcHead,now}=snapshot;
  if(!Number.isFinite(now)||context?.chain?.chain_id!==10143||rpcChainId!==10143||!uint(rpcHead)||!uint(context?.chain?.gas?.h))fail('NETWORK_OR_HEAD_INVALID');
  if(!address(expectedWallet)||!address(wallet?.addr)||wallet.addr.toLowerCase()!==expectedWallet.toLowerCase())fail('WALLET_IDENTITY_MISMATCH');
  if(wallet.mt!==19||positions?.mt!==26||!Array.isArray(wallet.as)||!Array.isArray(positions.d)||wallet.as.length>100||positions.d.length>100)fail('ACCOUNT_SCHEMA_INVALID');
  const issues=[];
  const stamp=(s,label)=>{
    if(!uint(s?.at?.b)||!Number.isFinite(s?.at?.t)||s.sn!==s.at.b)fail('SNAPSHOT_STAMP_INVALID');
    if(now-s.at.t>45000||s.at.t>now+5000)issues.push(`${label}:STALE_OR_FUTURE`);
    if(s.at.b>rpcHead||s.at.b>context.chain.gas.h)issues.push(`${label}:HEAD_NOT_COVERED`);
  };
  stamp(wallet,'wallet');stamp(positions,'positions');
  const accounts=new Map();
  for(const a of wallet.as){
    if(!uint(a.id)||!uint(a.in)||!uint(a.ft)||a.ft>255||accounts.has(a.id)||!context.instances?.some(i=>i.id===a.in)||![a.b,a.lb].every(v=>typeof v==='string'&&/^\d+$/.test(v))||typeof a.fr!=='boolean'||typeof a.fw!=='boolean')fail('ACCOUNT_IDENTITY_OR_BALANCE_INVALID');
    accounts.set(a.id,a);
  }
  const seen=new Set(),risks=[];
  for(const p of positions.d){
    const a=accounts.get(p.acc),market=context.markets?.find(m=>m.id===p.mkt),id=`${p.acc}:${p.pid}`;
    if(!a||!uint(p.pid)||seen.has(id)||p.st!==1)fail('POSITION_IDENTITY_INVALID');
    seen.add(id);
    if(!market){risks.push({positionId:p.pid,accountId:p.acc,marketId:p.mkt,status:'incomplete',reason:'UNKNOWN_MARKET',risk:null});continue;}
    if(market.instance_id!==a.in)fail('POSITION_INSTANCE_MISMATCH');
    if(!positionStampWithinSnapshot(p.at,positions.at))fail('POSITION_STAMP_INVALID');
    if(p.cfee!=null&&String(p.cfee)!=='0'||p.e?.length)fail('POSITION_EVENT_NOT_SNAPSHOT');
    if(!uint(market.state?.at?.b)||market.state.at.b>rpcHead||market.state.at.b>context.chain.gas.h)issues.push('market:HEAD_NOT_COVERED');
    let risk;try{risk=positionRisk(p,market,context,now,positions.at.t);}catch{fail('POSITION_VALUES_INVALID');}
    if(Object.values(risk).some(v=>typeof v==='number'&&!Number.isFinite(v)))fail('POSITION_VALUES_INVALID');
    risks.push({positionId:p.pid,accountId:p.acc,marketId:p.mkt,status:risk.status,risk});
  }
  return {classification:'private_account_observation',network:'testnet',chainId:10143,evaluatedAt:new Date(now).toISOString(),
    status:issues.length||risks.some(r=>r.status==='incomplete')?'incomplete':!accounts.size?'no_exchange_account':!risks.length?'empty_positions':'observed_positions',
    accountCount:accounts.size,positionCount:positions.d.length,issues:[...new Set(issues)],
    accounts:wallet.as.map(a=>({accountId:a.id,instanceId:a.in,feeTier:a.ft,frozen:a.fr,forwarding:a.fw,balanceRaw:a.b,lockedBalanceRaw:a.lb})),positions:risks,
    note:'私有API观察与模型估算；RPC仅核对链及链头，不证明账户状态或链上成交。金额Raw沿用协议整数单位，未跨币种求和。'};
}
