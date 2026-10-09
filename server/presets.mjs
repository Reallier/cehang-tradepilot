import {scenarioInput,MODEL_VERSION} from './risk.mjs';
import {hash} from './store.mjs';
const idPattern=/^preset_[a-f0-9-]{36}$/;
function payload(d) {
 if(!['mainnet','testnet'].includes(d.network)||!Number.isSafeInteger(d.marketId)||d.marketId<0)throw new Error('常用假设需指定网络和市场');
 if(typeof d.name!=='string'||!d.name.trim()||d.name.trim().length>80||/[\x00-\x1f]/.test(d.name))throw new Error('假设名称需为1到80个字符');
 return {name:d.name.trim(),network:d.network,marketId:d.marketId,input:scenarioInput(d.input)};
}
export function readPreset(store,id) {
 if(!idPattern.test(id??''))throw new Error('常用假设ID无效');
 const r=store.get(id);
 if(r.schema!=='scenario-preset-v1'||hash(r.payload)!==r.payloadHash||hash(payload(r.payload))!==r.payloadHash)throw new Error('保存的假设参数校验失败');
 return r;
}
export function listPresets(store) {
 return store.list('preset_').map(r=>{try{readPreset(store,r.id);return {...r,integrity:'valid'};}catch{return {...r,integrity:'invalid'};}});
}
export function savePreset(store,d) {
 const p=payload(d),active=listPresets(store).filter(r=>!r.archivedAt);
 if(active.length>=20)throw new Error('最多保留20个启用的常用假设，请先归档');
 if(active.some(r=>r.payload?.name===p.name))throw new Error('已有同名常用假设，请改名后保存');
 return store.create('preset',{schema:'scenario-preset-v1',classification:'user_assumptions',payload:p,payloadHash:hash(p),modelAtSave:MODEL_VERSION,archivedAt:null});
}
export function setPresetArchived(store,id,archived) {
 if(typeof archived!=='boolean')throw new Error('归档状态无效');
 const r=readPreset(store,id);
 if(!archived&&r.archivedAt&&listPresets(store).filter(x=>!x.archivedAt).length>=20)throw new Error('最多启用20个假设');
 if(!archived&&listPresets(store).some(x=>x.id!==id&&!x.archivedAt&&x.payload?.name===r.payload.name))throw new Error('已有同名启用假设，请先归档同名项');
 return store.save(id,{...r,archivedAt:archived?new Date().toISOString():null});
}
