import React from 'react';
import './review-path.css';

export function ReviewPath({active,preview,baseline,summary,onMarket,onAccount,onExample,onImport}){
 const steps=[
  ['方案与预演',preview?'已有计算 · 模型估算':'选择市场、金额与风险情景',onMarket,active==='market'],
  ['保存事前基线',baseline?`已保存${baseline.evidence.preview.network==='testnet'?'测试网':'主网'}基线 · 独立于当前参数`:'计算后保存价格、数量和时限',onMarket,false],
  ['读取成交证据',summary?.trade?(summary.synthetic?'合成成交材料':'已读取保存的测试网材料'):'导入历史与回执，浏览器内核验',onImport,false],
  ['对照与复盘',summary?.trade?`${summary.matched} 笔基线匹配 · ${summary.closed} 笔完整结算`:'缺少证据时保持未知',onAccount,active==='account']
 ];
 return <section className="review-path" aria-label="预演到复盘流程">
  <div className="review-path-heading"><strong>预演 → 成交 → 复盘</strong><span>保存不会下单；成交与基线按实际证据匹配。</span><button onClick={onExample}>体验完整合成案例 ↗</button></div>
  <ol>{steps.map(([label,status,action,current],i)=><li key={label}><button onClick={action} aria-current={current?'step':undefined}><b>{String(i+1).padStart(2,'0')}</b><span><strong>{label}</strong><small>{status}</small></span></button></li>)}</ol>
  {summary?.synthetic&&<p>当前复盘为合成教学案例，包含它自己的事前基线；与市场页的公开行情预演无关。</p>}
 </section>;
}
