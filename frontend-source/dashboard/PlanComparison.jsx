import React,{useState} from 'react';
import {EvidencePanel,EvidencePlot,useWorkspace} from '../ui.jsx';
import {alternativePreset,decisionLimits,planDecision,decisionPacket} from '../../server/decision-metrics.mjs';
import {reviewNumber as fmt} from '../review-journeys.mjs';
import './plan-comparison.css';
const labels={unknown:'资料不足，无法判定',model_blocked:'模型条件未通过',over_budget:'超出你的预算',unconstrained:'尚未设置预算',within_budget:'符合已设置的预算'};
const metricFields=[['目标名义金额','requested'],['深度内成交额估算','notional'],['数量覆盖 · %','coveragePct'],['保证金预算','margin'],['开仓费估算','entryFee'],['情景平仓费估算','exitFee'],['资金费用估算（负数为收入）','fundingEstimate'],['交易费 + 资金费用','totalCost'],['所选冲击下价格损益','grossPnl'],['所选冲击下净损益','netPnl'],['情景保证金余量（平仓前）','marginBuffer'],['清算价估算','liquidationEstimate'],['开仓滑点 · bps','slippageBps']];
export function PlanComparison({input,network,marketId,api,run,busy,ready,download,onOpenEvidence,onApplyPlan}){
 const {visible}=useWorkspace();
 const [alternative,setAlternative]=useState(()=>alternativePreset(input,'leverage'));
 const [saved,setSaved]=useState(null),[limits,setLimits]=useState({maxMargin:'',maxLoss:''});
 const signature=JSON.stringify([network,marketId,input,alternative]);
 const comparison=saved?.signature===signature?saved.record:null;
 const change=(key,value)=>setAlternative(v=>({...v,[key]:value}));
 const invalid=[['notional',1,10000000],['leverage',1,100],['hours',0,168]].some(([key,min,max])=>alternative[key]===''||!Number.isFinite(Number(alternative[key]))||Number(alternative[key])<min||Number(alternative[key])>max);
 let limitError='';try{decisionLimits(limits);}catch(e){limitError=e.message;}
 const decision=comparison&&!limitError?planDecision(comparison,limits):null;
 const results=comparison?.results;
 const models=results?.map((r,i)=>({...r,requested:r.input.notional,...(decision?.plans[i]??planDecision(comparison).plans[i])}))??[];
 const rows=metricFields.map(([metric,field])=>({metric,field,a:models[0]?.[field],b:models[1]?.[field]}));
 const sourceRows=models.map((r,i)=>({plan:i===0?'方案 A':'方案 B',network,classification:r.classification,asset:r.asset,collateral:r.collateral,...r.input,
  sizeExact:String(r.size),rawSize:r.rawSize,depthComplete:r.depthComplete,vwap:r.vwap,executedNotionalEstimate:r.notional,
  margin:r.margin,entryFee:r.entryFee,exitFee:r.exitFee,fundingEstimate:r.fundingEstimate,totalCost:r.totalCost,netPnl:r.netPnl,marginBuffer:r.marginBuffer,
  liquidationEstimate:r.liquidationEstimate,slippageBps:r.slippageBps,riskPass:r.riskPass,blockers:r.blockers.join('；'),
  model:r.modelVersion,marketTime:r.observedAt,bookTime:r.bookTime,evaluationTime:comparison.evaluatedAt,
  recordId:comparison.id,inputHash:comparison.inputHash,contextHash:comparison.snapshotHashes.context,bookHash:comparison.snapshotHashes.book}));
 const stress=results?.flatMap((r,i)=>r.stressRows.map(s=>({...s,plan:i===0?'方案 A':'方案 B',...r.input,asset:r.asset,sourceTime:r.observedAt,bookTime:r.bookTime,recordId:comparison.id})))??[];
 const preset=kind=>setAlternative(alternativePreset(input,kind));
 return <section className="tp-comparison-wrap tp-panel">
  <div className="tp-ticket-top"><h2>交易前方案比较</h2><span className="tp-badge">同一行情快照</span></div>
  <p className="tp-note">A 使用当前预演参数；B 可调整规模、杠杆与持有时间。两方案共用方向、价格冲击和滑点上限，分别计算，不合并成投资组合。</p>
  <div className="comparison-presets" aria-label="方案B快捷对照"><button disabled={busy} onClick={()=>preset('half')}>B：仓位减半（最低1）</button><button disabled={busy} onClick={()=>preset('leverage')}>B：只降杠杆</button><button disabled={busy} onClick={()=>preset('same')}>B：恢复与 A 相同</button></div>
  <p className="tp-note">“只降杠杆”保持仓位规模和持有时间不变，杠杆减半且不低于1×；它增加保证金需求，不会自动降低同额仓位的交易费或价格损失。</p>
  <div className="tp-comparison-inputs"><div className="tp-plan-summary"><strong>方案 A · 当前输入</strong><span>{input.direction==='long'?'做多':'做空'} · 名义金额 {input.notional} · {input.leverage}× · {input.hours} 小时</span><small>价格冲击 {input.shockPct}% · 滑点上限 {input.slippageBps} bps</small></div>
  <fieldset disabled={busy}><legend>方案 B · 对照参数</legend><div className="tp-alternative-fields">{[['名义金额','notional',1,10000000],['杠杆倍数','leverage',1,100],['持有小时','hours',0,168]].map(([label,key,min,max])=><label key={key}>{label}<input aria-label={`方案B${label}`} type="number" min={min} max={max} step={key==='leverage'?.5:'any'} value={alternative[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div></fieldset></div>
  <div className="tp-comparison-actions"><button className="tp-primary" disabled={busy||!ready||invalid} onClick={()=>run(async()=>{setSaved(null);const record=await api('/api/compare',{network,marketId,inputs:[input,{...input,...alternative}]});setSaved({signature,record});})}>{busy?'处理中…':'用同一行情比较 A / B'}</button>{comparison&&<button disabled={busy} onClick={()=>run(()=>onOpenEvidence(comparison.id))}>查看原始对比记录</button>}</div>
  {invalid&&<p className="field-error" role="alert">请补全方案 B 的有效金额、杠杆与持有时间。</p>}
  <fieldset className="comparison-budget"><legend>你的判断条件 · 可选</legend><p className="tp-note">以市场抵押代币计价。亏损上限仅用于当前价格情景，不是止损单或最大可能损失；保证金预算不含额外手续费与 Gas。</p><div>{[['保证金预算上限','maxMargin'],['情景净亏损上限','maxLoss']].map(([label,key])=><label key={key}>{label}<input aria-label={label} type="number" min="0" max="1000000000" step="any" placeholder="不设限制" value={limits[key]} onChange={e=>setLimits(v=>({...v,[key]:e.target.value}))}/></label>)}</div>{limitError&&<p className="field-error" role="alert">{limitError}</p>}</fieldset>
  {!comparison&&<p className="tp-note">{saved?'参数已改变，旧对比不再适用。请重新比较。':'运行比较后查看每个方案的成本、压力与预算判定。'}预算修改在本页重算，不请求行情。</p>}
  {comparison&&<>
   <div className="comparison-snapshot"><strong>{comparison.asset} · {comparison.collateral}</strong><span>行情 {new Date(results[0].observedAt).toLocaleString('zh-CN')}</span><span>订单簿 {new Date(results[0].bookTime).toLocaleString('zh-CN')}</span></div>
   <p className="tp-note">以下是保存时快照；后台行情刷新不会改变此表。基础吃单费率与当前资金费率假定保持不变，实际资金费用按离散周期结算。不含 Gas、延迟和订单竞争。</p>
   <div className="comparison-decisions">{models.map((r,i)=><article key={i}><header><strong>方案 {i===0?'A':'B'}</strong><span className={decision?.plans[i].status==='within_budget'?'positive':'warning'}>{limitError?'预算输入无效':labels[decision.plans[i].status]}</span></header><dl><div><dt>保证金预算</dt><dd>{fmt(r.margin)} {r.collateral}</dd></div><div><dt>情景净亏损</dt><dd>{r.depthComplete?fmt(r.scenarioLoss):'未知（深度不足）'} {r.collateral}</dd></div></dl>{decision&&<ul>{decision.plans[i].checks.map(c=><li key={c.key}>{c.label}：{c.status==='unset'?'未设置上限':c.status==='unknown'?'资料不足':`${c.status==='exceeded'?'超出':'未超出'} ${fmt(c.limit)} ${r.collateral}`}</li>)}</ul>}{r.blockers.length>0&&<ul className="tp-blockers">{r.blockers.map(b=><li key={b}>{b}</li>)}</ul>}<button disabled={busy} onClick={()=>onApplyPlan({...r.input},i===0?'A':'B')}>将方案 {i===0?'A':'B'} 带回预演</button></article>)}</div>
   <p className="tp-note">符合预算不表示推荐或可以成交。带回仅更新参数，须重新运行风险分析才能保存新的事前基线。</p>
   {visible('tp-plan-comparison')&&<EvidencePanel id="tp-plan-comparison" queryId="comparisons" title="规模、成本与压力对照" kind="table" displayRows={rows} sourceRows={sourceRows}><div className="comparison-table-scroll"><table className="tp-comparison-table" aria-label="两个交易方案的成本与风险" data-reviewed-rows><thead><tr><th scope="col">指标</th><th scope="col">方案 A</th><th scope="col">方案 B</th><th scope="col">B − A</th></tr></thead><tbody>{rows.map(r=><tr key={r.field}><th scope="row">{r.metric}</th><td>{fmt(r.a,8)}</td><td>{fmt(r.b,8)}</td><td className="delta">{r.a==null||r.b==null?'—':fmt(r.b-r.a,8,{signed:true})}</td></tr>)}</tbody></table></div></EvidencePanel>}
   <p className="tp-note">深度不足时，费用与损益只对应订单簿内可覆盖的数量，不代表目标规模；预算判定保持未知。情景保证金余量是平仓前权益减估算维持额，未扣未来平仓费。</p>
   {visible('tp-comparison-stress')&&<EvidencePlot id="tp-comparison-stress" queryId="comparisons" title={`价格冲击后估算净值 · ${comparison.collateral}`} rows={stress} sourceRows={stress} height={230} spec={{type:'line',x:'changePct',y:'equity',series:'plan',showLegend:true,showXAxisLabel:true,xLabel:'价格变化 (%)',showYAxisLabel:true,yLabel:comparison.collateral,stackable:false}} description="净值=保证金预算+扣费后损益，包含预计平仓费。静态情景不模拟提前清算；穿过阈值后的数值不代表可实现结果，也不是收益预测。"/>}
   <div className="tp-comparison-actions"><button disabled={busy||!!limitError} onClick={()=>run(async()=>{const evidence=await api(`/api/evidence?id=${comparison.id}`);download(decisionPacket(evidence,limits),`decision-${comparison.id}.json`);})}>导出方案与预算证据</button><button disabled={busy} onClick={()=>run(async()=>download(await api(`/api/evidence?id=${comparison.id}`),`${comparison.id}.json`))}>仅导出原始比较</button></div><p className="tp-record-id">记录 <code>{comparison.id}</code> · 预算仅随本机导出，不上传。</p>
  </>}
 </section>;
}
