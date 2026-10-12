import React from 'react';
import summary from '../content/acceptance-summary.json';
const repo='https://github.com/Reallier/cehang-tradepilot';
export function JudgeEvidence({onExample,onResearch,download}){
 const c=summary.counts;
 return <section className="tp-panel judge-evidence" aria-label="评委核验入口"><span className="eyebrow">JUDGE GUIDE / MONAD TESTNET 10143</span><h2>先体验，再核对证据</h2><p>公开产品无需登录、钱包或充值。先体验一轮带来源标记的复盘，再检查实现、历史验收范围和剩余边界。</p>
 <div className="research-actions"><button className="tp-primary" onClick={onExample}>体验合成完整流程</button><button onClick={onResearch}>进入测试网实验台</button><a href={repo} target="_blank" rel="noreferrer">公开源码 ↗</a><a href={`${repo}/blob/main/docs/JUDGE_GUIDE.md`} target="_blank" rel="noreferrer">评委访问指南 ↗</a></div>
 <h3>三类证据，分别解读</h3><div className="table-scroll"><table className="plain-table"><thead><tr><th>来源</th><th>如何查看</th><th>能说明什么</th></tr></thead><tbody>
 <tr><td>公开协议行情</td><td>市场与预演 · 来源与更新时间</td><td>该快照下的成本和风险估算；上游不可用时明确显示失败</td></tr>
 <tr><td>合成案例</td><td>账户工作台 · 体验完整案例</td><td>可交互、可导出的功能演示；没有真实链上成交</td></tr>
 <tr><td>真实测试网历史档案</td><td>下方匿名摘要；原始档案未公开</td><td>项目方本机复算的限定样本；摘要不能供外部独立验证链上交易</td></tr>
 </tbody></table></div>
 <h3>真实测试网档案复算摘要</h3><p className="tp-note">复核日期 {summary.reviewedOn} · Monad Testnet（{summary.chainId}）· 按开仓身份去重。统计选定的已归档生命周期，不代表账户全部交易；结算与基线匹配分别计数。</p>
 <dl className="judge-counts">{[['完整开平仓',c.closedLifecycles],['多头单次退出',c.longFull],['空头单次退出',c.shortFull],['连续分批退出',c.stagedExits],['匹配事前基线',c.baselineMatched]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
 <p>复核包含开仓数量及费用、退出结算与抵押返还、保存回执与历史接口的一致性；只有对应基线匹配时才计入事前对照。未匹配的完整结算不会冒充事前对照通过。</p>
 <p className="tp-alert">这是项目方生成的匿名验收摘要，不是公开链上证明。真实资金与公开自动下单关闭；尚未取得真实样本的能力仍显示待验收。复算不证明策略收益或当前链最终性。</p>
 <div className="research-actions"><button onClick={()=>download(summary,'tradepilot-acceptance-summary.json')}>下载匿名验收摘要</button><a href={`${repo}/blob/main/docs/EVIDENCE_SUMMARY.md`} target="_blank" rel="noreferrer">生成方法与核验边界 ↗</a><a href={`${repo}/blob/main/docs/BUILD_DISCLOSURE.md`} target="_blank" rel="noreferrer">本次参赛新增工作 ↗</a></div></section>;
}
