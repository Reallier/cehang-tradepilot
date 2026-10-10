import {portfolioExample} from './portfolio-example.mjs';
import {analyzeAccount} from './account-analysis.mjs';
import {hash} from './integrity.mjs';
export function monitorExample(){
 const previous=portfolioExample(),packet=structuredClone(previous),s=packet.snapshot;
 s.now+=60000;s.rpcHead+=1;s.context.chain.gas.h+=1;
 const at={t:s.now,b:s.rpcHead};
 s.wallet.at=at;s.positions.at=at;s.wallet.sn=s.rpcHead;s.positions.sn=s.rpcHead;
 for(const m of s.context.markets){m.state.at=at;m.state.mrk=Math.round(m.state.mrk*.9);m.funding.at=at;}
 packet.snapshotHash=hash(s);packet.report=analyzeAccount(s);packet.reportHash=hash(packet.report);
 return {schema:'account-monitor-v1',state:'observing',code:null,packet,previous,lastAttemptAt:new Date(s.now).toISOString(),lastSuccessAt:new Date(s.now).toISOString(),nextAttemptAt:new Date(s.now+60000).toISOString()};
}
