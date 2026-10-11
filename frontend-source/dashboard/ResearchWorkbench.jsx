import {TestnetPlan} from './TestnetPlan.jsx';
import {createResearchClient} from '../research-client.mjs';
import {ResearchLocalSave} from './ResearchLocalSave.jsx';
import {mergeResearchFiles} from '../research-merge.mjs';
import {ResearchProgress} from './ResearchProgress.jsx';
import {RESEARCH_COMPARISON_SCHEMA,researchComparisonPacket,replayResearchComparison} from '../research-comparison.mjs';
import {ResearchComparison} from './ResearchComparison.jsx';
import {receiptTargetForJourney} from '../../server/receipt-selection.mjs';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {EXPERIMENT_TYPES,emptyResearch,newExperiment,researchReport,researchPacket,parseResearchFile,attachResearchEvidence,MAX_RESEARCH_BYTES} from '../research-workspace.mjs';
import {TradeReview} from './TradeReview.jsx';
import './research.css';
const states={unsupported:'待扩展核验',needs_baseline:'待事前基线',direction_mismatch:'方向不一致',needs_trade:'待成交材料',needs_selection:'请选择成交',needs_evidence:'证据不足',baseline_mismatch:'基线未匹配',verified:'文件核验通过',partial:'部分退出',needs_exit:'待退出证据'};
export function ResearchWorkbench({active,api,download,currentBaseline,onPrepare}){
 const [workspace,setWorkspace]=useState(emptyResearch),[selected,setSelected]=useState(null),[kind,setKind]=useState('short_full'),[drafts,setDrafts]=useState({}),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[mergeSummary,setMergeSummary]=useState(null);
 const generation=useRef(0),client=useRef(null),[analysis,setAnalysis]=useState(()=>({report:researchReport(emptyResearch()),comparison:null})),report=analysis.report,experiment=workspace.experiments.find(e=>e.id===selected),row=report.rows.find(r=>r.id===selected);
 const draft=experiment?(drafts[experiment.id]??{title:experiment.title,purpose:experiment.purpose,notes:experiment.notes}):null;
 const current=useMemo(()=>({experiments:workspace.experiments.map(e=>({...e,...drafts[e.id]}))}),[workspace,drafts]);
 const withDrafts=()=>current;
 useEffect(()=>{client.current=createResearchClient();return()=>{generation.current++;client.current.cancel();};},[]);
 function setDraft(value){setMergeSummary(null);setDrafts(d=>({...d,[selected]:value}));setDirty(true);}
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function select(e){setMergeSummary(null);setSelected(e?.id??null);setError('');}
 async function compute(next,token,operation='evaluate',extra={}){
  const result=await client.current.call(operation,{workspace:next,...extra});if(token!==generation.current)return null;
  setWorkspace(result.workspace);setDrafts({});setAnalysis({report:result.report,comparison:result.comparison});setDirty(true);return result;
 }
 async function replace(e,token){return compute({experiments:current.experiments.map(x=>x.id===e.id?{...e,...drafts[e.id]}:x)},token);}
 async function add(e,token){if(await compute({experiments:[...current.experiments,e]},token))select(e);}
 async function exportWorkspace(token){const packet=await client.current.call('export',{workspace:current});if(token!==generation.current)return;download(packet,'tradepilot-testnet-research.json');setDirty(false);}
 async function action(fn){const token=++generation.current;setBusy(true);setMergeSummary(null);setError('');try{await fn(token);}catch(e){if(token===generation.current)setError(e.message);}finally{if(token===generation.current)setBusy(false);}}
 async function restore(raw,token){const result=await compute(current,token,'restore',{raw});if(result){setDirty(false);select(result.workspace.experiments[0]);}}
 async function readFile(event,archive){const file=event.target.files?.[0];event.target.value='';if(!file)return;await action(async token=>{if(file.size>MAX_RESEARCH_BYTES)throw new Error('文件超过8MB');const raw=await file.text();if(token!==generation.current)return;if(new TextEncoder().encode(raw).length>MAX_RESEARCH_BYTES)throw new Error('文件超过8MB');if(archive)await restore(raw,token);else{if(!experiment)throw new Error('请先创建实验');await compute(current,token,'attach',{id:experiment.id,packet:JSON.parse(raw)});}});}
 async function mergeFiles(event){
  const files=Array.from(event.target.files??[]);event.target.value='';if(!files.length)return;
  await action(async token=>{
   if(files.length>20)throw new Error('每批最多选择20个档案');
   if(files.reduce((sum,f)=>sum+f.size,0)>MAX_RESEARCH_BYTES)throw new Error('本批档案总计超过8MB，请分批导入');
   const raws=[];let bytes=0;
   for(const file of files){const raw=await file.text();if(token!==generation.current)return;bytes+=new TextEncoder().encode(raw).length;if(bytes>MAX_RESEARCH_BYTES)throw new Error('本批档案总计超过8MB，请分批导入');raws.push(raw);}
   const result=await compute(current,token,'merge',{raws});if(result){setSelected(selected??result.workspace.experiments[0]?.id??null);setMergeSummary(result.summary);}
  });
 }
 async function example(){await action(async token=>{const packet=await api('/api/guided-review');if(token!==generation.current)return;const e=newExperiment('long_full');e.title='多头完整流程 · 合成示例';const result=await compute({experiments:[...current.experiments,e]},token,'attach',{id:e.id,packet});if(result)select(result.workspace.experiments.at(-1));});}
 return <section hidden={!active} className="research-workspace" aria-label="测试网实验台">
 <header className="tp-panel"><span className="eyebrow">TESTNET RESEARCH / MONAD 10143</span><h1>测试网实验台</h1><p>每轮实验留下目的、事前基线、成交证据和复盘。覆盖数量按独立成交去重，合成案例单独统计。</p><p className="tp-note">文件仅在页面内存中复算，不上传；默认不自动保存，可在下方启用本机快照。草稿切换实验时保留在本页，刷新前请导出或检查快照；导出文件可能包含钱包和交易记录，请私下保管。文件通过不认证来源或当前链状态，也不证明策略收益。</p>
 <div className="research-actions"><button disabled={busy||!workspace.experiments.length} onClick={()=>action(exportWorkspace)}>导出研究工作区</button><label className="research-file">恢复工作区（替换本页）<input aria-label="恢复研究工作区" type="file" accept=".json,application/json" disabled={busy} onChange={e=>readFile(e,true)}/></label><label className="research-file">合并研究档案（可多选）<input aria-label="合并研究档案" type="file" multiple accept=".json,application/json" disabled={busy} onChange={mergeFiles}/></label><button onClick={()=>{setMergeSummary(null);generation.current++;client.current.cancel();setAnalysis({report:researchReport(emptyResearch()),comparison:null});setWorkspace(emptyResearch());setDrafts({});setDirty(false);select(null);setBusy(false);}}>清空实验台</button></div></header>
 {mergeSummary&&<p className="tp-note" role="status">合并完成：{mergeSummary.files}个档案，新增{mergeSummary.added}轮，跳过{mergeSummary.existing}条相同实验，当前共{mergeSummary.total}轮。当前草稿已保留；新增记录需导出保存。</p>}
 {busy&&<p className="tp-note" role="status">正在读取并复算材料；清空实验台可取消本次导入。</p>}
 {dirty&&<p className="tp-note" role="status">有尚未导出的研究更改；导出会包含当前文字草稿。</p>}
 {error&&<p role="alert" className="tp-alert">{error}</p>}
 <section className="tp-panel"><h2>实验覆盖</h2><div className="table-scroll"><table className="plain-table"><thead><tr><th>实验类型</th><th>测试网文件核验</th><th>合成核验</th><th>核验能力</th></tr></thead><tbody>{report.coverage.map(c=><tr key={c.kind}><td>{EXPERIMENT_TYPES.find(t=>t.id===c.kind).label}</td><td>{c.savedTestnet}</td><td>{c.synthetic}</td><td>{c.supported?'单次开仓 / 退出核验':'待扩展，不能判定通过'}</td></tr>)}</tbody></table></div></section>
 <TestnetPlan download={download} busy={busy} onImport={raw=>action(async token=>{const r=await compute(current,token,'merge',{raws:[raw]});if(r){setSelected(selected??r.workspace.experiments[0]?.id??null);setMergeSummary(r.summary);}})}/>
 <ResearchLocalSave workspace={current} busy={busy} onRestore={raw=>action(token=>restore(raw,token))}/>
 <ResearchComparison report={analysis.comparison} workspace={workspace} busy={busy} onSelect={id=>select(workspace.experiments.find(e=>e.id===id))} onExport={()=>action(async token=>{const packet=await client.current.call('comparison',{workspace:current});if(token===generation.current)download(packet,'tradepilot-research-comparison.json');})}/>
 <div className="research-grid"><aside className="tp-panel"><h2>实验记录 · {report.experiments}/20</h2><label>新实验类型<select aria-label="新实验类型" value={kind} disabled={busy} onChange={e=>setKind(e.target.value)}>{EXPERIMENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}{t.supported?'':' · 待扩展'}</option>)}</select></label><div className="research-actions"><button disabled={busy||report.experiments>=20} onClick={()=>action(token=>add(newExperiment(kind),token))}>创建实验</button><button disabled={busy||report.experiments>=20} onClick={example}>添加合成示例</button></div><div className="research-list">{workspace.experiments.map(e=>{const r=report.rows.find(r=>r.id===e.id);return <button key={e.id} disabled={busy} aria-pressed={e.id===selected} onClick={()=>select(e)}><strong>{e.title||'未命名实验'}</strong><small>{states[r.state]} · {r.source==='synthetic'?'合成':r.source==='saved_testnet'?'测试网文件':'无成交材料'}{r.duplicate?' · 重复成交不增计':''}</small></button>;})}</div></aside>
 <section className="tp-panel">{!experiment?<div className="tp-empty">先创建一轮实验，记录这次要验证的问题。</div>:<><h2>{experiment.title}</h2><button disabled={busy} onClick={()=>action(async token=>{if(await compute({experiments:current.experiments.filter(e=>e.id!==selected)},token))select(null);})}>移除此实验</button><label>实验名称<input aria-label="实验名称" value={draft.title} maxLength={120} disabled={busy} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>验证目的<textarea aria-label="验证目的" value={draft.purpose} maxLength={800} disabled={busy} onChange={e=>setDraft({...draft,purpose:e.target.value})}/></label><label>复盘备注<textarea aria-label="复盘备注" value={draft.notes} maxLength={2000} disabled={busy} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><button disabled={busy} onClick={()=>action(token=>replace({...experiment,...draft},token))}>保存实验说明</button><p className="tp-note">文字草稿随实验保留在本页，导出会包含草稿。保存说明可将草稿合并到实验；刷新前仍需导出。</p>
 <ResearchProgress experiment={experiment} row={row} active={active}/><h3>关联证据 · {states[row.state]}</h3><div className="research-actions"><button disabled={busy||!currentBaseline} onClick={()=>action(token=>compute(current,token,'attach',{id:experiment.id,packet:currentBaseline}))}>关联最近保存的基线</button><label className="research-file">导入基线 / 成交 / 复盘<input aria-label="关联实验材料" type="file" accept=".json,application/json" disabled={busy} onChange={e=>readFile(e,false)}/></label></div>
 <p className="tp-note">{experiment.baseline?'已关联事前基线':'尚无事前基线'} · {experiment.trade?'已关联成交文件':'尚无成交文件'}。缺失回执、方向不符或未完成退出都会保留待核验状态。</p>
 {!!row.choices.length&&<label>核验哪次开仓<select aria-label="选择实验成交" disabled={busy} value={experiment.journeyId??''} onChange={e=>action(token=>replace({...experiment,journeyId:e.target.value||null},token))}><option value="">请选择</option>{row.choices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
 {row.duplicate&&<p className="tp-alert">此成交被多个实验引用，覆盖数量只计一次。</p>}
 {['short_full','long_full','partial'].includes(experiment.kind)&&<button disabled={busy} onClick={()=>onPrepare(experiment.kind==='partial'?'long_full':experiment.kind)}>准备{experiment.kind==='short_full'?'空头':'多头'}预演（1× / 不利5%情景）</button>}
 <ol className="tp-checklist"><li>使用 Monad Testnet（10143）的测试账户和测试代币。</li><li>在交易前运行新预演并保存基线；按基线有效期完成开仓，过期后重新预演。</li><li>在官方测试网页面自行确认交易；完成全量退出后，用只读工具采集历史和回执。</li><li>导入材料并选择对应开仓，检查预估偏差和结算。一次只验证一个生命周期。</li></ol>
 <p className="tp-note">每次最多采集4笔回执。已选择开仓时可导出采集目标，在本机只读工具使用 --target 文件路径，优先获取本次开平仓回执；其余历史仍完整保留用于核验。没有所需历史行或目标超过上限时停止，不能判定通过。</p>{row.journey&&<button disabled={busy} onClick={()=>action(()=>download(receiptTargetForJourney(row.journey),'tradepilot-receipt-target.json'))}>导出本实验采集目标</button>}{experiment.trade?.report.opening.targetReceiptCoverage&&<p className="tp-note">定向采集：{experiment.trade.report.opening.targetReceiptCoverage.receiptsAvailable?'目标回执已返回':'目标回执缺失'} · {experiment.trade.report.opening.targetReceiptCoverage.historyComplete?'历史分页完整':'历史仍有截断'}。回执返回不等于成交核验通过；未选中的其他交易可能显示缺失回执。</p>}
 {experiment.trade&&<TradeReview trade={experiment.trade} baseline={experiment.baseline} download={download}/>}</> }</section></div></section>;
}
