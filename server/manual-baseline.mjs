import {simulate} from './risk.mjs';
import {hash} from './integrity.mjs';
export function manualBaselinePreview({context,book,marketId,rawSize,leverage=2,direction='long',now=Date.now(),sources=[]}){
 if(context?.chain?.chain_id!==10143||!['long','short'].includes(direction)||!Number.isSafeInteger(marketId)||marketId<1||!Number.isSafeInteger(rawSize)||rawSize<1||!Number.isFinite(leverage)||leverage<1||leverage>5)throw new Error('INVALID_PARAMETERS');
 const market=context.markets.find(m=>m.id===marketId);if(!market)throw new Error('MARKET_MISSING');
 const side=direction==='long'?'ask':'bid',levels=book[side];
 if(!Array.isArray(levels)||!levels.length)throw new Error('BOOK_SIDE_MISSING');
 const price=direction==='long'?Math.min(...levels.map(l=>l.p)):Math.max(...levels.map(l=>l.p));
 const notional=price/10**market.config.price_decimals*(rawSize+0.1)/10**market.config.size_decimals;
 if(!Number.isFinite(notional)||notional<=0||notional>25)throw new Error('BASELINE_EXCEEDS_TEST_SCOPE');
 const input={direction,notional,leverage,hours:0,shockPct:direction==='long'?-5:5,slippageBps:100};
 const result=simulate({market,context,book,input,now});if(result.rawSize!==rawSize)throw new Error('SIZE_ROUNDING_MISMATCH');
 return {id:'preview_'+crypto.randomUUID(),network:'testnet',createdAt:result.createdAt,result,sources,originalInput:input,inputHash:hash(input),snapshotHashes:{context:hash(context),book:hash(book)},context,book};
}
