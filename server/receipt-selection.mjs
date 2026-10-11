import {hash} from './integrity.mjs';
import {normalizeTxHash} from './events.mjs';
export const RECEIPT_TARGET_SCHEMA='testnet-receipt-target-v1';
const fail=code=>{throw new Error(code);};
const uint=v=>Number.isSafeInteger(v)&&v>=0;
export function verifyReceiptTarget(target){
 if(!target||Object.keys(target).sort().join()!==['schema','chainId','accountId','marketId','openingOrderId'].sort().join()||target.schema!==RECEIPT_TARGET_SCHEMA||target.chainId!==10143||![target.accountId,target.marketId,target.openingOrderId].every(uint))fail('RECEIPT_TARGET_INVALID');
 return target;
}
export function receiptTargetForJourney(j){return verifyReceiptTarget({schema:RECEIPT_TARGET_SCHEMA,chainId:10143,accountId:j.accountId,marketId:j.marketId,openingOrderId:j.open.orderId});}
const rows=(e,k)=>e.histories[k].pages.flatMap(p=>p.value.d);
export function selectExperimentReceipts(e,target){
 verifyReceiptTarget(target);
 const {accountId,marketId,openingOrderId}=target;
 if(!e.account.snapshot.wallet.as.some(a=>a.id===accountId))fail('RECEIPT_TARGET_ACCOUNT_MISMATCH');
 const orders=rows(e,'order-history'),positions=rows(e,'position-history');
 const opening=orders.filter(o=>o.acc===accountId&&o.mkt===marketId&&o.oid===openingOrderId&&[1,2].includes(o.t)&&o.fs>0);
 const opened=positions.filter(p=>p.acc===accountId&&p.mkt===marketId&&p.oid===openingOrderId&&p.sr===21);
 if(opening.length!==1||opened.length!==1||!uint(opened[0].pid))fail('RECEIPT_TARGET_OPENING_NOT_UNIQUE');
 const related=positions.filter(p=>p.acc===accountId&&p.mkt===marketId&&p.pid===opened[0].pid);
 const ids=[...new Set(related.filter(p=>uint(p.oid)&&p.oid>0).map(p=>p.oid))].sort((a,b)=>a-b);
 const selected=ids.map(id=>{const matches=orders.filter(o=>o.acc===accountId&&o.mkt===marketId&&o.oid===id&&[1,2,3,4].includes(o.t)&&o.fs>0);if(matches.length!==1)fail('RECEIPT_TARGET_ORDER_MISSING_OR_AMBIGUOUS');return matches[0];});
 const hashes=[...new Set(selected.map(o=>{const h=normalizeTxHash(o.at?.txid);if(!h)fail('RECEIPT_TARGET_TX_INVALID');return h;}))];
 if(!hashes.length||hashes.length>4)fail('RECEIPT_TARGET_EXCEEDS_FOUR');
 return {target,positionId:opened[0].pid,orderIds:ids,hashes};
}
export function verifyReceiptSelection(e){
 if(!e.receiptSelection)return null;
 const expected=selectExperimentReceipts(e,e.receiptSelection.target);
 if(hash(expected)!==hash(e.receiptSelection)||!Array.isArray(e.chain)||e.chain.length!==expected.hashes.length||e.chain.some((c,i)=>c.txHash!==expected.hashes[i]))fail('RECEIPT_SELECTION_MISMATCH');
 return {selection:expected,receiptsAvailable:e.chain.every(c=>Boolean(c.receipt&&c.transaction)),historyComplete:Object.values(e.histories).every(h=>h.complete)};
}
