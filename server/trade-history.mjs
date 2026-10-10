import {Perpl} from './perpl.mjs';
import {AccountReader,collectAccount} from './account-readonly.mjs';
import {hash} from './store.mjs';
import {normalizeTxHash} from './events.mjs';
export {normalizeTxHash} from './events.mjs';

export const HISTORY_KINDS=['order-history','fills','position-history','account-history'];
const denied=()=>{throw new Error('HISTORY_READ_TARGET_DENIED');};
export class HistoryReader extends AccountReader {
  async call(network,target,options={}) {
    const u=new URL(target,'https://readonly.invalid');
    if(HISTORY_KINDS.some(k=>u.pathname===`/v1/trading/${k}`)){
      if(network!=='testnet'||target!==u.pathname+u.search||(options.method??'GET')!=='GET'||options.body!==undefined||options.auth!==true)denied();
      if(u.searchParams.get('count')!=='100'||[...u.searchParams.keys()].some(k=>!['count','page'].includes(k))||u.searchParams.getAll('count').length!==1||u.searchParams.getAll('page').length>1||(u.searchParams.get('page')?.length??0)>1024)denied();
      return Perpl.prototype.call.call(this,network,target,options);
    }
    return super.call(network,target,options);
  }
  async rpc(network,method,params) {
    if(['eth_getTransactionReceipt','eth_getTransactionByHash'].includes(method)){
      if(network!=='testnet'||!Array.isArray(params)||params.length!==1||!/^0x[0-9a-fA-F]{64}$/.test(params[0]))denied();
      return Perpl.prototype.rpc.call(this,network,method,params);
    }
    return super.rpc(network,method,params);
  }
}

// Hard bounded: five account reads, eight history pages, eight transaction reads,
// and one final head. No orders, retry loop or background polling.
export async function collectHistory(reader,options) {
  const account=await collectAccount(reader,options);
  if(account.status==='not_ready')return account;
  const histories={};
  for(const kind of HISTORY_KINDS){
    const pages=[],seen=new Set();let cursor=null,complete=false;
    for(let n=0;n<2;n++){
      const q=new URLSearchParams({count:'100'});if(cursor)q.set('page',cursor);
      const response=await reader.call('testnet',`/v1/trading/${kind}?${q}`,{auth:true});
      if(!Array.isArray(response.value?.d)||response.value.d.length>100||response.value.np!=null&&typeof response.value.np!=='string')throw new Error('HISTORY_SCHEMA_INVALID');
      pages.push(response);cursor=response.value.np;
      if(!cursor){complete=true;break;}
      if(seen.has(cursor))throw new Error('HISTORY_CURSOR_REPEATED');seen.add(cursor);
    }
    histories[kind]={pages,complete};
  }
  const accounts=new Set(account.snapshot.wallet.as.map(a=>a.id));
  const orders=histories['order-history'].pages.flatMap(p=>p.value.d);
  const filled=orders.filter(o=>accounts.has(o.acc)&&[1,2,3,4].includes(o.t)&&o.fs>0);
  const hashes=[...new Set(filled.map(o=>normalizeTxHash(o.at?.txid)).filter(Boolean))];
  const chain=[];
  for(const txHash of hashes.slice(0,4)){
    const receipt=await reader.rpc('testnet','eth_getTransactionReceipt',[txHash]);
    const transaction=await reader.rpc('testnet','eth_getTransactionByHash',[txHash]);
    chain.push({txHash,receipt,transaction});
  }
  const head=Number(BigInt(await reader.rpc('testnet','eth_blockNumber',[])));
  const evidence={account,histories,chain,head,collectedAt:new Date(reader.now()).toISOString(),receiptCoverageComplete:hashes.length<=4&&filled.every(o=>normalizeTxHash(o.at?.txid))};
  return {schema:'trade-history-observation-v1',classification:'private_testnet_history',evidence,evidenceHash:hash(evidence)};
}
