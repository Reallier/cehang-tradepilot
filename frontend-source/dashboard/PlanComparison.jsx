import React,{useEffect,useState} from 'react';
import {DataComponent,EvidenceChart,useDataApp} from '../../data-app-public.jsx';
const fmt=(v,d=6)=>v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:d});
const metrics=[['保证金预算','margin'],['开仓费估算','entryFee'],['平仓费估算','exitFee'],['资金费用估算（负数为收入）','fundingEstimate'],['所选冲击下净损益','netPnl'],['清算价估算','liquidationEstimate'],['开仓滑点 · bps','slippageBps']];
export function PlanComparison({input,network,marketId,api,run,busy,ready,download,onOpenEvidence}){
  const {visible}=useDataApp();
  const [alternative,setAlternative]=useState({notional:input.notional,leverage:1,hours:6});
  const [comparison,setComparison]=useState(null);
  useEffect(()=>setComparison(null),[input]);
  const change=(key,value)=>{setAlternative(v=>({...v,[key]:value}));setComparison(null);};
  const results=comparison?.results,rows=results?metrics.map(([metric,field])=>({metric,field,a:results[0][field],b:results[1][field]})):[];
  const sourceRows=results?.map((r,i)=>({plan:i===0?'方案 A':'方案 B',network,classification:r.classification,asset:r.asset,collateral:r.collateral,...r.input,
    sizeExact:String(r.size),rawSize:r.rawSize,depthComplete:r.depthComplete,vwap:r.vwap,executedNotionalEstimate:r.notional,
    margin:r.margin,entryFee:r.entryFee,exitFee:r.exitFee,fundingEstimate:r.fundingEstimate,netPnl:r.netPnl,
    liquidationEstimate:r.liquidationEstimate,slippageBps:r.slippageBps,riskPass:r.riskPass,blockers:r.blockers.join('；'),
    model:r.modelVersion,marketTime:r.observedAt,bookTime:r.bookTime,evaluationTime:comparison.evaluatedAt,
    marketTimeMs:Date.parse(r.observedAt),bookTimeMs:Date.parse(r.bookTime),recordId:comparison.id,inputHash:comparison.inputHash,
    contextHash:comparison.snapshotHashes.context,bookHash:comparison.snapshotHashes.book}))??[];
  const stress=results?.flatMap((r,i)=>r.stressRows.map(s=>({...s,plan:i===0?'方案 A':'方案 B',...r.input,asset:r.asset,sourceTime:r.observedAt,bookTime:r.bookTime,recordId:comparison.id})))??[];
  return <section className="tp-comparison-wrap tp-panel">
    <div className="tp-ticket-top"><h2>同一份行情，比较两个方案</h2><span className="tp-badge">风险预演</span></div>
    <p className="tp-note">方案 A 使用交易预演中的输入。两方案共用方向、价格冲击和滑点上限，分别计算，不合并为投资组合。</p>
    <p className="tp-note">名义金额是总仓位规模，保证金预算是预估成交额÷杠杆。其余条件相同时，只改变杠杆会改变保证金与清算估算，不会自动放大同额仓位的交易费或价格损益。</p>
    <div className="tp-comparison-inputs">
      <div className="tp-plan-summary"><strong>方案 A · 当前输入</strong><span>{input.direction==='long'?'做多':'做空'} · 名义金额 {input.notional} · {input.leverage} 倍 · {input.hours} 小时</span><small>价格冲击 {input.shockPct}% · 滑点上限 {input.slippageBps} bps</small></div>
      <fieldset disabled={busy}><legend>方案 B</legend><div className="tp-alternative-fields">{[['名义金额','notional',1,10000000],['杠杆倍数','leverage',1,100],['持有小时','hours',0,168]].map(([label,key,min,max])=><label key={key}>{label}<input aria-label={`方案B${label}`} type="number" min={min} max={max} step={key==='leverage'?.5:1} value={alternative[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div></fieldset>
    </div>
    <div className="tp-comparison-actions"><button className="tp-primary" disabled={busy||!ready} onClick={()=>run(async()=>{setComparison(null);setComparison(await api('/api/compare',{network,marketId,inputs:[input,{...input,...alternative}]}));})}>{busy?'处理中…':'用同一行情对比'}</button><button disabled={busy} onClick={()=>{setAlternative({notional:input.notional,leverage:input.leverage,hours:input.hours});setComparison(null);}}>将 B 重置为 A</button>{comparison&&<><button disabled={busy} onClick={()=>run(async()=>download(await api(`/api/evidence?id=${comparison.id}`),`${comparison.id}.json`))}>下载对比证据</button><button disabled={busy} onClick={()=>run(()=>onOpenEvidence(comparison.id))}>查看此对比记录</button></>}</div>
    {comparison&&<>
      <p className="tp-note">{comparison.asset} · {comparison.collateral} 计价 · 行情 {new Date(results[0].observedAt).toLocaleString('zh-CN')} · 订单簿 {new Date(results[0].bookTime).toLocaleString('zh-CN')}。保存时的行情，刷新不会覆盖此结果；清算价为孤立仓位估算。</p>
      <p className="tp-record-id" data-reviewed-rows>保存记录 <code>{comparison.id}</code></p>
      <p className="tp-note" data-reviewed-rows>费用采用公开吃单基础档；资金费用假定当前费率在各自持有时间内保持不变，按时间比例估算，实际按离散周期结算。未知值为「—」，不能当作0。</p>
      <div className="tp-comparison-status" data-reviewed-rows>{results.map((r,i)=><div key={i}><strong>方案 {i===0?'A':'B'}</strong><span className={`tp-badge ${r.riskPass?'tp-safe':'tp-warning'}`}>{r.riskPass?'模型检查通过':'存在风险阻断'}</span>{r.blockers.length>0&&<ul className="tp-blockers">{r.blockers.map(b=><li key={b}>{b}</li>)}</ul>}</div>)}</div>
      {visible('tp-plan-comparison')&&<DataComponent id="tp-plan-comparison" queryId="comparisons" title="成本与风险对照" kind="table" displayRows={rows} sourceRows={sourceRows}><table className="tp-comparison-table" aria-label="两个交易方案的成本与风险" data-reviewed-rows><thead><tr><th scope="col">指标</th><th scope="col">方案 A</th><th scope="col">方案 B</th></tr></thead><tbody>{rows.map(r=><tr key={r.field}><th scope="row">{r.metric}</th><td>{fmt(r.a,r.field==='liquidationEstimate'?2:6)}</td><td>{fmt(r.b,r.field==='liquidationEstimate'?2:6)}</td></tr>)}</tbody></table></DataComponent>}
      {visible('tp-comparison-stress')&&<EvidenceChart id="tp-comparison-stress" queryId="comparisons" title={`价格冲击后估算净值 · ${comparison.collateral}`} rows={stress} sourceRows={stress} height={230} spec={{type:'line',x:'changePct',y:'equity',series:'plan',showLegend:true,showXAxisLabel:true,xLabel:'价格变化 (%)',showYAxisLabel:true,yLabel:comparison.collateral,stackable:false}} description="净值=保证金预算+扣费后损益，包含预计平仓费。静态情景不模拟提前清算，也不代表收益预测。"/>}
      <p className="tp-note">净值是保证金预算加扣费后损益，包含预计平仓费。压力图是静态假设，不模拟提前清算；穿过清算估算后的图上数值不代表可实现收益。模型检查通过不代表实际可成交。</p>
    </>}
  </section>;
}
