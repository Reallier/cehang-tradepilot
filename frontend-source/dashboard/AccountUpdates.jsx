import React,{useEffect,useRef,useState,useMemo} from 'react';
import {accountChanges,monitorFreshness} from '../account-changes.mjs';
import {monitorExample} from '../../server/monitor-example.mjs';
import {verifyObservation} from '../account-workflow.mjs';
import {reviewNumber} from '../review-journeys.mjs';
import {time} from './Workbench.jsx';
import './account-updates.css';
const states={fresh:'观察有效',stale:'数据过期或不完整',backoff:'采集退避中',stopped:'采集已停止',unavailable:'尚无观察'};
const changes={markPrice:'标记价格',size:'数量',collateral:'抵押额',fundingPnl:'已累计资金损益',maintenanceEstimate:'维持保证金估算'};
export function AccountUpdates({active,api,tick,onUse}){
 const local=['127.0.0.1','localhost'].includes(location.hostname);
 const [monitor,setMonitor]=useState(null),[poll,setPoll]=useState(false),[synthetic,setSynthetic]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0),apiRef=useRef(api);apiRef.current=api;
 // Invalidate manual reads as well as polling when the whole page is cleared.
 useEffect(()=>()=>{generation.current++;},[]);
 async function refresh(){
  const id=++generation.current;setBusy(true);
  try{
   const r=await apiRef.current('/api/local-monitor');
   if(!r.available)throw new Error('UNAVAILABLE');
   if(r.monitor.packet)await verifyObservation(r.monitor.packet);if(r.monitor.previous)await verifyObservation(r.monitor.previous);
   if(r.monitor.packet)accountChanges(r.monitor.previous,r.monitor.packet);
   if(id===generation.current){setMonitor(r.monitor);setSynthetic(false);setError('');}
  }catch{if(id===generation.current){setError('本机更新源不可用，或结果未通过复算。保留上次观察，停止自动读取；可稍后手动重试。');setPoll(false);}}
  finally{if(id===generation.current)setBusy(false);}
 }
 useEffect(()=>{if(!active||!poll||!local)return;let stopped=false,timer;const run=async()=>{if(document.visibilityState!=='hidden')await refresh();if(!stopped)timer=setTimeout(run,15000);};run();return()=>{stopped=true;clearTimeout(timer);generation.current++;setBusy(false);};},[active,poll,local]);
 const result=useMemo(()=>monitor?.packet?accountChanges(monitor.previous,monitor.packet):null,[monitor]);
 const status=error?'读取失败':states[monitorFreshness(monitor,tick)];
 function example(){generation.current++;setBusy(false);setPoll(false);setError('');setSynthetic(true);setMonitor(monitorExample());}
 return <section className="account-updates" aria-label="账户只读更新"><header><div><h2>账户更新与风险变化</h2><p>{synthetic?'合成变化案例 · 固定历史时点，无链上交易':local?'本机独立采集器 → 本页只读观察':'真实账户更新仅在本机启用，公网不提供私有账户数据'}</p></div><div>{local&&<><button disabled={busy} onClick={refresh}>读取最新观察</button><button aria-pressed={poll} onClick={()=>{setSynthetic(false);setPoll(v=>!v);}}>自动读取 {poll?'开':'关'}</button></>}<button onClick={example}>体验风险变化案例</button></div></header>
 <p className="tp-note">采集间隔至少60秒，通常每轮5个串行只读请求；仅上下文追赶时最多6个。页面自动读取每15秒检查本机文件，隐藏页面暂停读取；页面开关不控制独立采集器。</p>
 {error&&<p role="alert" className="tp-alert">{error}</p>}{busy&&<p role="status">读取并复算观察…</p>}
 {monitor&&<><div className="update-status"><strong>{synthetic?'合成案例 · 非实时':status}</strong><span>上次采集成功：{time(monitor.lastSuccessAt)}</span><span>下次允许采集：{monitor.state==='stopped'?'已停止':time(monitor.nextAttemptAt)}</span></div>
 {monitor.state==='stopped'&&<p className="tp-alert">采集已停止。{monitor.detail==='UPSTREAM_451'?'协议返回 HTTP 451；需先确认允许的运行环境或由协议方解除限制，再手动启用。':monitor.code==='ACCESS_OR_VALIDATION_STOP'?'账户访问或数据校验未通过，请检查本机脱敏诊断记录。':'可能已到达本轮采集次数或时间上限。'}不会自动恢复或下单。</p>}
 {monitor.state==='backoff'&&<p className="tp-alert">采集暂时失败，已保留旧观察；退避结束前不发起下一轮请求。</p>}
 <p className="tp-note">每条数据另按45秒有效期判断。采集成功不代表所有协议数据都新鲜；旧数据、缺失值不会显示为当前安全。</p>
 {result&&<><p>前后观察：{time(monitor.previous?.report.evaluatedAt)} → {time(monitor.packet.report.evaluatedAt)}</p>
 {result.state!=='compared'?<p className="tp-note">{result.state==='first'?'首次观察，等待下一轮才能比较。':'账户身份或时间不匹配，不计算变化。'}</p>:!result.rows.length?<p>两次观察均无开放仓位；不能据此证明已平仓结算或盈利。</p>:<div className="review-table-scroll"><table className="plain-table"><thead><tr><th>仓位</th><th>观察变化</th><th>标记价变化</th><th>未实现损益变化</th><th>保证金余量变化</th></tr></thead><tbody>{result.rows.map(r=><tr key={r.id}><th>{r.asset} #{r.positionId}<small>账户 #{r.accountId} · {r.unit}</small></th><td>{r.state==='compared'?(r.changed.map(k=>changes[k]).join('、')||'未观察到变化'):({newly_observed:'本次新增观察',no_longer_observed:'本次不再观察到 · 不证明平仓',unknown:'输入不完整或抵押资产已变化'})[r.state]}</td>{[r.markDelta,r.pnlDelta,r.bufferDelta].map((v,i)=><td key={i}>{reviewNumber(v,6,{signed:true})}</td>)}</tr>)}</tbody></table></div>}
 <p className="tp-note">变化只描述两次观察之间的差值，不将全部损益归因于价格，也不跨抵押资产求和。新增或消失的仓位不自动认定为成交。</p>
 <button onClick={()=>onUse(monitor.packet)}>用这次观察检查持仓压力</button></>}
 {synthetic&&<button onClick={()=>setMonitor(m=>({...m,state:'backoff',code:'RATE_LIMITED'}))}>演示采集退避</button>}
 <button onClick={()=>{generation.current++;setPoll(false);setBusy(false);setMonitor(null);setError('');setSynthetic(false);}}>清除更新观察</button></>}
 </section>;
}
