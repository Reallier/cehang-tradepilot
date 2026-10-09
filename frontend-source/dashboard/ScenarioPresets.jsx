import React,{useEffect,useState} from 'react';
export function ScenarioPresets({api,run,busy,ready,input,network,marketId,onRestore}) {
 const [presets,setPresets]=useState([]),[name,setName]=useState(''),[selected,setSelected]=useState(''),[archived,setArchived]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function load(){const d=await api('/api/presets');setPresets(d.presets);}
 useEffect(()=>{let active=true;api('/api/presets').then(d=>{if(active)setPresets(d.presets);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 const visible=presets.filter(p=>Boolean(p.archivedAt)===archived),current=visible.find(p=>p.id===selected);
 return <details className="tp-presets"><summary>常用假设 · 保存与恢复</summary><div className="tp-presets-body">
 <label>假设名称<input aria-label="常用假设名称" disabled={busy} value={name} maxLength="80" placeholder="例如：低杠杆观察" onChange={e=>{setName(e.target.value);setMessage('');}}/></label>
 <button disabled={busy||!ready||marketId==null||!name.trim()} onClick={()=>run(async()=>{const saved=await api('/api/presets',{action:'save',name,network,marketId,input});await load();setArchived(false);setSelected(saved.id);setName('');setMessage('参数已保存；未保存行情或执行权限。');})}>保存当前假设</button>
 <label className="tp-check"><input type="checkbox" disabled={busy} checked={archived} onChange={e=>{setArchived(e.target.checked);setSelected('');setMessage('');}}/>查看已归档</label>
 <label>保存的参数<select aria-label="保存的假设" disabled={busy} value={selected} onChange={e=>{setSelected(e.target.value);setMessage('');}}><option value="">请选择</option>{visible.map(p=><option key={p.id} value={p.id}>{p.payload?.name??'损坏的假设'} · {p.payload?.network??'未知'} / 市场{p.payload?.marketId??'未知'}{p.integrity==='invalid'?' · 校验失败':''}</option>)}</select></label>
 {current?.integrity==='valid'&&<p className="tp-note" data-reviewed-rows>{current.payload.input.direction==='long'?'做多':'做空'} · {current.payload.input.notional} 名义金额 · {current.payload.input.leverage}倍 · {current.payload.input.hours}小时 · 冲击 {current.payload.input.shockPct}% · 滑点 {current.payload.input.slippageBps}bps</p>}
 <div className="tp-comparison-actions"><button disabled={busy||!ready||!current||current.integrity!=='valid'} onClick={()=>run(async()=>{const p=await api(`/api/presets?id=${selected}`);onRestore(p.payload);setMessage('已恢复参数；旧预演已清除，请用新行情重新计算。');})}>恢复参数</button><button disabled={busy||!ready||!current||current.integrity!=='valid'} onClick={()=>run(async()=>{await api('/api/presets',{action:'archive',id:selected,archived:!archived});await load();setSelected('');setMessage(archived?'已重新启用假设。':'已归档，仍可重新启用。');})}>{archived?'重新启用':'归档假设'}</button></div>
 {!visible.length&&<p className="tp-note">{archived?'暂无已归档假设。':'尚未保存常用假设。'}</p>}{message&&<p role="status" className="tp-note">{message}</p>}{error&&<p role="alert">{error}</p>}
 <p className="tp-note">恢复网络、市场和参数；结果须重新计算。假设本身不代表可交易或策略有效。</p>
 </div></details>;
}
