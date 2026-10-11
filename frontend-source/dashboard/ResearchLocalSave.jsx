import React,{useEffect,useRef,useState} from 'react';
import {createResearchClient} from '../research-client.mjs';
import {createResearchVault} from '../research-vault.mjs';
export function ResearchLocalSave({workspace,busy,onRestore}){
 const [enabled,setEnabled]=useState(false),[versions,setVersions]=useState([]),[message,setMessage]=useState(''),[working,setWorking]=useState(false);
 const vault=useRef(null),client=useRef(null),generation=useRef(0);
 useEffect(()=>{client.current=createResearchClient();let alive=true;try{vault.current=createResearchVault();vault.current.list().then(v=>{if(alive)setVersions(v);}).catch(e=>{if(alive)setMessage(e.message);});}catch(e){setMessage(e.message);}return()=>{alive=false;generation.current++;client.current.cancel();};},[]);
 useEffect(()=>{const token=++generation.current;if(!enabled)return;const timer=setTimeout(async()=>{
  setWorking(true);try{const packet=await client.current.call('export',{workspace});if(token!==generation.current)return;await vault.current.save(packet);if(token!==generation.current)return;setVersions(await vault.current.list());setMessage('已保存到此浏览器，保留最近3个不同版本。');}catch(e){if(token===generation.current)setMessage(e.message);}finally{if(token===generation.current)setWorking(false);}
 },700);return()=>clearTimeout(timer);},[workspace,enabled]);
 async function clear(){generation.current++;client.current.cancel();setEnabled(false);setWorking(true);try{await vault.current.clear();setVersions([]);setMessage('此浏览器的全部研究快照已清除，当前页面内容保留。');}catch(e){setMessage(e.message);}finally{setWorking(false);}}
 return <section className="tp-panel" aria-label="本机研究恢复"><div className="research-actions"><h2>本机研究恢复</h2><label><input type="checkbox" aria-label="启用本机保存" checked={enabled} disabled={!vault.current||working} onChange={e=>{setEnabled(e.target.checked);if(!e.target.checked){generation.current++;client.current.cancel();setWorking(false);}}}/>启用此页本机自动保存</label><button disabled={!vault.current||working} onClick={clear}>删除全部本机快照</button></div><p className="tp-note">默认关闭。启用后，账户与交易材料以明文保存在当前浏览器的此站点存储中，保留最近3个版本；不上传。共享设备请勿启用，下载文件仍需自行保管。恢复会替换当前工作区。</p>{working&&<p role="status">正在保存本机快照…</p>}{message&&<p role="status">{message}</p>}{versions.map(v=><button key={v.id} disabled={busy||working||enabled} onClick={()=>onRestore(JSON.stringify(v.packet))}>恢复 {new Date(v.savedAt).toLocaleString('zh-CN')} · {v.packet.workspace.experiments.length}轮</button>)}{enabled&&versions.length>0&&<p className="tp-note">恢复旧版本前先关闭自动保存，避免立即写入当前版本。</p>}</section>;
}
