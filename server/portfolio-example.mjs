import {positionExample} from './position-examples.mjs';
import {analyzeAccount} from './account-analysis.mjs';
import {hash} from './integrity.mjs';
export function portfolioExample(){
 const f=positionExample('long'),context=structuredClone(f.context),expectedWallet='0x'+'3'.repeat(40);
 // Two deliberately identically named synthetic tokens must remain separate by identity.
 context.tokens.push({...context.tokens[0],id:2,address:'0x'+'4'.repeat(40)});
 context.instances.push({...context.instances[0],id:2,collateral_token_id:2,address:'0x'+'5'.repeat(40)});
 context.markets.push({...structuredClone(context.markets[0]),id:2,symbol:'ETH',name:'ETH',instance_id:2});
 const snapshot={expectedWallet,context,positions:{mt:26,sn:100,at:f.snapshotAt,d:[f.position,
  {...structuredClone(f.position),pid:2,sd:2,s:500,c:'20000000'},
  {...structuredClone(f.position),pid:3,acc:2,mkt:2,s:2000,c:'30000000'}]},
  wallet:{mt:19,sn:100,at:f.snapshotAt,addr:expectedWallet,as:[1,2].map(id=>({id,in:id,ft:1,b:'20000000',lb:'1000000',fr:false,fw:false}))},rpcChainId:10143,rpcHead:100,now:f.now};
 const report=analyzeAccount(snapshot);
 return {schema:'account-observation-v1',classification:'synthetic_account_observation',snapshot,snapshotHash:hash(snapshot),report,reportHash:hash(report)};
}
