import React,{useMemo} from 'react';
import {EVIDENCE_FILES} from '../evidence-import.mjs';
import {evidenceGaps} from '../evidence-guidance.mjs';
import './evidence-guidance.css';
export function GuidanceItem({item,alert=false}){return <div className="evidence-guidance-item" role={alert?'alert':undefined}><strong>{item.title}</strong><p>{item.why}</p><p><b>下一步：</b>{item.next}</p><details><summary>诊断代码</summary><code>{item.code}</code></details></div>;}
export function EvidenceFileGuide(){return <details className="evidence-file-guide"><summary>文件导入指南 · 我应该选择哪种文件？</summary><table className="plain-table"><thead><tr><th>文件类型</th><th>用途与来源</th></tr></thead><tbody>{EVIDENCE_FILES.map(([label,schema,note])=><tr key={label}><th>{label}<small>{schema}</small></th><td>{note}</td></tr>)}</tbody></table><p className="tp-note">支持完整 JSON，单个文件不超过 4 MB。不接收密钥、钱包助记词或 .env 文件。哈希与复算通过仅说明文件内部一致，不能独立认证来源。失败导入不会替换当前工作区。</p></details>;}
export function EvidenceCoverage({trade}){
 const result=useMemo(()=>evidenceGaps(trade),[trade]);
 return <section className="evidence-coverage" aria-label="证据覆盖与补齐指引"><h3>证据覆盖与补齐指引</h3><p className="tp-note">历史订单 {result.orderCount} 条 · 进入自动核验 {result.checkedCount} 笔 · 未通过 {result.failedCount} 笔。未进入核验不等于已通过。</p>{result.gaps.length?result.gaps.map(g=><GuidanceItem key={g.code} item={g}/>):<p className="tp-note">当前文件未发现分页、回执覆盖标记或已处理订单的核验缺项。事前基线及开仓／退出对应关系仍按下方逐笔结果判断；不代表账户全部历史均已覆盖。</p>}</section>;
}
