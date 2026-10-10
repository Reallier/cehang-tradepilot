import {hash} from './integrity.mjs';
import {simulate} from './risk.mjs';
export const BASELINE_SCHEMA='pretrade-baseline-v1';
export function verifyPreview(p){
 if(!p?.id?.startsWith('preview_')||hash(p.originalInput)!==p.inputHash||hash(p.context)!==p.snapshotHashes?.context||hash(p.book)!==p.snapshotHashes?.book)throw new Error('预演证据不完整或已改变');
 const r=p.result,m=p.context.markets.find(m=>m.id===r.marketId),at=Date.parse(r.createdAt);
 if(!m||!Number.isFinite(at)||!['testnet','mainnet'].includes(p.network)||r.chainId!==(p.network==='testnet'?10143:143)||hash(simulate({market:m,context:p.context,book:p.book,input:p.originalInput,feeTier:r.feeTier,now:at}))!==hash(r))throw new Error('预演模型无法复算');
 return p;
}
export function createBaseline(preview,now=Date.now()){
 verifyPreview(preview);const at=Date.parse(preview.result.createdAt);
 if(!preview.result.riskPass||!preview.result.depthComplete||now<at||now-at>45000)throw new Error('请重新运行预演，并在45秒内保存通过条件的基线');
 const evidence={preview,savedAt:new Date(now).toISOString(),validUntil:new Date(now+120000).toISOString(),purpose:'manually_associated_opening',identityBinding:'market_direction_size_leverage_only'};
 return {schema:BASELINE_SCHEMA,evidence,evidenceHash:hash(evidence)};
}
export function verifyBaseline(p){
 if(p?.schema!==BASELINE_SCHEMA||hash(p.evidence)!==p.evidenceHash)throw new Error('基线完整性校验失败');
 const generated=createBaseline(p.evidence.preview,Date.parse(p.evidence.savedAt));if(hash(generated)!==hash(p))throw new Error('基线时间或内容不一致');return p;
}
export function compareBaseline(baseline,observation,auditOrder){
 verifyBaseline(baseline);const b=baseline.evidence,p=b.preview,r=p.result;
 const unavailable=reason=>({status:'unavailable',reason,priceDeviationBps:null,feeDelta:null});
 if(auditOrder.status!=='opening_reconciled')return unavailable('成交尚未通过链上核对');
 const candidates=observation.evidence.histories['order-history'].pages.flatMap(p=>p.value.d).filter(o=>o.oid===auditOrder.orderId&&o.acc===auditOrder.accountId&&o.mkt===auditOrder.marketId);
 if(candidates.length!==1)return unavailable('订单关联不唯一');const o=candidates[0],stamp=o.at;
 if(r.chainId!==10143||o.mkt!==r.marketId||o.t!==(r.input.direction==='long'?1:2)||o.os!==r.rawSize||o.lv!==Math.round(r.input.leverage*100))return unavailable('网络、市场、方向、原始数量或杠杆不同');
 const saved=Date.parse(b.savedAt),expiry=Date.parse(b.validUntil),times=[Date.parse(r.createdAt),p.context.markets.find(m=>m.id===r.marketId).state.at.t,p.book.at.t];
 if(!Number.isFinite(stamp?.t)||stamp.t<saved||stamp.t>expiry||times.some(t=>!Number.isFinite(t)||t>=stamp.t)||p.context.chain.gas.h>=stamp.b||p.book.at.b>=stamp.b)return unavailable('基线未早于成交或已超过两分钟关联窗口，不能事后补造');
 const ex=auditOrder.execution,matchedEstimate=r.vwap*ex.size*r.feeBps/10000;
 return {status:'compared',classification:'user_associated_baseline',baselineHash:baseline.evidenceHash,orderId:o.oid,estimatedPrice:r.vwap,actualPrice:ex.price,priceDeviationBps:(ex.price/r.vwap-1)*10000,adversePriceCost:(o.t===1?1:-1)*(ex.price-r.vwap)*ex.size,estimatedFeeForFilledSize:matchedEstimate,actualFee:ex.fee,feeDelta:ex.fee-matchedEstimate,note:'按实际成交数量比较；基线采用保存时费率。文件哈希不证明保存时刻或账户归属。'};
}
