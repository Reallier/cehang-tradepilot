import {EvidenceCoverage,GuidanceItem} from './EvidenceGuidance.jsx';
import {checkGuidance,checkLabel,baselineGuidance} from '../evidence-guidance.mjs';
import React,{useMemo,useState} from 'react';
import {time} from './Workbench.jsx';
import {workspaceReview} from '../trade-review.mjs';
import {reviewJourneys,reviewNumber as number} from '../review-journeys.mjs';

const states={closed:'完整结算已核验',partial:'部分退出已核验',exit_missing:'尚缺退出证据',review:'需要检查证据'};
const duration=ms=>ms==null?'未知':ms<60000?`${Math.floor(ms/1000)} 秒`:`${Math.floor(ms/60000)} 分 ${Math.floor(ms/1000)%60} 秒`;

function AuditRow({record:r,closing,synthetic}){
 const passed=r.status.endsWith('_reconciled');
 return <details className="trade-audit-row"><summary>{closing?'退出':'开仓'}订单 #{r.orderId} · {r.checks.filter(c=>c.passed).length}/{r.checks.length} 项通过 <span className={passed?'positive':'warning'}>{passed?(synthetic?'合成事件一致':'保存回执一致'):'未通过'}</span></summary>
 {r.execution?<dl>{(closing?[['退出数量',r.execution.size],['成交价',r.execution.price],['释放抵押',r.execution.collateralReleased],['账户入账',r.execution.accountCredit]]:[['成交数量',r.execution.size],['成交价',r.execution.price],['仓位抵押',r.execution.collateral],['账户扣款',r.execution.accountDebit]]).map(([label,v])=><div key={label}><dt>{label}</dt><dd>{number(v,8)}</dd></div>)}</dl>:<p className="warning">尚缺可核验的成交资料</p>}
 {!passed&&<GuidanceItem item={checkGuidance(r.reason)}/>}
 <p className="tp-note">{closing?'账户入账包含抵押释放，不等于交易盈利。':'账户扣款包含仓位抵押，不等于交易亏损。'}</p><ul>{r.checks.map(c=><li key={c.id}>{c.passed?'✓':'×'} {checkLabel(c.id)} <code>{c.id}</code></li>)}</ul><p className="tp-note">交易 {r.txHash??'未知'}</p></details>;
}

function BaselineReview({journey:j,baseline,synthetic}){
 const c=j.comparison,guidance=baselineGuidance(c,baseline);
 return <section className="journey-baseline"><h3>事前预演 → 开仓 #{j.open.orderId}</h3>{guidance?<GuidanceItem item={guidance}/>:<>
 <div className="review-table-scroll"><table className="journey-comparison"><caption>按实际成交数量比较 · 金额单位 {j.unit}</caption><thead><tr><th scope="col">指标</th><th scope="col">事前预估</th><th scope="col">实际成交</th><th scope="col">差异</th></tr></thead><tbody>
 <tr><th scope="row">入场价格</th><td>{number(c.estimatedPrice,8)}</td><td>{number(c.actualPrice,8)}</td><td>{number(c.priceDeviationBps,4,{signed:true})} bps</td></tr>
 <tr><th scope="row">开仓费用</th><td>{number(c.estimatedFeeForFilledSize,12)}</td><td>{number(c.actualFee,12)}</td><td>{number(c.feeDelta,12,{signed:true})}</td></tr>
 </tbody></table></div>
 <p className="journey-impact">不利价格成本 <strong>{number(c.adversePriceCost,8,{signed:true})} {j.unit}</strong></p><p className="tp-note">正值表示买得更贵或卖得更便宜，负值表示价格更有利。此项已体现在实际成交价与价格损益中，不再从净损益重复扣除。</p>
 <p className="tp-note">保存于 {time(baseline.evidence.savedAt)} · 仅在此笔开仓的两分钟关联窗口内匹配。文件时间不构成第三方时间证明；{synthetic?'本例为合成教学数据。':'单次偏差不证明策略收益或预测能力。'}</p></>}
 </section>;
}

