import {PortfolioScenarios} from './PortfolioScenarios.jsx';
import {AccountUpdates} from './AccountUpdates.jsx';
import {PortfolioRisk} from './PortfolioRisk.jsx';
import {portfolioExample} from '../../server/portfolio-example.mjs';
import {prepareEvidence,parseEvidence} from '../evidence-import.mjs';
import {importFailure} from '../evidence-guidance.mjs';
import {EvidenceFileGuide,GuidanceItem} from './EvidenceGuidance.jsx';
import React,{useState,useRef,useEffect,useMemo,useImperativeHandle} from 'react';
import {reviewProgress} from '../review-progress.mjs';
import {Upload,Download,ShieldCheck,ArrowRight,RefreshCw} from 'lucide-react';
import {positionScenario,reviewObservation} from '../account-workflow.mjs';
import {EvidencePlot} from '../ui.jsx';
import {fmt,time} from './Workbench.jsx';
import './account-workbench.css';
import {TradeReview} from './TradeReview.jsx';
export function AccountWorkbench({active,api,download,tick,onMarket,onProgress,ref}){
 const [packet,setPacket]=useState(null),[selected,setSelected]=useState(''),[view,setView]=useState('positions'),[shock,setShock]=useState(-10),[error,setError]=useState(''),[busy,setBusy]=useState(false),[origin,setOrigin]=useState('');
 const [importStatus,setImportStatus]=useState('');
 const [clearEpoch,setClearEpoch]=useState(0);
 const [portfolioShock,setPortfolioShock]=useState(-10),[advancedScenario,setAdvancedScenario]=useState(null);
 const [trade,setTrade]=useState(null),[baseline,setBaseline]=useState(null);
 const file=useRef(null),attempt=useRef(0),loaded=useRef(false);
 function clearPage(){
  attempt.current++;loaded.current=true;
  setAdvancedScenario(null);setPacket(null);setTrade(null);setBaseline(null);setError('');setImportStatus('');setBusy(false);
  setSelected('');setView('positions');setShock(-10);setPortfolioShock(-10);setOrigin('');
  setClearEpoch(v=>v+1);
 }
 function applyImport(result,from,id){
  if(id!==attempt.current)return;
  if(result.kind==='baseline'){setBaseline(result.baseline);setView('review');setImportStatus(result.label);return;}
  setAdvancedScenario(result.advancedScenario??null);setPacket(result.observation);setTrade(result.trade);setBaseline(result.replaceBaseline?result.baseline:baseline);setPortfolioShock(result.shock);setShock(result.shock);setSelected(result.selection);setView(result.view);setOrigin(from);setImportStatus(result.label);
 }
 async function accept(p,from,id){applyImport(await prepareEvidence(p),from,id);}
 async function example(){const id=++attempt.current;setBusy(true);setError('');try{await accept(await api('/api/guided-review'),'内置合成案例',id);}catch(e){if(id===attempt.current)setError(importFailure(e));}finally{if(id===attempt.current)setBusy(false);}}
 async function portfolioDemo(){const id=++attempt.current;setBusy(true);setError('');try{await accept(portfolioExample(),'内置多仓位合成案例',id);}catch(e){if(id===attempt.current)setError(importFailure(e));}finally{if(id===attempt.current)setBusy(false);}}
 async function local(){const id=++attempt.current;setBusy(true);setError('');try{const d=await api('/api/local-observation');if(d.available)await accept(d.packet,'本机采集文件',id);else if(id===attempt.current)setError(importFailure(new Error('LOCAL_UNAVAILABLE')));}catch{if(id===attempt.current)setError(importFailure(new Error('LOCAL_UNAVAILABLE')));}finally{if(id===attempt.current)setBusy(false);}}
 useEffect(()=>{if(active&&!loaded.current){loaded.current=true;if(['localhost','127.0.0.1'].includes(location.hostname))local();}},[active]);
 async function readFile(e){const f=e.target.files?.[0];e.target.value='';if(!f)return;const id=++attempt.current;setBusy(true);setError('');try{if(f.size>4*1024*1024)throw new Error('FILE_TOO_LARGE');applyImport(await parseEvidence(await f.text(),f.size),'浏览器本地文件',id);}catch(e){if(id===attempt.current)setError(importFailure(e));}finally{if(id===attempt.current)setBusy(false);}}
 useImperativeHandle(ref,()=>({openFile:()=>{loaded.current=true;file.current.click();},showReview:()=>{if(trade||packet?.report.positions.some(p=>p.risk))setView('review');},example:()=>{loaded.current=true;return example();},acceptBaseline:async value=>{loaded.current=true;const id=++attempt.current;setBusy(true);setError('');try{await accept(value,'当前页面保存的事前基线',id);}catch(e){if(id===attempt.current)setError(importFailure(e));}finally{if(id===attempt.current)setBusy(false);}}}));
 const progress=useMemo(()=>reviewProgress(trade,baseline),[trade,baseline]);
 useEffect(()=>{onProgress?.(progress);},[progress,onProgress]);
 const synthetic=packet?.classification==='synthetic_account_observation';
 const positions=packet?.report.positions??[],chosen=positions.find(p=>`${p.accountId}:${p.positionId}`===selected),risk=chosen?.risk;
 const age=packet?Math.max(0,tick-Date.parse(packet.report.evaluatedAt)):0,stale=age>45000;
 const scenario=useMemo(()=>risk?positionScenario(packet,chosen.positionId,chosen.accountId,Number(shock)):null,[packet,chosen,shock]);
 const rows=useMemo(()=>risk?[-30,-20,-10,-5,0,5,10,20,30].map(n=>positionScenario(packet,chosen.positionId,chosen.accountId,n)):[],[packet,chosen]);
 const review=useMemo(()=>risk?reviewObservation(packet,chosen.positionId,chosen.accountId):null,[packet,chosen]);
 const exportReview=()=>download({schema:'account-workflow-review-v1',createdAt:new Date().toISOString(),observation:packet,scenario,review},'tradepilot-private-review.json');
 return <section className="account-workbench" hidden={!active}>
 <header className="account-heading"><div><span className="eyebrow">ACCOUNT WORKSPACE</span><h1>账户工作台</h1><p>从实际持仓出发，检查价格冲击，保留复盘依据。</p></div><div className="account-actions"><input ref={file} type="file" accept=".json,application/json" aria-label="选择账户或成交证据文件" onChange={readFile} hidden/><button disabled={busy} onClick={()=>file.current.click()}><Upload size={14}/>读取本机证据</button>{['localhost','127.0.0.1'].includes(location.hostname)&&<button disabled={busy} onClick={local}><RefreshCw size={14}/>重新加载采集结果</button>}<button onClick={clearPage}>清除本页数据</button></div></header>
 <div className="account-privacy"><ShieldCheck size={14}/><span>账户、成交与基线文件仅在本页内存中处理，不上传、不存入浏览器存储。刷新页面会清除。这里不接收 API 密钥。</span></div>
 <AccountUpdates key={clearEpoch} active={active} api={api} tick={tick} onUse={async p=>{const id=++attempt.current;setBusy(true);setError('');try{await accept(p,'只读更新观察',id);}catch(e){if(id===attempt.current)setError(importFailure(e));}finally{if(id===attempt.current)setBusy(false);}}}/>
 {error&&<><GuidanceItem item={error} alert/>{(packet||baseline)&&<p className="tp-note">此次导入未替换当前已读取的证据。</p>}</>}
 {importStatus&&<p className="evidence-import-status" role="status">{importStatus}</p>}<EvidenceFileGuide/>{busy&&<p role="status">正在读取并复算观察包…</p>}
 {baseline&&<section className="baseline-handoff" aria-label="当前复盘基线"><strong>当前复盘基线 · {baseline.evidence.preview.network==='testnet'?'Monad 测试网':'Monad 主网'}</strong><p>保存于 {time(baseline.evidence.savedAt)} · 成交关联截止 {time(baseline.evidence.validUntil)}</p><p>基线在本页内存中。{baseline.evidence.preview.network!=='testnet'?'当前成交核验仅支持测试网，此主网基线不能匹配测试网交易。':''}{trade?'仅匹配核验通过且参数、时间对应的开仓。':'下一步：读取同次交易的历史与回执文件；未读取前不产生任何成交结论。'}</p><button disabled={busy} onClick={()=>file.current.click()}>读取成交证据并对照</button><button disabled={busy} onClick={()=>setBaseline(null)}>移除当前基线</button><p className="tp-note">公开演示不下单。加载完整合成案例会替换当前复盘材料及基线；已下载文件不受影响。</p></section>}
 {!packet?<div className="account-onboarding"><h2>先体验一次完整的交易复盘</h2><p>案例展示：预估成交价 99.50 → 合成成交价 100.00 → 退出结算。无需钱包或密钥，所有数值均为合成数据。</p><button className="tp-primary" disabled={busy} onClick={example}>体验完整案例 <ArrowRight size={15}/></button><button disabled={busy} onClick={portfolioDemo}>体验多仓位风险案例</button><h3>或导入自己的测试网证据</h3><ol><li><strong>01 / 读取观察</strong><p>选择只读采集工具导出的 account_observation_*.json 或 trade_review_*.json。每个观察都带有账户、市场和采集时间。</p></li><li><strong>02 / 检查压力</strong><p>选择真实持仓，查看价格变化对权益和保证金余量的影响。</p></li><li><strong>03 / 完成复盘</strong><p>区分已观察数据、模型估算和未核验项目，导出同一份分析依据。</p></li></ol><button className="tp-primary" onClick={()=>file.current.click()}>选择账户观察 JSON <ArrowRight size={15}/></button><button onClick={onMarket}>先用公开行情做预演</button></div>:<>
 {synthetic&&<div className="tp-alert" role="status"><strong>合成教学案例 · 未发生链上交易</strong><p>虚构账户、市场、回执及损益，用于演示核验流程，不计入真实交易量或收益。可导出并独立复算。</p></div>}
 <div className="observation-line"><span className="tp-badge">{synthetic?'合成网络参数 · 10143':'Monad Testnet · 10143'}</span><strong>{packet.snapshot.expectedWallet.slice(0,8)}…{packet.snapshot.expectedWallet.slice(-6)}</strong><span>{origin}</span><time>观察于 {time(packet.report.evaluatedAt)}</time><b className={stale?'warning':'positive'}>{stale?'历史观察 · 非实时':`采集距今 ${Math.floor(age/1000)} 秒`}</b></div>
 <p className="tp-note">已通过快照哈希与模型复算。它验证内部一致性，不能独立认证上游来源或证明成交。{packet.report.issues.length?`数据问题：${packet.report.issues.join('、')}`:''}</p>
 <nav className="analysis-tabs" aria-label="账户流程">{[['overview','账户风险总览'],['positions','1 实际持仓'],['stress','2 持仓压力预演'],['review','3 复盘与证据']].map(([id,label])=><button key={id} disabled={id==='stress'&&!risk||id==='review'&&!risk&&!trade} aria-current={view===id?'page':undefined} onClick={()=>setView(id)}>{label}</button>)}</nav>
 {view==='overview'&&<PortfolioRisk shock={portfolioShock} onShock={setPortfolioShock} packet={packet} download={download} onPosition={(p,shock)=>{setShock(shock);setSelected(`${p.accountId}:${p.positionId}`);setView('stress');}}/>}
 {view==='overview'&&<PortfolioScenarios key={`${packet.snapshotHash}:${JSON.stringify(advancedScenario)}`} packet={packet} initial={advancedScenario} download={download}/>}
 {view!=='overview'&&(view!=='review'||positions.some(p=>p.risk))&&<div className="account-position-list"><label>选择持仓<select aria-label="选择实际持仓" value={selected} disabled={!positions.some(p=>p.risk)} onChange={e=>setSelected(e.target.value)}>{positions.filter(p=>p.risk).map(p=><option key={`${p.accountId}:${p.positionId}`} value={`${p.accountId}:${p.positionId}`}>{p.risk.asset} · {p.risk.direction==='long'?'多头':'空头'} · {p.risk.size} · #{p.positionId}</option>)}</select></label><span>{packet.report.accountCount} 个账户 · {packet.report.positionCount} 个开放仓位</span></div>}
 {!risk&&view!=='review'&&view!=='overview'?<div className="tp-empty">{packet.report.status==='empty_positions'?'本次观察没有开放仓位。':'本次观察未提供可计算持仓。'}<p>这不等同于已核验平仓、结算或盈利。</p><button onClick={onMarket}>进入市场预演</button></div>:risk&&<>
 {view==='positions'&&<><div className="account-metrics">{[['持仓数量',risk.size,risk.asset,5],['入场均价',risk.entryPrice,risk.collateralToken,2],['仓位抵押',risk.collateral,risk.collateralToken,6],['观察时未实现盈亏',risk.unrealizedPnl,risk.collateralToken,6],['估算清算价',risk.liquidationEstimate,risk.collateralToken,2],['保证金余量',risk.marginBuffer,risk.collateralToken,6]].map(([label,v,u,d])=><div key={label}><span>{label}</span><strong>{fmt(v,d)}</strong><small>{u}</small></div>)}</div><div className="account-summary"><h2>这笔仓位需要关注什么</h2><p>标记价格 {fmt(risk.markPrice)}；估算维持保证金 {fmt(risk.maintenanceEstimate,6)} {risk.collateralToken}。{risk.status==='incomplete'?'输入不完整，权益与清算结论应保留未知。':'结果适用于观察时刻，不代表当前实时风险。'}</p><p className="tp-note">入场费用 {fmt(risk.indicativeEntryFee,6)} 已由协议收取，不从当前权益再次扣除。仓位最后更新时间：{time(risk.sourceTime)}。</p><button className="tp-primary" onClick={()=>setView('stress')}>检验价格下跌后的余量 <ArrowRight size={14}/></button></div></>}
 {view==='stress'&&<div className="account-stress"><div className="account-stress-input"><h2>这笔持仓能承受什么变化</h2><label>相对观察标记价变化<input aria-label="持仓价格冲击" type="range" min="-99" max="100" step="1" value={shock} onChange={e=>setShock(Number(e.target.value))}/><strong>{shock>0?'+':''}{shock}%</strong></label><div className="leverage-options">{[-20,-10,-5,0,10].map(n=><button key={n} aria-pressed={shock===n} onClick={()=>setShock(n)}>{n}%</button>)}</div><p>情景价格 <b>{fmt(scenario.price)}</b></p><p>情景权益 <b>{fmt(scenario.equity,6)}</b></p><p>情景保证金余量 <b className={scenario.buffer<0?'negative':''}>{fmt(scenario.buffer,6)}</b></p><p className="tp-note">{scenario.note} {scenario.buffer!=null&&scenario.buffer<=0?'情景权益已低于估算维持额；穿过阈值后的数值不代表可实现结果。':''}</p><button onClick={()=>setView('review')}>带着结果进入复盘 <ArrowRight size={14}/></button></div><EvidencePlot id="account-stress" title="观察持仓的价格压力曲线" rows={rows} spec={{x:'shockPct',y:'buffer',xLabel:'价格变化 %',yLabel:'保证金余量'}} height={280}/></div>}
 {view==='review'&&<div className="account-review"><div><h2>这次分析证明了什么</h2><table className="plain-table"><tbody>{review.checks.map(c=><tr key={c.label}><th>{c.label}</th><td>{c.status}</td></tr>)}</tbody></table><p className="tp-note">{review.note} 持仓快照本身不证明实际成交；成交与结算需要另读历史回执。</p></div><aside><h3>导出完整复盘包</h3><p>包含原始观察、已选择的价格情景和验证状态。文件包含账户信息，请保存在本机。</p><button className="tp-primary" onClick={exportReview}><Download size={14}/>导出私有复盘</button><button onClick={()=>setView('stress')}>调整价格情景</button></aside></div>}
 </>}
 {view==='review'&&trade&&<TradeReview trade={trade} baseline={baseline} download={download}/>}
 {view==='review'&&trade&&<button onClick={()=>file.current.click()}>导入事前基线或另一份成交证据</button>}
 </>}
 {baseline&&!trade&&<p className="tp-note">事前基线已校验；请继续读取成交证据进行对照。</p>}
 </section>;
}
