import React,{useEffect,useState} from 'react';
import {EvidencePanel} from '../ui.jsx';
const fmt=(value,digits=6)=>value===null||value===undefined?'—':Number(value).toLocaleString('en-US',{maximumFractionDigits:digits});
const states={unavailable:'证据尚不完整',mismatch:'核对未通过',rechecked:'保存的证据一致',no_fill:'核对到零成交'};
const coverage={unknown:'未知',full:'全部',partial:'部分',zero:'零成交'};
export function ExecutionAudit({api,run,busy,download}){
 const [catalog,setCatalog]=useState(null),[mode,setMode]=useState('examples'),[selected,setSelected]=useState('full'),[packet,setPacket]=useState(null),[error,setError]=useState('');
 async function refresh(){try{setCatalog(await api('/api/execution-audit'));setError('');}catch(e){setError(e.message);}}
 useEffect(()=>{refresh();},[]);
 const options=catalog?.[mode]??[],report=packet?.report,synthetic=packet?.classification==='synthetic_execution_audit';
 function switchMode(value){setMode(value);setSelected(value==='examples'?'full':'');setPacket(null);}
 const sourceRows=report?.rows.map(row=>({...row,estimatedExact:row.estimated===null?null:`${row.estimated} ${row.unit}`,observedExact:row.observed===null?null:`${row.observed} ${row.unit}`,deltaExact:row.delta===null?null:`${row.delta} ${row.unit}`,classification:report.classification,sourceId:report.sourceId,chainId:report.chainId,
  asset:report.asset,collateral:report.collateral,status:report.status,baselineReproduced:report.baselineReproduced,receiptConsistent:report.receiptConsistent,
  fillCoverage:report.fillCoverage,intentHash:packet.intentHash,reportHash:packet.reportHash,...report.execution,
  feeDeltaExact:report.execution?`${report.execution.feeDelta} ${report.collateral}`:null,
  feePriceComponentExact:report.execution?`${report.execution.feePriceComponent} ${report.collateral}`:null,
  feeResidualExact:report.execution?`${report.execution.feeResidual} ${report.collateral}`:null}))??[];
 return <section className="tp-audit">
 <div className="tp-panel"><div className="tp-ticket-top"><h2>从预演，到执行核对</h2><span className="tp-badge tp-safe">本地分析 · 不发单</span></div><p>对照提交前保存的行情、模型与订单回执，检查开仓数量、成交价格和费用。缺失证据保持未知。</p>
 <div className="tp-comparison-actions"><button disabled={busy} aria-pressed={mode==='records'} onClick={()=>switchMode('records')}>已保存订单</button><button disabled={busy} aria-pressed={mode==='examples'} onClick={()=>switchMode('examples')}>合成案例演练</button><button disabled={busy} onClick={refresh}>刷新证据列表</button></div>
 {mode==='examples'&&<div role="status" className="tp-alert">合成数据：用于检查产品流程和异常处理，没有真实账户、网络交易或链上成交，不计入交易量与用户规模。</div>}
 {mode==='records'&&catalog&&!options.length?<div className="tp-empty">尚无本应用的订单记录。可以切换「合成案例演练」检查流程；实际链端验收放到最后完成。</div>:<label>选择核对证据<select aria-label="执行核对证据" disabled={busy} value={selected} onChange={e=>{setSelected(e.target.value);setPacket(null);}}><option value="">请选择</option>{options.map(o=><option key={o.id} value={o.id}>{o.label??`${o.asset} · ${new Date(o.createdAt).toLocaleString('zh-CN')} · ${o.status}`}</option>)}</select></label>}
 <div className="tp-comparison-actions"><button className="tp-primary" disabled={busy||!selected} onClick={()=>run(async()=>{setPacket(null);setPacket(await api(`/api/execution-audit?${mode==='examples'?'example':'id'}=${encodeURIComponent(selected)}`));})}>{busy?'处理中…':'生成本地核对'}</button>{packet&&<button onClick={()=>download(packet,`${report.sourceId}-execution-audit.json`)}>导出核对证据</button>}</div>{error&&<p role="alert">{error}</p>}
 </div>
 {report&&<>
 <div className="tp-panel"><div className="tp-ticket-top"><h2>{synthetic?'合成演练结果':'保存证据核对结果'}</h2><span className={`tp-badge ${report.receiptConsistent?'tp-safe':'tp-warning'}`}>{states[report.status]??report.status}</span></div><p className="tp-note">本报告的证据网络：Chain {report.chainId??'未知'} · {report.asset??'未知资产'} / {report.collateral??'未知抵押代币'}。{report.note}</p>
 <div className="tp-audit-summary" data-reviewed-rows><div><small>成交覆盖</small><strong>{coverage[report.fillCoverage]}{report.execution?` · ${fmt(report.execution.fillRatio*100,2)}%`:''}</strong></div><div><small>成交价格差额成本</small><strong>{fmt(report.execution?.adversePriceCost)} {report.collateral}</strong></div><div><small>同数量费用差额</small><strong>{fmt(report.execution?.feeDelta)} {report.collateral}</strong></div></div><p className="tp-note">差额成本为正表示增加支出，为负表示减少支出；对比只覆盖本笔开仓。资金结算与已实现损益仍为未知。</p>
 {!!report.rows.length&&<EvidencePanel id="tp-execution-audit" queryId="executionAudit" title="预估与回执对照" kind="table" displayRows={report.rows} sourceRows={sourceRows}><table className="tp-comparison-table tp-audit-table" aria-label="预估与保存回执的数量价格费用对照" data-reviewed-rows><thead><tr><th scope="col">指标 / 单位</th><th scope="col">预估</th><th scope="col">{synthetic?'合成回执':'回执核对'}</th><th scope="col">差额</th></tr></thead><tbody>{report.rows.map(row=><tr key={row.id}><th scope="row">{row.label}<small className="tp-audit-unit">{row.unit}</small></th><td>{fmt(row.estimated)}</td><td>{fmt(row.observed)}</td><td>{fmt(row.delta)}</td></tr>)}</tbody></table></EvidencePanel>}
 {report.fillCoverage==='partial'&&<p className="tp-alert">仅按已成交数量对照名义金额和费用；剩余数量没有被当成成交。</p>}
 {!report.receiptConsistent&&report.apiObservation&&<p className="tp-note" data-reviewed-rows>待核对的协议观察：数量 {fmt(report.apiObservation.size)} {report.asset}，均价 {fmt(report.apiObservation.vwap)}，费用 {fmt(report.apiObservation.fee)} {report.collateral}。这些值未填入回执核对列。</p>}
 {report.execution&&<dl className="tp-audit-details" data-reviewed-rows><div><dt>API观察与记录创建的时间差</dt><dd>{fmt(report.execution.observedDelayMs,0)} ms</dd></div><div><dt>费用中的价格变化分量</dt><dd>{fmt(report.execution.feePriceComponent)} {report.collateral}</dd></div><div><dt>剩余费用差额（未作原因判断）</dt><dd>{fmt(report.execution.feeResidual)} {report.collateral}</dd></div></dl>}
 </div>
 <div className="tp-panel"><h2>证据检查与范围</h2><ul className="tp-checklist" data-reviewed-rows>{report.checks.map(c=><li key={c.id}><strong>{c.status==='passed'?'已通过':'未通过'} · {c.label}</strong><span>{c.detail}</span></li>)}</ul>{report.limitations&&<ul className="tp-roadmap">{report.limitations.map(l=><li key={l}>{l}</li>)}</ul>}<p className="tp-note">{report.sourceId} · 保存证据哈希 {packet.intentHash}</p></div>
 </>}
 </section>;
}
