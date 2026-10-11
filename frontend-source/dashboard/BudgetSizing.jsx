import React,{useRef,useState} from 'react';
import {sizingPacket,sizingSettings} from '../../server/budget-sizing.mjs';
import {decisionLimits} from '../../server/decision-metrics.mjs';
import {reviewNumber as fmt} from '../review-journeys.mjs';

export function BudgetSizing({comparison,limits,api,run,busy,download,onApplyPlan}){
 const [settings,setSettings]=useState({baseIndex:0,maxNotional:comparison.results[0].input.notional});
 const [saved,setSaved]=useState(null),evidence=useRef(null);
 const signature=JSON.stringify([limits,settings]),packet=saved?.signature===signature?saved.packet:null,r=packet?.report;
 let error='';try{sizingSettings(settings);decisionLimits(limits);}catch(e){error=e.message;}
 const fixed=comparison.results[settings.baseIndex].input;
 const reasons=r?.next?[...(r.next.result?.blockers??[]),...(r.next.decision?.checks??[]).filter(c=>c.status==='exceeded').map(c=>`${c.label}超出 ${fmt(c.limit)}`)]:[];
 return <section className="budget-sizing" aria-label="按预算搜索规模"><header><h3>按预算搜索规模</h3><span className="tp-badge">本地计算 · 保存时快照</span></header>
  <p className="tp-note">使用上方预算，固定所选方案的方向、杠杆、持有时间和价格情景。搜索目标名义金额步长为0.01，实际数量仍按协议精度向下取整。</p>
  <fieldset disabled={busy}><legend>搜索条件</legend><div className="sizing-controls"><label>沿用方案<select aria-label="预算搜索沿用方案" value={settings.baseIndex} onChange={e=>{const baseIndex=Number(e.target.value);setSettings({baseIndex,maxNotional:comparison.results[baseIndex].input.notional});}}><option value={0}>方案 A</option><option value={1}>方案 B</option></select></label><label>目标名义金额搜索上限<input aria-label="预算搜索上限" type="number" min="1" max="10000000" step="0.01" value={settings.maxNotional} onChange={e=>setSettings(s=>({...s,maxNotional:e.target.value}))}/></label></div></fieldset>
  <p className="tp-note">{fixed.direction==='long'?'多头':'空头'} · {fixed.leverage}× · {fixed.hours} 小时 · 价格情景 {fixed.shockPct}% · 单位 {comparison.collateral}</p>
  <button disabled={busy||!!error} onClick={()=>run(async()=>{setSaved(null);if(!evidence.current)evidence.current=await api(`/api/evidence?id=${comparison.id}`);setSaved({signature,packet:sizingPacket(evidence.current,limits,settings)});})}>计算预算内规模</button>
  {error&&<p role="alert" className="field-error">{error}</p>}
  {!packet&&saved&&<p role="status" className="tp-note">条件已改变，请重新计算；旧范围已失效。</p>}
  {r&&<div role="status" className="sizing-result">{r.status==='range'?<><strong>模型内目标金额区间：{fmt(r.min.target,2)} – {fmt(r.max.target,2)} {comparison.collateral}</strong><p>{r.reason}。实际成交额可能因盘口价格与数量取整而不同。</p><dl>{[['上界对应数量',r.max.result.size],['保证金预算',r.max.result.margin],['情景净亏损',r.max.decision.scenarioLoss],['估算开平仓及资金费用',r.max.decision.totalCost]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{fmt(value,8)}</dd></div>)}</dl><div className="tp-comparison-actions"><button disabled={busy} onClick={()=>onApplyPlan(r.min.result.input,'预算区间下界')}>带回区间下界</button><button disabled={busy} onClick={()=>onApplyPlan(r.max.result.input,'预算区间上界')}>带回区间上界</button></div></>:<strong>{r.status==='unknown'?'资料不足':r.status==='unset'?'尚未设置预算':'本次搜索无可行规模'}：{r.reason}</strong>}
   {reasons.length>0&&<ul>{reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul>}
   <button onClick={()=>download(packet,`budget-${comparison.id}.json`)}>导出预算搜索证据</button>
  </div>}
  <p className="tp-note">区间仅适用于保存时快照和当前孤立线性模型，不是安全仓位建议或成交承诺。保证金不含额外手续费与 Gas；情景亏损不是最大损失。带回后必须用新行情重新预演。</p>
 </section>;
}
