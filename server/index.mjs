import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {Perpl,NETWORKS} from './perpl.mjs';
import {Store,hash} from './store.mjs';
import {simulate,marketRow,bookRows,positionRisk} from './risk.mjs';
import {Orders} from './orders.mjs';
import {acquireLock} from './lock.mjs';
import {comparePlans} from './comparison.mjs';
import {saveStudy,readStudies} from './usability.mjs';
import {auditPacket} from './execution-audit.mjs';
import {EXECUTION_EXAMPLES,executionExample} from './execution-examples.mjs';
import {exitPacket,observedExit} from './position-exit.mjs';
import {POSITION_EXAMPLES,positionExample} from './position-examples.mjs';
import {listPresets,readPreset,savePreset,setPresetArchived} from './presets.mjs';
import {RiskWatch,WATCH_STAGES} from './risk-watch.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const store=new Store(path.resolve(process.env.TP_DATA_DIR??path.join(root,'data','private'))),perpl=new Perpl(store),orders=new Orders(perpl,store);
const riskWatch=new RiskWatch(store,perpl);
const port=Number(process.env.TP_PORT??8780),token=randomBytes(32).toString('hex');
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('TP_PORT invalid');
const address=/^0x[0-9a-fA-F]{40}$/,net=value=>{if(!NETWORKS[value])throw new Error('请选择mainnet或testnet');return value;};
function response(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>16384)throw new Error('请求过大');}return JSON.parse(text||'{}');}
function mutationsAllowed(req){const value=String(req.headers['x-tradepilot-token']??'');if(value.length!==token.length||!timingSafeEqual(Buffer.from(value),Buffer.from(token)))throw new Error('操作令牌无效');if(req.headers.origin!==`http://127.0.0.1:${port}`&&req.headers.origin!==`http://localhost:${port}`)throw new Error('需从本服务页面发起操作');}
async function live(network,marketId){if(marketId!=null&&(!Number.isSafeInteger(marketId)||marketId<0))throw new Error('市场ID无效');const ctx=await perpl.context(network),markets=ctx.value.markets.map(m=>marketRow(m,ctx.value));const market=marketId==null?ctx.value.markets[0]:ctx.value.markets.find(m=>m.id===marketId);if(!market)throw new Error('所选或保存的市场已不存在，请重新选择');
  const end=Math.floor(Date.now()/3600000)*3600000,start=end-48*3600000;
  const [book,candles]=await Promise.all([perpl.cached(network,`/v1/market-data/${market.id}/book`,5000),perpl.cached(network,`/v1/market-data/${market.id}/candles/3600/${start}-${end}`,120000)]);
  const pd=10**market.config.price_decimals,inst=ctx.value.instances.find(i=>i.id===market.instance_id),tok=ctx.value.tokens.find(t=>t.id===inst.collateral_token_id);
  const rows=(candles.value.d??[]).filter(c=>c.t<end).map(c=>({time:new Date(c.t).toISOString(),open:c.o/pd,high:c.h/pd,low:c.l/pd,close:c.c/pd,volume:Number(c.v)/10**tok.decimals,tradeCount:c.n,asset:marketRow(market,ctx.value).asset}));
  if(rows.some(r=>![r.open,r.high,r.low,r.close,r.volume].every(Number.isFinite)||r.low>Math.min(r.open,r.close)||r.high<Math.max(r.open,r.close)))throw new Error('K线数据校验失败');
  return {network,chainId:ctx.value.chain.chain_id,markets,selectedId:market.id,book:bookRows(book.value,market),candles:rows,
    sources:[ctx.source,book.source,candles.source],fetchedAt:new Date().toISOString(),mode:'read-only',actualTrading:false};
}
async function wallet(network,addr){if(!address.test(addr))throw new Error('钱包地址无效');const ctx=await perpl.context(network),inst=ctx.value.instances[0],collateral=ctx.value.tokens.find(t=>t.id===inst.collateral_token_id);
  const native=await perpl.verifiedRpc(network,'eth_getBalance',[addr,'latest']);const raw=await perpl.rpc(network,'eth_call',[{to:collateral.address,data:`0x70a08231${addr.slice(2).padStart(64,'0')}`},'latest']);
  return {address:addr,network,chainId:NETWORKS[network].chainId,nativeBalance:(Number(BigInt(native))/1e18).toString(),collateralBalance:(Number(BigInt(raw))/10**collateral.decimals).toString(),collateral:collateral.symbol,
    rawNative:native,rawCollateral:raw,observedAt:new Date().toISOString(),note:'链上钱包余额；不等同Perpl账户余额或可用保证金'};
}
export const server=http.createServer(async(req,res)=>{
  try {
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))return response(res,403,{error:'仅允许本地或SSH隧道访问'});
    if(req.headers['sec-fetch-site']==='cross-site')return response(res,403,{error:'跨站请求禁止'});
    const url=new URL(req.url,`http://127.0.0.1:${port}`),p=url.pathname;
    if(req.method==='POST')mutationsAllowed(req);
    if(p==='/api/session'&&req.method==='GET')return response(res,200,{token,testnetOrdersEnabled:orders.enabled(),testnetEligibility:orders.eligibility(),testnetMaxNotional:orders.maxNotional(),mainnetOrdersEnabled:false});
    if(p==='/api/live'&&req.method==='GET')return response(res,200,await live(net(url.searchParams.get('network')??'mainnet'),url.searchParams.has('market')?Number(url.searchParams.get('market')):null));
    if(p==='/api/account'&&req.method==='GET'){const network=net(url.searchParams.get('network')??'mainnet'),a=await perpl.account(network);if(a.configured){const ctx=await perpl.context(network);a.risks=a.positions.d.map(pos=>{const m=ctx.value.markets.find(m=>m.id===pos.mkt);return m?positionRisk(pos,m,ctx.value,Date.now(),a.positions.at.t):{positionId:pos.pid,status:'unknown_market'};});}return response(res,200,a);}
    if(p==='/api/wallet'&&req.method==='POST'){const d=await body(req);return response(res,200,await wallet(net(d.network),d.address));}
    if(p==='/api/preview'&&req.method==='POST'){const d=await body(req),network=net(d.network),ctx=await perpl.context(network),market=ctx.value.markets.find(m=>m.id===Number(d.marketId));if(!market)throw new Error('市场不存在');const book=await perpl.cached(network,`/v1/market-data/${market.id}/book`,3000);
      const result=simulate({market,context:ctx.value,book:book.value,input:d.input});const record=store.create('preview',{network,result,sources:[ctx.source,book.source],originalInput:d.input,inputHash:hash(d.input),snapshotHashes:{context:hash(ctx.value),book:hash(book.value)},context:ctx.value,book:book.value});return response(res,200,{...record,context:undefined,book:undefined});}
    if(p==='/api/compare'&&req.method==='POST'){const d=await body(req),network=net(d.network);if(!Array.isArray(d.inputs)||d.inputs.length!==2)throw new Error('需提供恰好两个交易方案');const ctx=await perpl.context(network),market=ctx.value.markets.find(m=>m.id===Number(d.marketId));if(!market)throw new Error('市场不存在');const book=await perpl.cached(network,`/v1/market-data/${market.id}/book`,3000);
      const record=store.create('comparison',{network,sources:[ctx.source,book.source],...comparePlans({market,context:ctx.value,book:book.value,inputs:d.inputs})});return response(res,200,{...record,context:undefined,book:undefined});}
    if(p==='/api/records'&&req.method==='GET')return response(res,200,{records:[...store.list('preview_').map(r=>({id:r.id,createdAt:r.createdAt,type:'simulation',asset:r.result.asset,network:r.network,notional:r.result.notional,status:r.result.riskPass?'passed':'blocked',netPnl:r.result.netPnl})),...store.list('comparison_').map(r=>({id:r.id,createdAt:r.createdAt,type:'comparison',asset:r.asset,network:r.network,notional:null,status:r.results.every(p=>p.riskPass)?'passed':'blocked'})),...store.list('intent_').map(r=>({id:r.id,createdAt:r.createdAt,type:'testnet_order',asset:r.result.asset,network:'testnet',notional:r.result.notional,status:r.status,reconciliation:r.reconciliation??null}))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});
    if(p==='/api/evidence'&&req.method==='GET'){const id=url.searchParams.get('id');if(!/^(preview|intent|comparison)_[a-f0-9-]{36}$/.test(id??''))throw new Error('证据ID无效');return response(res,200,store.get(id));}
    if(p==='/api/testnet/submit'&&req.method==='POST'){const d=await body(req);return response(res,200,await orders.submit(d.previewId,d.confirmation));}
    if(p==='/api/testnet/reconcile'&&req.method==='POST'){const d=await body(req);return response(res,200,await orders.reconcile(d.id));}
    if(p==='/api/testnet/close'&&req.method==='POST'){const d=await body(req);return response(res,200,await orders.close(d.id,d.confirmation));}
    if(p==='/api/execution-audit'&&req.method==='GET'){
      const example=url.searchParams.get('example'),id=url.searchParams.get('id');
      if(example&&id)throw new Error('请只选择一种证据来源');
      if(example)return response(res,200,auditPacket(executionExample(example),{synthetic:true}));
      if(id){if(!/^intent_[a-f0-9-]{36}$/.test(id))throw new Error('订单记录ID无效');return response(res,200,auditPacket(store.get(id)));}
      return response(res,200,{examples:EXECUTION_EXAMPLES,records:store.list('intent_').filter(r=>r.synthetic!==true).map(r=>({id:r.id,asset:r.result?.asset??'未知',createdAt:r.createdAt,status:r.status}))});
    }
    if(p==='/api/position-exit'&&req.method==='GET'){
      if(url.searchParams.get('positions')!=='1')return response(res,200,{examples:POSITION_EXAMPLES});
      const a=await perpl.account(net(url.searchParams.get('network')));
      return response(res,200,{configured:a.configured,positions:(a.positions?.d??[]).filter(p=>p.st===1).map(p=>({positionId:p.pid,accountId:p.acc,marketId:p.mkt,direction:p.sd===1?'long':'short'}))});
    }
    if(p==='/api/position-exit'&&req.method==='POST'){
      const d=await body(req);
      if(d.source==='example')return response(res,200,exitPacket(positionExample(d.example,d.closePct),{classification:'synthetic_position_exit'}));
      if(d.source==='account')return response(res,200,await observedExit(perpl,net(d.network),d));
      throw new Error('请选择实际仓位或明确标记的合成案例');
    }
    if(p==='/api/presets'&&req.method==='GET'){const id=url.searchParams.get('id');return response(res,200,id?readPreset(store,id):{presets:listPresets(store)});}
    if(p==='/api/presets'&&req.method==='POST'){const d=await body(req);if(d.action==='save')return response(res,200,savePreset(store,d));if(d.action==='archive')return response(res,200,setPresetArchived(store,d.id,d.archived));throw new Error('常用假设操作无效');}
    if(p==='/api/risk-watch'&&req.method==='GET'){
      const id=url.searchParams.get('id');if(id)return response(res,200,riskWatch.packet(id));
      const source=url.searchParams.get('source')??'account',network=net(url.searchParams.get('network')??'mainnet');
      return response(res,200,{watches:riskWatch.list(network,source),stages:WATCH_STAGES});
    }
    if(p==='/api/risk-watch'&&req.method==='POST'){
      const d=await body(req);
      if(d.action==='add'){if(d.source==='synthetic')return response(res,200,riskWatch.add({network:'testnet',source:'synthetic',positionId:1,accountId:1,marketId:1,warningBufferPct:d.warningBufferPct}));if(d.source==='account')return response(res,200,await riskWatch.addObserved(d));}
      if(d.action==='update')return response(res,200,riskWatch.update(d.id,d));
      if(d.action==='acknowledge')return response(res,200,riskWatch.acknowledge(d.id,d.eventId));
      if(d.action==='refresh')return response(res,200,await riskWatch.refresh(net(d.network),d.source,d.stage));
      throw new Error('风险关注操作无效');
    }
    if(p==='/api/usability'&&req.method==='GET')return response(res,200,readStudies(store));
    if(p==='/api/usability'&&req.method==='POST')return response(res,200,saveStudy(store,await body(req)));
    if(p==='/api/feedback'&&req.method==='POST'){const d=await body(req);if(typeof d.role!=='string'||typeof d.problem!=='string'||d.role.length>160||d.problem.length>2000||!d.problem.trim())throw new Error('请填写真实使用反馈');return response(res,200,store.create('feedback',{role:d.role,problem:d.problem,source:'user_entered',verifiedInterview:false}));}
    if(p==='/api/health'&&req.method==='GET')return response(res,200,{status:'ok',project:'TradePilot competition',mainnetTrading:false,testnetTrading:orders.enabled(),version:'0.1.0'});
    if(p.startsWith('/api/'))return response(res,404,{error:'接口不存在'});
    if(req.method!=='GET'&&req.method!=='HEAD')return response(res,405,{error:'方法不允许'});
    const dist=path.join(root,'dashboard','dist');const filename=path.resolve(dist,decodeURIComponent(p==='/'?'/index.html':p).slice(1));if(!filename.startsWith(dist+path.sep))return response(res,403,{error:'路径无效'});
    if(!fs.existsSync(filename)||!fs.statSync(filename).isFile())return response(res,404,{error:'文件不存在，请先构建前端'});
    const ext=path.extname(filename),mime={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[ext]??'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'});fs.createReadStream(filename).pipe(res);
  }catch(error){response(res,400,{error:error.message});}
});
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const release=acquireLock(store.root);process.on('exit',release);
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(()=>process.exit(0)));
  server.listen(port,'127.0.0.1',()=>console.log(`TradePilot: http://127.0.0.1:${port} | mainnet trading disabled | testnet ${orders.enabled()?'enabled':'disabled'}`));
}
