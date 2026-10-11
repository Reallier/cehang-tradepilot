// Read-only preparation for a manually operated testnet order. Never signs or posts an order.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Store} from '../server/store.mjs';
import {Perpl} from '../server/perpl.mjs';
import {manualBaselinePreview} from '../server/manual-baseline.mjs';
import {createBaseline} from '../server/pretrade-baseline.mjs';
try{
 const {values:v}=parseArgs({options:{config:{type:'string'},market:{type:'string'},'raw-size':{type:'string'},leverage:{type:'string',default:'2'},direction:{type:'string',default:'long'}}});
 const marketId=Number(v.market),rawSize=Number(v['raw-size']),leverage=Number(v.leverage);
 if(!['long','short'].includes(v.direction)||!v.config||!Number.isSafeInteger(marketId)||marketId<1||!Number.isSafeInteger(rawSize)||rawSize<1||!Number.isFinite(leverage)||leverage<1||leverage>5)throw new Error('INVALID_PARAMETERS');
 const filename=path.resolve(v.config),c=JSON.parse(fs.readFileSync(filename,'utf8')),relative=x=>{if(typeof x!=='string'||!x)throw new Error('CONFIG_PATH_MISSING');return path.resolve(path.dirname(filename),x);};
 const store=new Store(relative(c.stateDir)),eligibility=store.get('eligibility_testnet');
 if(!eligibility.approved||eligibility.blocked)throw new Error('TESTNET_NOT_APPROVED');
 const reader=new Perpl(store);reader.key=()=>null;
 const ctx=await reader.context('testnet'),m=ctx.value.markets.find(x=>x.id===marketId);if(!m)throw new Error('MARKET_MISSING');
 const book=await reader.call('testnet',`/v1/market-data/${marketId}/book`);
 const preview=manualBaselinePreview({context:ctx.value,book:book.value,marketId,rawSize,leverage,direction:v.direction,sources:[ctx.source,book.source]}),result=preview.result;
 const packet=createBaseline(preview),out=new Store(relative(c.outputDir));
 // Baseline packet is kept exact: store metadata is outside the hashed export shape.
 const basename=`pretrade-baseline-${crypto.randomUUID()}.json`,target=path.join(out.root??relative(c.outputDir),basename);
 fs.writeFileSync(target,JSON.stringify(packet,null,2),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({status:'saved',file:target,network:'Monad Testnet',chainId:10143,marketId,asset:result.asset,direction:v.direction,size:result.size,leverage,estimatedPrice:result.vwap,estimatedFee:result.entryFee,validUntil:packet.evidence.validUntil,doesNotSubmitOrders:true}));
}catch(e){console.error(JSON.stringify({status:'baseline_failed',message:e.message,retryAutomatically:false}));process.exitCode=1;}
