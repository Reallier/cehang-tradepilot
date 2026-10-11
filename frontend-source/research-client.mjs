import {researchTask} from './research-tasks.mjs';
export function createResearchClient({factory=typeof Worker==='undefined'?null:()=>new Worker(new URL('./research-worker.js',document.baseURI),{type:'module'})}={}){
 let worker=null,sequence=0,pending=null;
 function cancel(){sequence++;worker?.terminate();worker=null;if(pending){pending.reject(new Error('计算已取消'));pending=null;}}
 return {cancel,call(operation,payload){cancel();const id=sequence;
  if(!factory)return Promise.resolve().then(()=>{if(id!==sequence)throw new Error('计算已取消');return researchTask(operation,payload);});
  return new Promise((resolve,reject)=>{pending={resolve,reject};try{worker=factory();worker.onmessage=({data})=>{if(data.id!==id||!pending)return;const p=pending;pending=null;worker.terminate();worker=null;data.error?p.reject(new Error(data.error)):p.resolve(data.result);};worker.onerror=()=>{if(id!==sequence)return;const p=pending;pending=null;worker?.terminate();worker=null;p?.reject(new Error('后台核验失败，请重试或导出保留材料'));};worker.postMessage({id,operation,payload});}catch(e){pending=null;worker?.terminate();worker=null;reject(e);}});
 }};
}