export function TradeReview({trade,baseline,download}){
 const packet=useMemo(()=>workspaceReview(trade,baseline),[trade,baseline]);
 const journeys=useMemo(()=>reviewJourneys(packet),[packet]);
 const [selection,setSelection]=useState(null);
 // A replacement packet defaults to its own first trade; selection never crosses imports.
 const active=journeys.items.find(j=>selection?.trade===trade&&j.id===selection.id)??journeys.items[0];
 const report=trade.report,synthetic=trade.observation.classification==='synthetic_testnet_history';
 const choose=id=>setSelection({trade,id});
 return <section className="trade-review-panel"><div className="section-heading"><h2>逐笔交易复盘</h2><button onClick={()=>download(packet,synthetic?'tradepilot-synthetic-review.json':'tradepilot-private-trade-review.json')}>导出完整成交复盘</button></div>
 <p className="tp-note">观察于 {time(report.collectedAt)} · {report.opening.historyComplete?'历史分页完整':'历史分页不完整'}。{synthetic?'合成教学案例，未发生链上交易。':'本页重新解码保存回执并复算，未实时请求链节点，不证明当前最终性。'}</p>
 <EvidenceCoverage trade={trade}/><div className="journey-counts"><span>开仓记录 <b>{journeys.items.length}</b></span><span>完整结算已核验 <b>{journeys.items.filter(j=>j.state==='closed').length}</b></span><span>未关联退出 <b>{journeys.unlinked.length}</b></span><span>观察时开放仓位 <b>{report.opening.openPositionsObserved??'未知'}</b></span></div>
 <div className="review-table-scroll"><table className="journey-table"><caption>选择一笔交易，查看对应基线、成交与结算</caption><thead><tr><th scope="col">开仓订单 / 市场</th><th scope="col">账户 / 仓位</th><th scope="col">核验状态</th><th scope="col">事前基线</th><th scope="col">已核验净损益</th></tr></thead><tbody>{journeys.items.map(j=><tr key={j.id} className={active?.id===j.id?'is-selected':''}><th scope="row"><button aria-pressed={active?.id===j.id} onClick={()=>choose(j.id)}>{j.asset} · {j.direction}<small>#{j.open.orderId}</small></button></th><td>#{j.accountId}<small>仓位 {j.positionId??'未知'}</small></td><td>{states[j.state]}</td><td>{j.comparison?.status==='compared'?'已匹配':baseline?'不适用':'未提供'}</td><td>{number(j.pnl?.net)}<small>{j.unit}{j.state==='partial'?' · 仅退出部分':''}</small></td></tr>)}</tbody></table></div>
 {active&&<div className="journey-detail" key={active.id}><header className="journey-heading"><div><span className="eyebrow">TRADE LIFECYCLE</span><h3>{active.asset} · {active.direction} · 开仓 #{active.open.orderId}</h3></div><span className={active.state==='closed'?'positive':'warning'}>{states[active.state]}</span></header>
 <ol className="journey-steps" aria-label="当前交易证据进度">{[['事前基线',active.comparison?.status==='compared'?'匹配此笔开仓':baseline?'当前基线不适用':'未提供'],['开仓成交',active.open.status==='opening_reconciled'?'已核验':'未通过'],['退出成交',active.state==='closed'?'全部退出':active.state==='partial'?'部分退出':active.exits.length?'需要检查':'尚缺证据'],['损益结算',active.pnl?'可独立复算':'保持未知']].map(([label,value])=><li key={label}><span>{label}</span><strong>{value}</strong></li>)}</ol>
 <p className="tp-note">开仓 {time(active.openedAt)} · 退出 {time(active.closedAt)} · 间隔 {duration(active.durationMs)}</p>
 <div className="journey-columns"><BaselineReview journey={active} baseline={baseline} synthetic={synthetic}/><section className="journey-attribution"><h3>{synthetic?'案例':'交易'}损益构成{active.state==='partial'?' · 仅退出部分':''}</h3>{active.pnl?<>
 <dl>{[['价格损益',active.pnl.price],['资金损益',active.pnl.funding],['分摊开仓费',-active.pnl.entryFee],['平仓费',-active.pnl.exitFee],['净损益',active.pnl.net]].map(([label,v])=><div key={label}><dt>{label}</dt><dd className={v<0?'negative':v>0?'positive':''}>{number(v,8,{signed:true})}</dd></div>)}</dl><p className="tp-note">单位 {active.unit}。净损益 = 价格损益 + 资金损益 − 两笔费用；不含 MON Gas 及充提成本。{active.state==='partial'?'剩余仓位的未实现损益不计入此值。':''}</p></>:<p className="tp-alert">尚无通过核验的连续退出结算，净损益保持未知。空仓快照不能代替平仓证据。</p>}</section></div>
 {active.state==='exit_missing'&&<GuidanceItem item={{code:'EXIT_NOT_LINKED',title:'尚缺可关联的退出证据',why:'本次文件没有与这笔开仓对应的退出记录；空仓快照也不能证明结算。',next:'若已经退出，重新采集覆盖该交易的退出订单、成交、仓位变化、账户流水与回执；若尚未退出，保持结算未知，无需为验收发起交易。'}}/>}
 {active.exits.length>0&&<div className="table-scroll"><table className="plain-table"><caption>逐次退出账本 · 保存证据复算</caption><thead><tr><th>退出订单</th><th>退出数量</th><th>剩余数量</th><th>分摊开仓费</th><th>退出费</th><th>释放抵押</th><th>本次净损益</th></tr></thead><tbody>{active.exits.map(x=><tr key={x.orderId}><td>#{x.orderId}</td>{[x.execution?.size,x.execution?.remainingSize,x.execution?.entryFeeShare,x.execution?.fee,x.execution?.collateralReleased,x.realizedPnl].map((v,i)=><td key={i}>{number(x.status==='exit_reconciled'?v:null,8)}</td>)}</tr>)}</tbody></table></div>}
 <h3 className="journey-evidence-title">原始订单与逐项核对</h3><AuditRow record={active.open} synthetic={synthetic}/>{active.exits.map(r=><AuditRow key={r.orderId} record={r} closing synthetic={synthetic}/>)}</div>}
 {journeys.unlinked.length>0&&<section className="journey-unlinked"><h3>未关联的退出证据</h3><p className="warning">缺少唯一对应的开仓，以下记录不并入任何交易的净损益。请补齐同一账户、市场和仓位的开仓历史；若存在重复或复杂生命周期，需要先解决关联问题。</p>{journeys.unlinked.map(r=><AuditRow key={`${r.accountId}:${r.marketId}:${r.orderId}`} record={r} closing synthetic={synthetic}/>)}</section>}
 </section>;
}
