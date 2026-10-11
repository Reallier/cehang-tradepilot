import {setTimeout as sleep} from 'node:timers/promises';
import {Perpl,NETWORKS} from './perpl.mjs';
import {hash} from './store.mjs';
import {analyzeAccount} from './account-analysis.mjs';
export {analyzeAccount} from './account-analysis.mjs';

export const ACCOUNT_SCHEMA='account-observation-v1';
const address=v=>typeof v==='string'&&/^0x[0-9a-fA-F]{40}$/.test(v);
const uint=v=>Number.isSafeInteger(v)&&v>=0;
const fail=(code)=>{const e=new Error(code);e.code=code;throw e;};

// Separate from the public HTTP server: only these testnet reads are possible.
export class AccountReader extends Perpl {
  async call(network,target,options={}) {
    const allowed=new Map([['/v1/pub/context',false],['/v1/trading/wallet',true],['/v1/trading/positions',true]]);
    if(network!=='testnet'||!allowed.has(target)||(options.method??'GET')!=='GET'||options.body!==undefined||Boolean(options.auth)!==allowed.get(target))fail('READ_ONLY_TARGET_DENIED');
    return super.call(network,target,options);
  }
  async rpc(network,method,params) {
    if(network!=='testnet'||!['eth_chainId','eth_blockNumber'].includes(method)||!Array.isArray(params)||params.length)fail('READ_ONLY_RPC_DENIED');
    return super.rpc(network,method,params);
  }
}

export function accountReadiness({eligibility,expectedWallet,keyConfigured}) {
  const blockers=[];
  if(eligibility?.blocked===true)blockers.push('ELIGIBILITY_BLOCKED');
  else if(eligibility?.approved!==true||typeof eligibility.reference!=='string'||!eligibility.reference.trim()||!Number.isFinite(Date.parse(eligibility.checkedAt)))blockers.push('ELIGIBILITY_UNCONFIRMED');
  if(!address(expectedWallet))blockers.push('EXPECTED_WALLET_MISSING');
  if(!keyConfigured)blockers.push('CREDENTIALS_MISSING');
  return {ready:!blockers.length,network:'testnet',readOnly:true,blockers};
}


// A single context catch-up is opt-in for the bounded monitor only. Reserve the
// full REST (12s) and final RPC (10s) timeouts inside the 45s validity window.
function contextLag(wallet,positions,context,now,reserveMs){
  const stamps=[wallet?.at,positions?.at];
  if(context?.chain?.chain_id!==10143||!uint(context?.chain?.gas?.h)||
    stamps.some(s=>!uint(s?.b)||!Number.isFinite(s?.t)||s.t>now+5000||now-s.t>45000-reserveMs)||
    wallet.sn!==wallet.at.b||positions.sn!==positions.at.b)return false;
  return Math.max(wallet.at.b,positions.at.b)>context.chain.gas.h;
}

export async function collectAccount(reader,{eligibility,expectedWallet,contextCatchUp=false},{wait=sleep}={}) {
  const readiness=accountReadiness({eligibility,expectedWallet,keyConfigured:Boolean(reader.key('testnet'))});
  if(!readiness.ready)return {status:'not_ready',...readiness};
  // All reads are bounded and sequential: stop immediately on protocol rejection.
  const rpcChainId=Number(BigInt(await reader.rpc('testnet','eth_chainId',[])));
  if(rpcChainId!==NETWORKS.testnet.chainId)fail('NETWORK_OR_HEAD_INVALID');
  const wallet=await reader.call('testnet','/v1/trading/wallet',{auth:true});
  if(!address(wallet.value?.addr)||wallet.value.addr.toLowerCase()!==expectedWallet.toLowerCase())fail('WALLET_IDENTITY_MISMATCH');
  const positions=await reader.call('testnet','/v1/trading/positions',{auth:true});
  let context=await reader.context('testnet');
  if(contextCatchUp&&contextLag(wallet.value,positions.value,context.value,reader.now(),32000)){
    await wait(10000);
    if(contextLag(wallet.value,positions.value,context.value,reader.now(),22000)){
      // Bypass the 15-second process cache once, keeping the normal request guard.
      // Do not retry a rejected request, re-read the account, or edit any stamp.
      context=await reader.call('testnet','/v1/pub/context');
    }
  }
  const rpcHead=Number(BigInt(await reader.rpc('testnet','eth_blockNumber',[])));
  const snapshot={expectedWallet,wallet:wallet.value,positions:positions.value,context:context.value,rpcChainId,rpcHead,now:reader.now(),sources:[wallet.source,positions.source,context.source]};
  const report=analyzeAccount(snapshot);
  return {schema:ACCOUNT_SCHEMA,classification:'private_account_observation',snapshot,snapshotHash:hash(snapshot),report,reportHash:hash(report)};
}

export {replayAccount} from './account-verification.mjs';
