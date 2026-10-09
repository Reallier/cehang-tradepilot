import {createPrivateKey,randomBytes,sign} from 'node:crypto';
import {hash} from './store.mjs';
export const NETWORKS=Object.freeze({mainnet:{chainId:143,api:'https://app.perpl.xyz/api',rpc:'https://rpc.monad.xyz',explorer:'https://monadscan.com'},testnet:{chainId:10143,api:'https://testnet.perpl.xyz/api',rpc:'https://testnet-rpc.monad.xyz',explorer:'https://testnet.monadscan.com'}});
export class Perpl {
  constructor(store,{request=fetch,now=()=>Date.now()}={}){this.store=store;this.request=request;this.now=now;this.cache=new Map();this.pending=new Map();this.calls=[];this.cooldowns=new Map();this.authCache=new Map();}
  key(network){const prefix=`PERPL_${network.toUpperCase()}`;const token=process.env[`${prefix}_API_KEY`],secret=process.env[`${prefix}_API_KEY_SECRET`];if(!token||!secret)return null;if(!/^(0x)?[0-9a-fA-F]{64}$/.test(secret))throw new Error('服务端API配置格式不正确');return {token,secret};}
  guard(network){if(!NETWORKS[network])throw new Error('网络无效');const state=this.store.exists(`restriction_${network}`)?this.store.get(`restriction_${network}`):null;if(state?.blocked)throw new Error(`${network} 公开接口被限制；需人工核对后解除`);const until=this.cooldowns.get(network)??0;if(until>this.now())throw new Error(`接口冷却中，${Math.ceil((until-this.now())/1000)}秒后再试`);this.calls=this.calls.filter(t=>t>this.now()-60000);if(this.calls.length>=40)throw new Error('本地全局请求预算40次/分钟已用完');this.calls.push(this.now());}
  checkStatus(network,response,{auth=false,rpc=false}={}){
    if(response.status===429){const retry=response.headers.get('retry-after');let ms=60000;if(retry){const n=Number(retry);ms=Number.isFinite(n)?n*1000:Date.parse(retry)-this.now();}this.cooldowns.set(network,this.now()+Math.max(1000,Number.isFinite(ms)?ms:60000));throw new Error('协议返回429，已暂停请求并遵守Retry-After');}
    if([403,451].includes(response.status)&&!auth)this.store.save(`restriction_${network}`,{blocked:true,status:response.status,source:rpc?'rpc':'rest',createdAt:new Date(this.now()).toISOString()});
    if(!response.ok){const error=new Error(`${rpc?'Monad RPC':'Perpl 接口'}返回 ${response.status}；已停止此次操作`);error.notSent=[400,401,403].includes(response.status);throw error;}
  }
  async call(network,target,{method='GET',body,auth=false}={}) {
    if(!/^\/v1\//.test(target)||target.includes('..')||target.includes('#'))throw new Error('API路径无效');
    if(method!=='GET'&&(network!=='testnet'||target!=='/v1/trading/orders'))throw new Error('主网或非订单写操作禁止');
    try{this.guard(network);}catch(error){error.notSent=true;throw error;}
    const payload=body?JSON.stringify(body):'', headers={'Accept':'application/json'};
    if(payload)headers['Content-Type']='application/json';
    if(auth){const key=this.key(network);if(!key)throw new Error('尚未配置此网络的独立Perpl API key');const timestamp=String(this.now()),nonce=randomBytes(16).toString('base64url');const canonical=[NETWORKS[network].chainId,method,target,timestamp,nonce,hash(payload)].join('\n');const privateKey=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.from(key.secret.replace(/^0x/,''),'hex')]),format:'der',type:'pkcs8'});Object.assign(headers,{'X-API-Key':key.token,'X-API-Timestamp':timestamp,'X-API-Nonce':nonce,'X-API-Signature':sign(null,Buffer.from(canonical),privateKey).toString('base64url')});}
    const response=await this.request(NETWORKS[network].api+target,{method,headers,body:payload||undefined,signal:AbortSignal.timeout(12000),redirect:'error'});
    this.checkStatus(network,response,{auth});
    const raw=await response.text();if(raw.length>4e6)throw new Error('接口响应过大');const value=JSON.parse(raw);
    return {value,source:{url:NETWORKS[network].api+target,network,chainId:NETWORKS[network].chainId,fetchedAt:new Date(this.now()).toISOString(),sha256:hash(raw)}};
  }
  async cached(network,target,ttl=15000){const k=network+target,old=this.cache.get(k);if(old&&this.now()-old.time<ttl)return old.result;if(this.pending.has(k))return this.pending.get(k);const promise=this.call(network,target).then(result=>{this.cache.set(k,{time:this.now(),result});return result;}).finally(()=>this.pending.delete(k));this.pending.set(k,promise);return promise;}
  async context(network){const r=await this.cached(network,'/v1/pub/context');if(r.value.chain.chain_id!==NETWORKS[network].chainId)throw new Error('协议链ID不符合预期');return r;}
  async account(network){const key=this.key(network);if(!key)return {configured:false,wallet:null,positions:null};const old=this.authCache.get(network);if(old&&this.now()-old.time<10000)return old.value;
    const wallet=await this.call(network,'/v1/trading/wallet',{auth:true}),positions=await this.call(network,'/v1/trading/positions',{auth:true});const value={configured:true,wallet:wallet.value,positions:positions.value,sources:[wallet.source,positions.source]};this.authCache.set(network,{time:this.now(),value});return value;}
  async rpc(network,method,params){if(!['eth_chainId','eth_getBalance','eth_call','eth_getTransactionReceipt','eth_getTransactionByHash','eth_blockNumber'].includes(method))throw new Error('RPC写操作禁止');this.guard(network);const r=await this.request(NETWORKS[network].rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(10000),redirect:'error'});this.checkStatus(network,r,{rpc:true});const d=await r.json();if(d.error)throw new Error('Monad RPC 无法完成此只读请求');return d.result;}
  async verifiedRpc(network,method,params){const id=await this.rpc(network,'eth_chainId',[]);if(Number(BigInt(id))!==NETWORKS[network].chainId)throw new Error('RPC链ID不符合预期');return this.rpc(network,method,params);}
}
