import React,{useState} from 'react';
const labels={restricted:'接口限制',cooldown:'冷却中',not_observed:'本进程尚未读取',degraded:'读取异常',stale:'最近读取已过期',recent_success:'最近读取成功'};
const date=v=>v==null?'—':new Date(v).toLocaleString('zh-CN');
export function RuntimeStatus({api}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function read(){setBusy(true);try{setData(await api('/api/diagnostics'));setError('');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="tp-panel" aria-label="运行诊断"><div className="research-actions"><h2>运行诊断</h2><button disabled={busy} onClick={read}>读取服务状态</button></div><p className="tp-note">只读取服务已有状态，不额外探测协议接口。进程正常不等于行情可用。</p>{error&&<p role="alert">{error}</p>}{data&&<><p>服务启动：{date(data.startedAt)} · 本次检查：{date(data.observedAt)}</p><div className="table-scroll"><table className="plain-table"><thead><tr><th>网络</th><th>读取状态</th><th>最后成功</th><th>冷却截止</th><th>连续失败</th></tr></thead><tbody>{data.networks.map(n=><tr key={n.network}><td>{n.network}</td><td>{labels[n.status]}{n.restrictionStatus?` (${n.restrictionStatus})`:''}</td><td>{date(n.lastSuccess)}</td><td>{date(n.cooldownUntil)}</td><td>{n.consecutiveFailures}</td></tr>)}</tbody></table></div>{data.networks.map(n=><details key={n.network}><summary>{n.network} 最近读取记录</summary>{n.events.map((e,i)=><p key={i}>{date(e.at)} · {e.status}</p>)}</details>)}<p className="tp-note">{data.note}</p></>}</section>;
}
