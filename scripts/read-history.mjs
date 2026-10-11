import {verifyReceiptTarget} from '../server/receipt-selection.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Store} from '../server/store.mjs';
import {HistoryReader,collectHistory} from '../server/trade-history.mjs';
import {accountReadiness} from '../server/account-readonly.mjs';
import {historyAuditPacket} from '../server/history-audit.mjs';
import {tradeReviewPacket} from '../server/settlement-audit.mjs';
try {
  const {values}=parseArgs({options:{config:{type:'string'},target:{type:'string'},collect:{type:'boolean',default:false}}});
  if(!values.config)throw new Error('CONFIG_REQUIRED');
  const filename=path.resolve(values.config),config=JSON.parse(fs.readFileSync(filename,'utf8'));
  const relative=v=>{if(typeof v!=='string'||!v)throw new Error('CONFIG_PATH_MISSING');return path.resolve(path.dirname(filename),v);};
  const state=new Store(relative(config.stateDir)),reader=new HistoryReader(state);
  const eligibility=state.exists('eligibility_testnet')?state.get('eligibility_testnet'):null;
  let receiptTarget;
  if(values.target){const targetFile=path.resolve(values.target);if(fs.statSync(targetFile).size>4096)throw new Error('RECEIPT_TARGET_TOO_LARGE');receiptTarget=verifyReceiptTarget(JSON.parse(fs.readFileSync(targetFile,'utf8')));}
  const options={eligibility,expectedWallet:config.expectedWallet,receiptTarget};
  const ready=accountReadiness({...options,keyConfigured:Boolean(reader.key('testnet'))});
  if(state.exists('restriction_testnet')&&state.get('restriction_testnet').blocked){ready.ready=false;ready.blockers.push('PROTOCOL_RESTRICTION_BLOCKED');}
  if(!values.collect||!ready.ready){console.log(JSON.stringify(ready));if(!ready.ready)process.exitCode=2;}
  else {
    const packet=await collectHistory(reader,options),output=new Store(relative(config.outputDir));
    const saved=output.create('trade_history',packet);
    const audit=output.create('history_audit',historyAuditPacket(saved));
    const review=output.create('trade_review',tradeReviewPacket(saved));
    console.log(JSON.stringify({status:'saved',recordId:saved.id,auditId:audit.id,reviewId:review.id,orderChecks:audit.report.orders.map(o=>o.status),privateOutput:true,targeted:!!receiptTarget,targetChecks:receiptTarget?{opening:review.report.opening.orders.filter(o=>o.accountId===receiptTarget.accountId&&o.marketId===receiptTarget.marketId&&o.orderId===receiptTarget.openingOrderId).map(o=>o.status),exits:review.report.closed.filter(o=>packet.evidence.receiptSelection.orderIds.includes(o.orderId)&&o.accountId===receiptTarget.accountId&&o.marketId===receiptTarget.marketId).map(o=>o.status)}:null,targetReceiptCoverage:audit.report.targetReceiptCoverage?{receiptsAvailable:audit.report.targetReceiptCoverage.receiptsAvailable,historyComplete:audit.report.targetReceiptCoverage.historyComplete}:null,historyCounts:Object.fromEntries(Object.entries(packet.evidence.histories).map(([k,v])=>[k,{count:v.pages.reduce((n,p)=>n+p.value.d.length,0),complete:v.complete}])),receipts:packet.evidence.chain.length}));
  }
}catch(e){const status=/返回 (\d{3})/.exec(e.message??'');console.error(JSON.stringify({status:'read_failed',code:status?`UPSTREAM_${status[1]}`:['RECEIPT_TARGET_TOO_LARGE','RECEIPT_TARGET_INVALID','RECEIPT_TARGET_ACCOUNT_MISMATCH','RECEIPT_TARGET_OPENING_NOT_UNIQUE','RECEIPT_TARGET_ORDER_MISSING_OR_AMBIGUOUS','RECEIPT_TARGET_TX_INVALID','RECEIPT_TARGET_EXCEEDS_FOUR'].includes(e.message)?e.message:'HISTORY_READ_FAILED',retryAutomatically:false}));process.exitCode=1;}
