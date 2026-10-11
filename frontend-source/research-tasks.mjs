import {researchPacket,researchReport,replayResearch,attachResearchEvidence} from './research-workspace.mjs';
import {researchComparisonPacket,compareResearch,replayResearchComparison} from './research-comparison.mjs';
import {mergeResearchFiles} from './research-merge.mjs';
export function researchTask(operation,payload){
 let workspace=payload.workspace,summary=null;
 if(operation==='restore'){
  if(typeof payload.raw!=='string'||new TextEncoder().encode(payload.raw).length>8*1024*1024)throw new Error('研究文件超过8MB');
  const p=JSON.parse(payload.raw);
  if(/^testnet-research-comparison-v[123]$/.test(p?.schema))replayResearchComparison(p);else replayResearch(p);
  workspace=p.workspace;
 }
 if(operation==='merge'){const result=mergeResearchFiles(workspace,payload.raws);workspace=result.workspace;summary=result.summary;}
 if(operation==='attach')workspace={experiments:workspace.experiments.map(e=>e.id===payload.id?attachResearchEvidence(e,payload.packet):e)};
 if(operation==='export')return researchPacket(workspace);
 if(operation==='comparison')return researchComparisonPacket(workspace);
 if(!['evaluate','restore','merge','attach'].includes(operation))throw new Error('未知研究操作');
 const packet=researchPacket(workspace);
 return {workspace,report:packet.report,comparison:compareResearch(workspace,packet.report),summary};
}
