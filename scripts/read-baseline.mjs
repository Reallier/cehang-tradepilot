// Read-only preparation for a manually operated testnet order. Never signs or posts an order.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Store,hash} from '../server/store.mjs';
import {Perpl} from '../server/perpl.mjs';
import {simulate} from '../server/risk.mjs';
import {createBaseline} from '../server/pretrade-baseline.mjs';
try{
 const {values:v}=parseArgs({options:{config:{type:'string'},market:{type:'string'},'raw-size':{type:'string'},leverage:{type:'string',default:'2'}}});
 const marketId=Number(v.market),rawSize=Number(v['raw-size']),leverage=Number(v.leverage);
 if(!v.config||!Number.isSafeInteger(marketId)||marketId<1||!Number.isSafeInteger(rawSize)||rawSize<1||!Number.isFinite(leverage)||leverage<1||leverage>5)throw new Error('INVALID_PARAMETERS');
 const filename=path.resolve(v.config),c=JSON.parse(fs.readFileSync(filename,'utf8')),relative=x=>{if(typeof x!=='string'||!x)throw new Error('CONFIG_PATH_MISSING');return path.resolve(path.dirname(filename),x);};
 const store=new Store(relative(c.stateDir)),eligibility=store.get('eligibility_testnet');
 if(!eligibility.approved||eligibility.blocked)throw new Error('TESTNET_NOT_APPROVED');
 const reader=new Perpl(store);reader.key=()=>null;
 const ctx=await reader.context('testnet'),m=ctx.value.markets.find(x=>x.id===marketId);if(!m)throw new Error('MARKET_MISSING');
 const book=await reader.call('testnet',`/v1/market-data/${marketId}/book`),ask=book.value.ask?.[0]?.p;
 const notional=ask/10**m.config.price_decimals*(rawSize+0.1)/10**m.config.size_decimals;
 if(!Number.isFinite(notional)||notional<=0||notional>25)throw new Error('BASELINE_EXCEEDS_TEST_SCOPE');
 const input={direction:'long',notional,leverage,hours:0,shockPct:-5,slippageBps:100},result=simulate({market:m,context:ctx.value,book:book.value,input});
 if(result.rawSize!==rawSize)throw new Error('SIZE_ROUNDING_MISMATCH');
 const preview={id:'preview_'+crypto.randomUUID(),network:'testnet',createdAt:result.createdAt,result,sources:[ctx.source,book.source],originalInput:input,inputHash:hash(input),snapshotHashes:{context:hash(ctx.value),book:hash(book.value)},context:ctx.value,book:book.value};
 const packet=createBaseline(preview),out=new Store(relative(c.outputDir));
 // Baseline packet is kept exact: store metadata is outside the hashed export shape.
 const basename=`pretrade-baseline-${crypto.randomUUID()}.json`,target=path.join(out.root??relative(c.outputDir),basename);
 fs.writeFileSync(target,JSON.stringify(packet,null,2),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({status:'saved',file:target,network:'Monad Testnet',chainId:10143,marketId,asset:result.asset,direction:'long',size:result.size,leverage,estimatedPrice:result.vwap,estimatedFee:result.entryFee,validUntil:packet.evidence.validUntil,doesNotSubmitOrders:true}));
}catch(e){console.error(JSON.stringify({status:'baseline_failed',message:e.message,retryAutomatically:false}));process.exitCode=1;}
