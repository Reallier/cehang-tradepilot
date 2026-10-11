import React,{useEffect,useState} from 'react';
import {experimentProgress} from '../research-progress.mjs';
export function ResearchProgress({experiment,row,active}){
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{if(!active)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[active]);
 const p=experimentProgress(experiment,row,now),labels={verified:'已核验',unverified:'待补证据',missing:'待采集',partial:'部分退出'};
 const expiry=p.validUntil?new Date(p.validUntil).toLocaleString('zh-CN',{hour12:false}):null;
 return <section className="research-progress" aria-label="本轮验收进度"><h3>本轮验收进度</h3>
 <dl><div><dt>开仓证据</dt><dd>{labels[p.opening]}</dd></div><div><dt>退出结算</dt><dd>{labels[p.settlement]}</dd></div><div><dt>事前对照</dt><dd>{p.comparison==='matched'?'已匹配':p.comparison==='unavailable'?'未匹配':'待成交核对'}</dd></div><div><dt>计划条件</dt><dd>{({matched:'与基线一致',mismatch:'与基线不符',needs_baseline:'待基线',not_declared:'未声明结构化计划'})[row.planMatch?.status??'not_declared']}</dd></div><div><dt>比较准入</dt><dd>{p.eligible?'已通过，仍需去重':'未通过'}</dd></div></dl>
 {p.comparison==='matched'?<p className="tp-note">历史成交已匹配原基线，不受当前时间影响。</p>:<p className={p.window==='expired'?'tp-alert':'tp-note'}>{p.window==='valid'?`基线关联窗口剩余 ${p.remainingSeconds} 秒`:p.window==='expired'?'基线关联窗口已过期':p.window==='clock_invalid'?'本机时间与基线不一致':'尚无事前基线'}{expiry?` · 截止 ${expiry}（本机时区）`:''}。最终按保存的成交时间核验。</p>}
 {experiment.plan&&<p className="tp-note">固定市场 {experiment.plan.marketId} · 请求名义金额 {experiment.plan.notional} · 杠杆 {experiment.plan.leverage}× · 滑点上限 {experiment.plan.slippageBps} bps。金额匹配事前请求值，实际成交金额可受数量取整、价格及部分成交影响。</p>}
 {row.planMatch?.differences?.length>0&&<p className="tp-alert">不符字段：{row.planMatch.differences.map(d=>`${d.label}（计划 ${d.expected} / 基线 ${d.actual??'未知'}）`).join('；')}。证据一致不代表符合实验计划。</p>}
 <p role="status">{p.next}</p>{row.journey?.comparison?.reason&&<p className="tp-note">{row.journey.comparison.reason}</p>}
 </section>;
}
