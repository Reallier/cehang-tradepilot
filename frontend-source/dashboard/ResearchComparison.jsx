import React,{useMemo,useState} from 'react';
import {compareResearch,COMPARISON_METRICS} from '../research-comparison.mjs';
import {reviewNumber as num} from '../review-journeys.mjs';
const sourceName=s=>s==='synthetic'?'合成示例':'测试网文件';
export function ResearchComparison({workspace,onSelect,onExport,busy}){
 const report=useMemo(()=>compareResearch(workspace),[workspace]),[selected,setSelected]=useState('');
 const group=report.groups.find(g=>g.id===selected)??report.groups[0];
 const rows=report.rows.filter(r=>r.included&&r.groupId===group?.id),excluded=report.rows.filter(r=>!r.included);
 return <section className="tp-panel research-comparison" aria-label="跨实验对比">
 <div className="research-actions"><h2>跨实验对比</h2><button disabled={busy||!workspace.experiments.length} onClick={onExport}>导出跨实验对比</button></div>
 <p className="tp-note">纳入 {report.included} 个去重生命周期 · 排除 {report.excluded} 轮实验 · {report.groups.length} 个口径分组。分析仅在本页复算，不发起网络请求。</p>
 {!group?<p className="tp-empty">先关联事前基线与完整开平仓证据。至少两笔不同成交落在同一口径分组，才能进行组内对比。</p>:<>
 <label>比较分组<select aria-label="比较分组" value={group.id} onChange={e=>setSelected(e.target.value)}>{report.groups.map((g,i)=><option key={g.id} value={g.id}>{i+1}. {sourceName(g.key.source)} · {g.asset} {g.key.direction} · {g.count} 笔 · 情景 {g.key.shockPct}% / {g.key.hours}h</option>)}</select></label>
 <p className="tp-note">{sourceName(group.key.source)} · {group.asset} / {group.unit} · {group.key.direction} · 账户 #{group.key.accountId} · {group.key.model} · 费率 {num(group.key.feeBps)} bps · 情景 {group.key.shockPct}% / {group.key.hours}h。账户、合约、方向、模型、费用和风险情景不同会分组。</p>
 <p role="status">{group.comparable?'可作描述性比较；不同交易时点仍会影响结果。':'仅 1 笔样本，暂无组内差异可比较。'}</p>
 <div className="table-scroll"><table className="plain-table"><caption>组内统计 · 每笔等权，不按交易规模加权</caption><thead><tr><th>指标</th><th>样本</th><th>均值</th><th>中位数</th><th>最小</th><th>最大</th></tr></thead><tbody>{COMPARISON_METRICS.map(m=>{const v=group.metrics[m.key];return <tr key={m.key}><td>{m.label} ({m.unit})</td><td>{v.n}</td>{['mean','median','min','max'].map(k=><td key={k}>{num(v[k],4)}</td>)}</tr>;})}</tbody></table></div>
 <div className="table-scroll"><table className="plain-table"><caption>逐笔比较 · 点击实验返回证据</caption><thead><tr><th>实验</th><th>开仓时间 (UTC)</th><th>名义金额 ({group.unit})</th><th>杠杆</th><th>持有 (秒)</th><th>不利偏差 (bps)</th><th>双边费用 ({group.unit})</th><th>资金损益 ({group.unit})</th><th>净损益 ({group.unit})</th><th>压力缓冲 (%)</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><button onClick={()=>onSelect(r.id)}>{r.title||'未命名实验'}</button></td><td>{new Date(r.sample.openedAt).toISOString()}</td><td>{num(r.sample.notional)}</td><td>{num(r.sample.leverage)}×</td><td>{num(r.sample.durationMs/1000)}</td><td>{num(r.sample.adverseBps,4)}</td><td>{num(r.sample.entryFee+r.sample.exitFee)}</td><td>{num(r.sample.funding)}</td><td>{num(r.sample.net)}</td><td>{num(r.sample.stressBufferPct,4)}</td></tr>)}</tbody></table></div>
 </>}
 {!!excluded.length&&<details><summary>查看 {excluded.length} 轮未纳入实验及原因</summary><ul>{excluded.map(r=><li key={r.id}><button onClick={()=>onSelect(r.id)}>{r.title||'未命名实验'}</button> — {r.reason}</li>)}</ul></details>}
 <p className="tp-note">{report.note}</p></section>;
}
