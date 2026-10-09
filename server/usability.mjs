import {hash} from './store.mjs';
import {replayComparison} from './comparison.mjs';

export const TASK_IDS=['costs','comparison','evidence','limits'];
const outcomes=['unassisted','assisted','failed','not_attempted'];
function bounded(value,max,name){if(typeof value!=='string'||value.length>max)throw new Error(`${name}无效`);return value.trim();}
export function saveStudy(store,d){
  const participant=bounded(d.participant,40,'匿名编号');
  if(!/^[a-zA-Z0-9_-]{1,40}$/.test(participant))throw new Error('请使用匿名编号，不填写姓名或邮箱');
  if(!['internal','external','automated'].includes(d.origin)||d.consent!==true)throw new Error('请选择观察来源，并确认已获记录许可');
  const role=bounded(d.role,160,'交易习惯'),notes=bounded(d.notes,2000,'误解与反馈');
  if(!/^comparison_[a-f0-9-]{36}$/.test(d.comparisonId??''))throw new Error('请选择已保存的方案对比证据');
  const evidence=store.get(d.comparisonId);replayComparison(evidence);
  if(!Array.isArray(d.tasks)||d.tasks.length!==TASK_IDS.length||new Set(d.tasks.map(t=>t?.id)).size!==TASK_IDS.length)throw new Error('需完整记录四项任务');
  const tasks=TASK_IDS.map(id=>{
    const task=d.tasks.find(t=>t?.id===id);if(!task||!outcomes.includes(task.outcome))throw new Error('任务结果无效');
    const seconds=task.seconds;
    if(seconds!==null&&(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0||seconds>86400))throw new Error('耗时需为实测秒数；未测填空');
    if(task.outcome==='not_attempted'&&seconds!==null)throw new Error('未尝试任务不能有耗时');
    return {id,outcome:task.outcome,seconds};
  });
  return store.create('usability',{participant,origin:d.origin,role,notes,tasks,comparisonId:evidence.id,evidenceHash:hash(evidence),source:'observer_entered',verifiedInterview:false,consent:'observer_attested'});
}
export function readStudies(store){
  const records=store.list('usability_').map(record=>{
    try{const evidence=store.get(record.comparisonId);if(hash(evidence)!==record.evidenceHash)throw new Error('关联证据发生变化');replayComparison(evidence);return {...record,integrity:'valid'};}
    catch(e){return {...record,integrity:'invalid',integrityError:e.message};}
  });
  const summaries=['internal','external','automated'].map(origin=>{
    const sessions=records.filter(r=>r.origin===origin&&r.integrity==='valid');
    return {origin,sessions:sessions.length,tasks:TASK_IDS.map(id=>{
      const attempted=sessions.map(r=>r.tasks.find(t=>t.id===id)).filter(t=>t&&t.outcome!=='not_attempted');
      const measured=attempted.filter(t=>t.seconds!==null),unassisted=attempted.filter(t=>t.outcome==='unassisted').length;
      return {id,attempted:attempted.length,unassisted,unassistedRate:attempted.length?unassisted/attempted.length:null,measured:measured.length,meanSeconds:measured.length?measured.reduce((sum,t)=>sum+t.seconds,0)/measured.length:null};
    })};
  });
  return {records,summaries,note:'来源由观察者填写；场次数不是独立用户数。未测耗时不计入平均值，失效证据不计入统计。'};
}
