import React,{useMemo} from 'react';
import {Download,ArrowRight} from 'lucide-react';
import {portfolioRisk,portfolioPacket} from '../../server/portfolio-risk.mjs';
import {reviewNumber} from '../review-journeys.mjs';
import './portfolio-risk.css';
const n=(value,signed=false)=>reviewNumber(value,4,{signed});
export function PortfolioRisk({packet,download,onPosition,shock,onShock}){
 const report=useMemo(()=>portfolioRisk(packet,shock),[packet,shock]);
 return <section className="portfolio-risk" aria-label="账户风险总览">
 <div className="portfolio-toolbar"><div><h2>账户风险总览</h2><p className="tp-note">按账户、协议实例与抵押代币身份分组。相同币种名称也不合并不同代币。</p></div><button onClick={()=>download(portfolioPacket(packet,shock),'tradepilot-portfolio-review.json')}><Download size={14}/>导出总览与情景</button></div>
 <div className="portfolio-controls"><label>所有市场价格冲击 <strong>{shock>0?'+':''}{shock}%</strong><input type="range" aria-label="组合价格冲击" min="-99" max="100" step="1" value={shock} onChange={e=>onShock(Number(e.target.value))}/></label><div className="leverage-options">{[-20,-10,0,10,20].map(v=><button key={v} aria-pressed={shock===v} onClick={()=>onShock(v)}>{v>0?'+':''}{v}%</button>)}</div><span>{report.positionCount} 仓位 · {report.groups.length} 分组</span><strong className={report.thresholdCount?'negative':''}>触及阈值 {report.thresholdCount}</strong><strong className={report.unknownCount?'warning':''}>待核实 {report.unknownCount}</strong></div>
 <p className="tp-note">统一涨跌是压力情景假设，不是价格预测或相关性模型。下跌可能有利于空头，请同时检查上涨情景。损失贡献按观察时刻到情景价格的亏损计算，盈利仓位不抵扣该排名。</p>
 {!report.positionCount&&<div className="tp-empty">本次观察没有开放仓位。<p>没有仓位风险可计算；这不代表已核验成交结算或账户全部资产风险。</p></div>}
 {report.groups.map(g=><section className="portfolio-group" key={g.key}>
 <header><h3>账户 #{g.accountId} <span>实例 #{g.instanceId} · {g.unit}</span></h3><span className={g.complete?'tp-badge':'warning'}>{g.complete?'观察输入完整':`输入不全 · ${g.unknownCount} 仓位待核实`}</span></header>
 <p className="tp-note portfolio-token">代币 #{g.tokenId??'未知'} · {g.tokenAddress??'地址未知'} · 可计算 {g.knownCount}/{g.positionCount} · 触及逐仓阈值 {g.thresholdCount}</p>
 <div className="portfolio-metrics">{[['总敞口','grossExposure'],['方向净敞口','signedExposure'],['逐仓抵押合计','collateral'],['相对观察损益变化','deltaPnl'],['情景未实现盈亏','scenarioPnl']].map(([label,k])=><div key={k}><span>{label}</span><strong>{n(g.totals[k],['deltaPnl','scenarioPnl','signedExposure'].includes(k))}</strong><small>{g.unit}</small>{!g.complete&&<small>已知部分 {n(g.knownSubtotal[k])}</small>}</div>)}</div>
 <div className="portfolio-table-scroll"><table className="plain-table"><caption>按亏损贡献排序 · 金额单位 {g.unit} · “—”为未知或无适用占比</caption><thead><tr>{['持仓','方向','标记 → 情景价','抵押','损益变化','亏损贡献占比','情景权益','情景保证金余量','观察价至清算距离','状态'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{g.positions.map(p=><tr key={p.positionId}><td><button disabled={p.markPrice==null} onClick={()=>onPosition(p,shock)}>{p.asset} #{p.positionId} <ArrowRight size={12}/></button></td><td>{p.direction==='long'?'多':p.direction==='short'?'空':'—'}</td><td>{n(p.markPrice)} → {n(p.scenarioPrice)}</td><td>{n(p.collateral)}</td><td className={p.deltaPnl<0?'negative':''}>{n(p.deltaPnl,true)}</td><td>{p.lossSharePct==null?'—':`${n(p.lossSharePct)}%`}</td><td>{n(p.scenarioEquity)}</td><td className={p.buffer!=null&&p.buffer<=0?'negative':''}>{n(p.buffer)}</td><td>{p.distanceToLiquidationPct==null?'—':`${n(p.distanceToLiquidationPct)}%`}</td><td className={p.status==='threshold_crossed'?'negative':p.status==='unknown'?'warning':''}>{p.status==='threshold_crossed'?'触及估算阈值':p.status==='unknown'?'数据待核实':'高于估算阈值'}{p.reason&&<small title={p.reason}>输入不完整，见原始报告</small>}</td></tr>)}</tbody></table></div>
 <p className="tp-note">情景权益不能跨仓位抵扣。清算距离按多/空不利方向计算；负数表示观察时已越过估算阈值。损益及权益为模型算术，不保证能持仓至该价格。</p>
 </section>)}
 <p className="tp-note">{report.note}</p>
 </section>;
}
