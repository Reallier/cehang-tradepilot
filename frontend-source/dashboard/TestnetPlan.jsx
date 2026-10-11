import React,{useState} from 'react';
import {createTestPlan} from '../testnet-plan.mjs';
export function TestnetPlan({download,busy,onImport}){
 const [input,setInput]=useState({marketId:16,notional:10,leverage:2,slippageBps:100,repetitions:2}),[error,setError]=useState('');
 function create(load){try{const p=createTestPlan(input);if(load)onImport(JSON.stringify(p.evidence.research));else download(p,'tradepilot-testnet-plan.json');setError('');}catch(e){setError(e.message);}}
 return <details className="tp-panel"><summary>固定条件测试网实验计划</summary><p className="tp-note">生成多头、空头及多头分批退出草稿，每类1–3轮。参数只用于计划；先检查当前市场最小数量，不能把草稿计为成交或收益样本。加入会与当前工作区合并。</p><div className="research-actions">{[['marketId','测试网市场ID'],['notional','计划名义金额'],['leverage','杠杆'],['slippageBps','滑点上限bps'],['repetitions','每类轮数']].map(([key,label])=><label key={key}>{label}<input aria-label={label} type="number" value={input[key]} disabled={busy} onChange={e=>setInput(s=>({...s,[key]:Number(e.target.value)}))}/></label>)}</div><button disabled={busy} onClick={()=>create(false)}>导出测试计划</button><button disabled={busy} onClick={()=>create(true)}>将计划加入实验台</button>{error&&<p role="alert">{error}</p>}</details>;
}
