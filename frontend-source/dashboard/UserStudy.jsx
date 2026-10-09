import React,{useEffect,useState} from 'react';
import {DataComponent} from '../../data-app-public.jsx';
const tasks=[['costs','指出入场、退出与资金费用'],['comparison','解释相同金额下杠杆对保证金与费用的影响'],['evidence','找到并下载关联对比证据'],['limits','说明压力情景、清算估算与实际成交的区别']];
const origins={internal:'内部演练',external:'外部观察',automated:'自动验收'};
export const emptyStudy=()=>({participant:'',origin:'internal',comparisonId:'',role:'',notes:'',consent:false,tasks:tasks.map(([id])=>({id,outcome:'not_attempted',seconds:null}))});
export function UserStudy({api,run,busy,session,download,onOpenEvidence,form,setForm}){
 const [data,setData]=useState(null),[comparisons,setComparisons]=useState([]),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 async function refresh(){try{const [d,r]=await Promise.all([api('/api/usability'),api('/api/records')]);setData(d);setComparisons(r.records.filter(x=>x.type==='comparison'));setError('');}catch(e){setError(e.message);}}
 useEffect(()=>{refresh();},[]);
 function change(name,value){setForm(f=>({...f,[name]:value}));setSaved(false);}
 function taskChange(id,name,value){setForm(f=>({...f,tasks:f.tasks.map(t=>t.id===id?{...t,[name]:value,...(name==='outcome'&&value==='not_attempted'?{seconds:null}:{})}:t)}));setSaved(false);}
 const sourceRows=(data?.summaries??[]).flatMap(group=>group.tasks.map(t=>({...t,origin:group.origin,sessions:group.sessions,classification:'observer_entered',verifiedInterview:false})));
 return <section className="tp-competition-grid">
 <div className="tp-panel"><h3>用户任务验收</h3><p>围绕一份已保存的方案对比观察四项任务。使用匿名编号，不记录姓名或邮箱；先取得参与者许可。</p>
 <div className="tp-input-pair"><label>匿名编号<input aria-label="匿名试用编号" maxLength="40" value={form.participant} onChange={e=>change('participant',e.target.value)} placeholder="P-01"/></label><label>记录来源<select aria-label="试用记录来源" value={form.origin} onChange={e=>change('origin',e.target.value)}>{Object.entries(origins).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
 <label>关联方案对比<select aria-label="关联方案对比" value={form.comparisonId} onChange={e=>change('comparisonId',e.target.value)}><option value="">请选择已保存证据</option>{comparisons.map(r=><option key={r.id} value={r.id}>{r.asset} · {new Date(r.createdAt).toLocaleString('zh-CN')} · {r.id.slice(-8)}</option>)}</select></label>
 <button disabled={busy||!form.comparisonId} onClick={()=>run(()=>onOpenEvidence(form.comparisonId))}>查看关联证据</button>
 {form.origin==='automated'&&<p className="tp-note">自动验收记录按钮、数值和证据流程检查，不代表真人理解或外部试用；未检查的任务保持未尝试。</p>}
 <label>交易习惯 / 角色<input aria-label="任务试用角色" maxLength="160" value={form.role} onChange={e=>change('role',e.target.value)}/></label>
 {tasks.map(([id,label],index)=>{const task=form.tasks[index];return <fieldset className="tp-study-task" key={id}><legend>{index+1}. {label}</legend><div className="tp-input-pair"><label>观察结果<select aria-label={`任务${index+1}结果`} value={task.outcome} onChange={e=>taskChange(id,'outcome',e.target.value)}><option value="not_attempted">未尝试</option><option value="unassisted">{form.origin==='automated'?'流程检查通过':'独立完成'}</option><option value="assisted">协助完成</option><option value="failed">未完成</option></select></label><label>实测耗时（秒）<input aria-label={`任务${index+1}耗时`} type="number" min="0" max="86400" disabled={task.outcome==='not_attempted'} value={task.seconds??''} placeholder="未测留空" onChange={e=>taskChange(id,'seconds',e.target.value===''?null:Number(e.target.value))}/></label></div></fieldset>;})}
 <label>误解点与改进建议<textarea aria-label="任务观察建议" maxLength="2000" value={form.notes} onChange={e=>change('notes',e.target.value)}/></label>
 <label className="tp-check"><input type="checkbox" checked={form.consent} onChange={e=>change('consent',e.target.checked)}/>已获记录许可；自动验收则确认仅使用测试内容</label>
 <button disabled={busy||!session||!form.comparisonId||!form.participant||!form.consent} onClick={()=>run(async()=>{await api('/api/usability',form);setForm(emptyStudy());setSaved(true);await refresh();})}>保存任务观察</button>{saved&&<p role="status">任务观察已保存本地，关联证据已复算核验。</p>}{error&&<p role="alert">{error}</p>}
 </div>
 <div className="tp-panel"><h3>观察汇总与导出</h3><p className="tp-note">来源由录入者填写，未经独立访谈认证；场次数不能当作用户数。未尝试不计分母，未测耗时保留为空。关联证据失效时不计入统计。</p><div className="tp-comparison-actions"><button onClick={refresh}>刷新观察</button><button disabled={!data?.records.length} onClick={()=>download(data,'tradepilot-task-observations.json')}>导出观察JSON</button></div>
 <DataComponent id="tp-user-study" queryId="usability" title="按来源分组的任务观察" kind="table" displayRows={sourceRows} sourceRows={sourceRows}>
 <div data-reviewed-rows>{(data?.summaries??[]).map(group=><section className="tp-study-group" key={group.origin}><h3>{origins[group.origin]} · {group.sessions} 场有效观察</h3>{group.origin==='automated'&&<p className="tp-note">仅为流程检查，不代表真人理解。</p>}<table className="tp-comparison-table"><thead><tr><th>任务</th><th>{group.origin==='automated'?'通过 / 检查':'独立 / 尝试'}</th><th>均时 / 实测数</th></tr></thead><tbody>{group.tasks.map((t,i)=><tr key={t.id}><th>{i+1}. {tasks[i][1]}</th><td>{t.unassisted} / {t.attempted}</td><td>{t.meanSeconds===null?'未测':`${t.meanSeconds.toFixed(1)} 秒`} / {t.measured}</td></tr>)}</tbody></table></section>)}</div>
 </DataComponent>
 {(data?.records??[]).map(r=><p className="tp-note" key={r.id}>{r.participant} · {origins[r.origin]} · {new Date(r.createdAt).toLocaleString('zh-CN')} · {r.integrity==='valid'?'证据有效':`不计入统计：${r.integrityError}`}</p>)}
 </div></section>;
}
