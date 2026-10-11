import {hash} from '../server/integrity.mjs';
import {researchPacket,replayResearch,MAX_RESEARCH_BYTES} from './research-workspace.mjs';
import {RESEARCH_COMPARISON_SCHEMA,replayResearchComparison} from './research-comparison.mjs';

// The entire batch is replayed before callers receive a replacement workspace.
// No ID rewriting: alternate versions require an explicit choice outside merge.
export function mergeResearchFiles(current,raws){
 if(!Array.isArray(raws)||!raws.length||raws.length>20)throw new Error('每批请选择1至20个研究或比较档案');
 let bytes=0;
 for(const raw of raws){
  if(typeof raw!=='string')throw new Error('研究档案必须为JSON文本');
  bytes+=new TextEncoder().encode(raw).length;
  if(bytes>MAX_RESEARCH_BYTES)throw new Error('本批档案总计超过8MB，请分批导入');
 }
 researchPacket(current);
 const workspace=structuredClone(current),ids=new Map(workspace.experiments.map(e=>[e.id,hash(e)]));
 let added=0,existing=0;
 for(let index=0;index<raws.length;index++){
  try{
   const packet=JSON.parse(raws[index]);
   if(packet?.schema===RESEARCH_COMPARISON_SCHEMA)replayResearchComparison(packet);
   else replayResearch(packet);
   for(const experiment of packet.workspace.experiments){
    const signature=hash(experiment);
    if(ids.has(experiment.id)){
     if(ids.get(experiment.id)!==signature)throw new Error(`实验「${experiment.title||experiment.id}」(${experiment.id})存在不同版本，请先分别导出并核对；本批未合并`);
     existing++;continue;
    }
    if(workspace.experiments.length>=20)throw new Error('合并后超过20轮实验，请拆分工作区');
    ids.set(experiment.id,signature);workspace.experiments.push(experiment);added++;
   }
  }catch(error){throw new Error(`第${index+1}个档案：${error.message}`);}
 }
 // Includes report overhead in the export-size limit; source reports are never trusted.
 researchPacket(workspace);
 return {workspace,summary:{files:raws.length,added,existing,total:workspace.experiments.length}};
}
