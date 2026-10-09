import {hash} from './store.mjs';
import {simulate,marketRow} from './risk.mjs';
import {NETWORKS} from './perpl.mjs';
import {decodeReceipt} from './events.mjs';
import {estimateEvidence} from './execution-audit.mjs';
const pendingStates=['submitting','unknown','forwarded','pending','partial'];
export class Orders {
  constructor(perpl,store){this.perpl=perpl;this.store=store;this.busy=false;}
  eligibility(){return this.store.exists('eligibility_testnet')?this.store.get('eligibility_testnet'):null;}
  enabled(){return process.env.TP_ENABLE_TESTNET_ORDERS==='true'&&!this.eligibility()?.blocked;}
  maxNotional(){const n=Number(process.env.TP_TESTNET_MAX_NOTIONAL??25);if(!Number.isFinite(n)||n<=0||n>100)throw new Error('测试单限额需在0到100之间');return n;}
  async prepare(previewId){const preview=this.store.get(previewId);if(preview.network!=='testnet'||preview.result.chainId!==10143)throw new Error('仅允许测试网预演生成测试单');
    if(!this.enabled())throw new Error('测试网下单开关未启用；模拟与只读功能可继续使用');
    if(Date.now()-Date.parse(preview.createdAt)>45000)throw new Error('预演已超过45秒，请重新预演');
    const ctx=await this.perpl.context('testnet'),market=ctx.value.markets.find(m=>m.id===preview.result.marketId);
    this.perpl.authCache.delete('testnet');
    const book=await this.perpl.cached('testnet',`/v1/market-data/${market.id}/book`,3000),account=await this.perpl.account('testnet');
    if(!account.configured)throw new Error('尚未配置测试网API key');
    const accounts=account.wallet.as?.filter(a=>!a.fr&&a.fw)??[];
    if(accounts.length!==1)throw new Error('需恰好一个未冻结且启用转发的测试账户');
    const acc=accounts[0];
    if(account.positions.d?.some(p=>p.acc===acc.id))throw new Error('测试账户已有仓位；先在Perpl测试界面平仓，避免仓位合并使预演失真');
    const remote=await this.perpl.call('testnet','/v1/trading/orders',{auth:true});
    if(remote.value.d?.some(o=>o.acc===acc.id))throw new Error('测试账户已有未完成订单');
    const existing=this.store.list('intent_').filter(i=>i.accountId===acc.id&&pendingStates.includes(i.status));
    if(existing.length)throw new Error('已有待核对订单，先核验其结果，禁止重新提交');
    const result=simulate({market,context:ctx.value,book:book.value,input:preview.result.input,feeTier:acc.ft});
    if(!result.riskPass)throw new Error(result.blockers.join('；'));
    if(result.input.notional>this.maxNotional()||result.notional>this.maxNotional())throw new Error('超过测试单名义限额');
    const row=marketRow(market,ctx.value),available=BigInt(acc.b)-BigInt(acc.lb??'0');
    const required=BigInt(Math.ceil((result.margin+result.entryFee)*10**row.collateralDecimals));
    if(available<required)throw new Error('测试账户可用抵押余额不足');
    const counter=this.store.exists(`counter_${acc.id}`)?this.store.get(`counter_${acc.id}`).rq:0;
    const rq=Math.max(counter,acc.lfr)+1;
    if(!Number.isSafeInteger(rq))throw new Error('请求ID超出安全整数范围');
    const spec={rq,mkt:market.id,acc:acc.id,t:result.input.direction==='long'?1:2,p:0,s:result.rawSize,
      ms:Math.max(1,Math.floor(result.input.slippageBps)),mnp:0,fl:4,lv:Math.round(result.input.leverage*100),lb:0};
    // IOC and quantity rounding preserve the exchange's scaled integer semantics.
    return {previewId,accountId:acc.id,spec,result,estimateEvidence:estimateEvidence(ctx.value,book.value,result),sources:[ctx.source,book.source,...account.sources],chainId:10143};
  }
  async prepareClose(intentId){
    if(!this.enabled())throw new Error('测试网下单开关未启用');
    const original=this.store.get(intentId);
    if(original.chainId!==10143||![1,2].includes(original.spec?.t)||!original.reconciliation?.chainVerified)throw new Error('仅可关闭本应用已核验的测试开仓');
    // Refresh private state immediately; never close a presumed/stale position.
    this.perpl.authCache.delete('testnet');
    const account=await this.perpl.account('testnet'),ctx=await this.perpl.context('testnet');
    const acc=account.wallet.as.find(a=>a.id===original.accountId);
    if(!acc||acc.fr||!acc.fw)throw new Error('原测试账户不可执行');
    const positions=account.positions.d.filter(p=>p.acc===acc.id&&p.mkt===original.spec.mkt);
    if(positions.length!==1)throw new Error('原测试仓位不存在或不唯一');
    const pos=positions[0];
    if(pos.sd!==(original.spec.t===1?1:2)||pos.s>original.spec.s||!Number.isSafeInteger(pos.s)||pos.s<1)throw new Error('仓位已变化，需人工检查');
    if(!Number.isFinite(account.positions.at.t)||Date.now()-account.positions.at.t>45000||account.positions.at.t>Date.now()+5000)throw new Error('账户快照时间无效或陈旧');
    if(this.store.list('intent_').some(i=>i.accountId===acc.id&&pendingStates.includes(i.status)))throw new Error('仍有未核验订单，禁止另发平仓请求');
    const remote=await this.perpl.call('testnet','/v1/trading/orders',{auth:true});
    if(remote.value.d.some(o=>o.acc===acc.id))throw new Error('存在未完成订单');
    const market=ctx.value.markets.find(m=>m.id===pos.mkt),row=marketRow(market,ctx.value);
    if(!market.config.is_open)throw new Error('测试市场已关闭');
    const book=await this.perpl.cached('testnet',`/v1/market-data/${market.id}/book`,3000);
    const side=pos.sd===1?'bid':'ask',levels=book.value[side];
    if(!levels?.length||!Number.isFinite(book.value.at.t)||Date.now()-book.value.at.t>45000||book.value.at.t>Date.now()+5000||levels.some(l=>!Number.isSafeInteger(l.p)||l.p<=0||!Number.isSafeInteger(l.s)||l.s<=0))throw new Error('平仓订单簿不完整或陈旧');
    const sorted=[...levels].sort((a,b)=>pos.sd===1?b.p-a.p:a.p-b.p);
    let remaining=pos.s,weighted=0;for(const level of sorted){const take=Math.min(remaining,level.s);weighted+=take*level.p;remaining-=take;if(!remaining)break;}
    if(remaining)throw new Error('公开平仓深度不足');
    const vwap=weighted/pos.s/10**row.priceDecimals,size=pos.s/10**row.sizeDecimals,notional=vwap*size;
    if(notional>100)throw new Error('超过本版本平仓硬上限100测试抵押单位，请在官方测试界面处理');
    const slip=(pos.sd===1?-1:1)*(vwap/(sorted[0].p/10**row.priceDecimals)-1)*10000;
    if(slip>25)throw new Error('平仓预估滑点超过25bps');
    const counter=this.store.exists(`counter_${acc.id}`)?this.store.get(`counter_${acc.id}`).rq:0,rq=Math.max(counter,acc.lfr)+1;
    if(!Number.isSafeInteger(rq))throw new Error('请求ID超出范围');
    const spec={rq,mkt:pos.mkt,acc:acc.id,t:pos.sd===1?3:4,p:0,s:pos.s,ms:25,mnp:0,fl:4,lv:0,lb:0};
    return {previewId:`close_${intentId}_${pos.s}`,parentIntentId:intentId,accountId:acc.id,spec,
      result:{asset:row.asset,collateral:row.collateral,vwap,notional,size,classification:'testnet_close_estimate',input:{direction:pos.sd===1?'close_long':'close_short'}},
      sources:[ctx.source,book.source,...account.sources],chainId:10143};
  }
  async close(intentId,confirmation){return this.submit(intentId,confirmation,true);}
  async submit(previewId,confirmation,closing=false){if(this.eligibility()?.blocked)throw new Error('Perpl测试界面提示当前环境不可用；账户演练暂停，需官方确认允许的使用环境');if(confirmation!=='CONFIRM TESTNET 10143')throw new Error('需明确确认测试网10143测试单');if(this.busy)throw new Error('另一个测试单正在处理');this.busy=true;
    try{const draft=closing?await this.prepareClose(previewId):await this.prepare(previewId);const consumed=this.store.list('intent_').some(i=>i.previewId===draft.previewId);if(consumed)throw new Error('此预演已有提交记录，不可重复提交');
      this.store.save(`counter_${draft.accountId}`,{rq:draft.spec.rq});
      const intent=this.store.create('intent',{...draft,status:'submitting',requestHash:hash({d:[draft.spec]})});
      this.store.event('submit_attempt',{intentId:intent.id,rq:draft.spec.rq,chainId:10143});
      try{const r=await this.perpl.call('testnet','/v1/trading/orders',{method:'POST',auth:true,body:{d:[draft.spec]}});
        const accepted=r.value.status?.code===0&&r.value.statuses?.length===1&&r.value.statuses[0].code===0;
        const rejected=Number.isFinite(r.value.status?.code)&&r.value.status.code!==0||r.value.statuses?.length===1&&Number.isFinite(r.value.statuses[0].code)&&r.value.statuses[0].code!==0;
        const status=accepted?'forwarded':rejected?'rejected':'unknown';return this.store.save(intent.id,{...intent,status,ack:r.value,ackSource:r.source,updatedAt:new Date().toISOString()});
      }catch(error){const status=error.notSent?'not_sent':'unknown';this.store.save(intent.id,{...intent,status,error:error.message,updatedAt:new Date().toISOString()});throw new Error(status==='not_sent'?`请求未发送或协议明确拒绝，记录 ${intent.id} 已保留：${error.message}`:`提交结果未知，记录 ${intent.id} 已保留；只可核验，不可重试`);}
    }finally{this.busy=false;}
  }
  async history(target){let page='',rows=[];for(let i=0;i<5;i++){const r=await this.perpl.call('testnet',`${target}?count=100${page?`&page=${encodeURIComponent(page)}`:''}`,{auth:true});rows.push(...r.value.d);if(!r.value.np)return {rows,complete:true};page=r.value.np;}return {rows,complete:false};}
  async reconcile(id){const intent=this.store.get(id);if(intent.chainId!==10143||!intent.spec)throw new Error('记录不是本应用的测试网订单');
    const history=await this.history('/v1/trading/order-history');const matches=history.rows.filter(o=>o.rq===intent.spec.rq&&o.acc===intent.spec.acc&&o.mkt===intent.spec.mkt);
    const order=matches.sort((a,b)=>(b.at.b??0)-(a.at.b??0)||(b.at.l??0)-(a.at.l??0))[0];
    if(!order)return this.store.save(id,{...intent,reconciliation:{status:'not_found',coverage:history.complete?'complete':'bounded_500',note:'未找到不能证明未成交；保持原提交状态并停止重试'},updatedAt:new Date().toISOString()});
    const txHash=order.at.txid;
    const statusMap={1:'pending',2:'pending',3:'partial',4:'filled',5:'cancelled',6:'expired',7:'failed',8:'pending',9:'pending',10:'executed'};
    const status=statusMap[order.st]??'unknown';let chainVerified=false,receipt=null,transaction=null,events=null;
    const ctx=await this.perpl.context('testnet'),instance=ctx.value.instances.find(i=>i.id===ctx.value.markets.find(m=>m.id===order.mkt)?.instance_id);
    if(/^0x[0-9a-fA-F]{64}$/.test(txHash??'')){
      receipt=await this.perpl.verifiedRpc('testnet','eth_getTransactionReceipt',[txHash]);
      transaction=await this.perpl.rpc('testnet','eth_getTransactionByHash',[txHash]);
      // A successful unrelated transaction cannot satisfy reconciliation.
      chainVerified=Boolean(receipt&&receipt.status==='0x1'&&receipt.transactionHash.toLowerCase()===txHash.toLowerCase()
        &&Number(BigInt(receipt.blockNumber))===order.at.b
        &&transaction&&transaction.hash.toLowerCase()===txHash.toLowerCase()
        &&receipt.logs?.some(l=>l.address.toLowerCase()===instance.address.toLowerCase()&&l.logIndex!=null&&Number(BigInt(l.logIndex))===order.at.l));
      if(chainVerified){const market=ctx.value.markets.find(m=>m.id===order.mkt);events=decodeReceipt(receipt,{exchange:instance.address,perpetualId:market.perpetual_id,accountId:intent.spec.acc,requestId:intent.spec.rq,orderType:intent.spec.t,rawSize:intent.spec.s,apiOrder:order});chainVerified=events.verified;}
    }
    const pd=ctx.value.markets.find(m=>m.id===order.mkt).config.price_decimals;
    const actual=order.fp?order.fp/10**pd:null;
    const rec={status:chainVerified?'chain_confirmed':'api_observed',chainVerified,order,txHash:txHash??null,
      explorer:txHash?`${NETWORKS.testnet.explorer}/tx/${txHash}`:null,receipt,transaction,events,
      coverage:history.complete?'complete':'bounded_500',actualVwap:actual,previewVwap:intent.result.vwap,
      deviationBps:actual?((actual/intent.result.vwap)-1)*10000:null,
      chainVwap:events?.fillPriceScaled!=null?events.fillPriceScaled/10**pd:null,
      note:'链核对包含链ID、成功回执、区块、交易所地址、日志位置和解码后的OrderRequest账户/市场/rq/数量。成交数量及费用另与TakerOrderFilled事件核对。未知ABI或不一致均不通过。'};
    // Do not release a successful/unknown submission lock until chain evidence is available.
    const terminal=['filled','executed','cancelled','expired','failed'].includes(status);
    return this.store.save(id,{...intent,status:terminal&&!chainVerified?'unknown':status,reconciliation:rec,updatedAt:new Date().toISOString()});
  }
}
