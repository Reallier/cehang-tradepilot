import {replayResearchComparison} from '../frontend-source/research-comparison.mjs';
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {fixture} from './risk-fixture.mjs';
import {comparePlans} from '../server/comparison.mjs';
import {monitorExample} from '../server/monitor-example.mjs';
import {guidedReview} from '../server/guided-review.mjs';
import {replayResearch} from '../frontend-source/research-workspace.mjs';
import {replaySizing} from '../server/budget-sizing.mjs';

// Offline DOM emulation, not a browser/visual or network acceptance test.
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,location:dom.window.location,
 history:dom.window.history,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client');
const rootDir=path.resolve(import.meta.dirname,'..');
await fs.mkdir(path.join(rootDir,'data'),{recursive:true});
const temp=await fs.mkdtemp(path.join(rootDir,'data','ui-test-'));
const outfile=path.join(temp,'components.mjs');
await build({stdin:{contents:"export {JudgeEvidence} from './frontend-source/dashboard/JudgeEvidence.jsx';export {DashboardContent} from './frontend-source/dashboard/DashboardContent.jsx';export {ResearchWorkbench} from './frontend-source/dashboard/ResearchWorkbench.jsx';export {AccountWorkbench} from './frontend-source/dashboard/AccountWorkbench.jsx';export {PlanComparison} from './frontend-source/dashboard/PlanComparison.jsx';export {Workspace} from './frontend-source/ui.jsx';",resolveDir:rootDir},bundle:true,format:'esm',platform:'node',packages:'external',loader:{'.css':'empty'},outfile});
const {JudgeEvidence,DashboardContent,ResearchWorkbench,AccountWorkbench,PlanComparison,Workspace}=await import(pathToFileURL(outfile));
const el=React.createElement,container=document.getElementById('root');
const button=text=>[...container.querySelectorAll('button')].find(b=>b.textContent===text);
async function click(text){assert.ok(button(text),`missing button ${text}`);await act(async()=>{button(text).click();});}
async function settle(){await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});}
async function waitFor(predicate){for(let i=0;i<30&&!predicate();i++)await settle();assert.ok(predicate());}
async function input(label,value){const node=container.querySelector(`[aria-label="${label}"]`);assert.ok(node);await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new window.Event('input',{bubbles:true}));});}
after(async()=>{dom.window.close();await fs.rm(temp,{recursive:true,force:true});});

test('clear page removes monitor-only data, polling, imported positions and late manual read results',async()=>{
 let resolveRead,root=createRoot(container);
 const api=async route=>route==='/api/local-monitor'?new Promise(resolve=>{resolveRead=resolve;}):{available:false};
 try{
  await act(async()=>root.render(el(AccountWorkbench,{active:true,api,tick:Date.now(),download:()=>{}})));
  await click('读取最新观察');assert.ok(resolveRead);
  await click('清除本页数据');
  await act(async()=>resolveRead({available:true,monitor:monitorExample()}));await settle();
  assert.ok(!container.textContent.includes('上次采集成功'));
  await click('体验风险变化案例');assert.ok(container.textContent.includes('上次采集成功'));
  await click('用这次观察检查持仓压力');await waitFor(()=>container.querySelector('.observation-line'));
  await click('自动读取 关');assert.ok(button('自动读取 开'));
  await click('清除本页数据');assert.ok(button('自动读取 关'));assert.ok(!container.querySelector('.observation-line'));
  await act(async()=>resolveRead({available:true,monitor:monitorExample()}));await settle();
  assert.ok(!container.textContent.includes('上次采集成功'));assert.ok(!container.querySelector('.observation-line'));
 }finally{await act(async()=>root.unmount());}
});

test('comparison searches cached evidence locally; changed budgets invalidate results; export replays and transfer uses selected size',async()=>{
 const f=fixture();f.input={...f.input,notional:50,shockPct:-5};
 const comparison={...comparePlans({...f,inputs:[f.input,{...f.input,leverage:1}]}),id:'comparison_00000000-0000-4000-8000-000000000001'};
 const calls=[],downloads=[],applied=[];const root=createRoot(container);
 const api=async route=>{calls.push(route);return route==='/api/compare'?{...comparison,context:undefined,book:undefined}:comparison;};
 try{
  await act(async()=>root.render(el(Workspace,null,el(PlanComparison,{input:f.input,network:'testnet',marketId:1,api,run:fn=>fn(),busy:false,ready:true,download:v=>downloads.push(v),onApplyPlan:(...args)=>applied.push(args)}))));
  await click('用同一行情比较 A / B');await input('保证金预算上限','20');await click('计算预算内规模');
  assert.ok(container.textContent.includes('模型内目标金额区间'));
  await click('导出预算搜索证据');assert.equal(replaySizing(downloads[0]).status,'reproduced');
  await input('保证金预算上限','10');assert.ok(!container.textContent.includes('模型内目标金额区间'));assert.ok(!button('带回区间上界'));
  await click('计算预算内规模');await click('带回区间上界');assert.equal(applied.length,1);assert.ok(applied[0][0].notional>=20&&applied[0][0].notional<20.11);
  assert.deepEqual(calls,['/api/compare',`/api/evidence?id=${comparison.id}`]);
 }finally{await act(async()=>root.unmount());}
});


test('research workspace preserves experiments across tab changes, exports, restores and discards late imports after clear',async()=>{
 const calls=[],downloads=[],root=createRoot(container),props={active:true,api:async route=>{calls.push(route);return guidedReview();},download:p=>downloads.push(p),onPrepare:()=>{}};
 async function file(label,value){const n=container.querySelector(`[aria-label="${label}"]`);Object.defineProperty(n,'files',{configurable:true,value:[{size:100,text:()=>value}]});await act(async()=>n.dispatchEvent(new window.Event('change',{bubbles:true})));}
 try{
  await act(async()=>root.render(el(ResearchWorkbench,props)));await click('创建实验');await click('添加合成示例');
  assert.ok(container.querySelector('[aria-label="本轮验收进度"]').textContent.includes('历史成交已匹配原基线'));
  await click('导出研究工作区');assert.equal(replayResearch(downloads[0]).experiments,2);assert.equal(downloads[0].report.syntheticVerified,1);await click('导出本实验采集目标');assert.deepEqual(downloads[1],{schema:'testnet-receipt-target-v1',chainId:10143,accountId:1,marketId:1,openingOrderId:9});
  await act(async()=>root.render(el(ResearchWorkbench,{...props,active:false})));await act(async()=>root.render(el(ResearchWorkbench,props)));
  assert.ok(container.textContent.includes('实验记录 · 2/20'));
  await click('清空实验台');assert.ok(container.textContent.includes('实验记录 · 0/20'));
  await file('恢复研究工作区',Promise.resolve(JSON.stringify(downloads[0])));await waitFor(()=>container.textContent.includes('实验记录 · 2/20'));
  let resolve;await file('恢复研究工作区',new Promise(r=>{resolve=r;}));await click('清空实验台');await act(async()=>resolve(JSON.stringify(downloads[0])));await settle();
  assert.ok(container.textContent.includes('实验记录 · 0/20'));assert.deepEqual(calls,['/api/guided-review']);
 }finally{await act(async()=>root.unmount());}
});


test('research text drafts survive switching and exports; only unexported work warns before leaving',async()=>{
 const downloads=[],root=createRoot(container),props={active:true,api:async()=>guidedReview(),download:p=>downloads.push(p),onPrepare:()=>{}};
 try{
  await act(async()=>root.render(el(ResearchWorkbench,props)));await click('创建实验');await input('实验名称','保留的空头草稿');
  await click('创建实验');await act(async()=>container.querySelector('.research-list button').click());
  assert.equal(container.querySelector('[aria-label="实验名称"]').value,'保留的空头草稿');
  const warn=new window.Event('beforeunload',{cancelable:true});window.dispatchEvent(warn);assert.equal(warn.defaultPrevented,true);
  await click('导出研究工作区');assert.equal(downloads[0].workspace.experiments[0].title,'保留的空头草稿');assert.equal(replayResearch(downloads[0]).status,'reproduced');
  const exported=new window.Event('beforeunload',{cancelable:true});window.dispatchEvent(exported);assert.equal(exported.defaultPrevented,false);
 }finally{await act(async()=>root.unmount());}
});

test('expired demo session recovers in place without losing research drafts or remounting imported evidence',async()=>{
 const originalFetch=globalThis.fetch,root=createRoot(container);let connects=0;
 history.replaceState(null,'','/?tab=research');window.scrollTo=()=>{};
 globalThis.fetch=async url=>{
  assert.equal(url,'./api/session');connects++;
  return {ok:true,status:200,headers:new Headers(),json:async()=>({token:`test-session-${connects}`,expiresAt:new Date(Date.now()+(connects===1?-1000:1800000)).toISOString()})};
 };
 try{
  await act(async()=>root.render(el(Workspace,null,el(DashboardContent))));await waitFor(()=>button('创建实验'));
  await click('创建实验');await input('实验名称','会话恢复后仍在');assert.ok(button('恢复演示会话'));
  await click('恢复演示会话');await waitFor(()=>container.textContent.includes('新会话已建立'));
  assert.equal(connects,2);assert.equal(container.querySelector('[aria-label="实验名称"]').value,'会话恢复后仍在');
  assert.ok(container.textContent.includes('实验记录 · 1/20'));assert.ok(!button('恢复演示会话'));
 }finally{await act(async()=>root.unmount());globalThis.fetch=originalFetch;history.replaceState(null,'','/');}
});

test('cross-experiment panel excludes drafts, deduplicates examples and exports locally replayable comparisons',async()=>{
 const calls=[],downloads=[],root=createRoot(container),props={active:true,api:async route=>{calls.push(route);return guidedReview();},download:p=>downloads.push(p),onPrepare:()=>{}};
 try{
  await act(async()=>root.render(el(ResearchWorkbench,props)));await click('创建实验');await click('添加合成示例');await click('添加合成示例');
  const panel=container.querySelector('[aria-label="跨实验对比"]');assert.ok(panel.textContent.includes('纳入 1 个去重生命周期'));assert.ok(panel.textContent.includes('排除 2 轮实验'));assert.ok(panel.textContent.includes('仅 1 笔样本'));assert.ok(panel.textContent.includes('重复成交'));
  await input('实验名称','对比导出的草稿名称');await click('导出跨实验对比');assert.equal(replayResearchComparison(downloads[0]).included,1);assert.equal(downloads[0].workspace.experiments[2].title,'对比导出的草稿名称');
  const n=container.querySelector('[aria-label="恢复研究工作区"]');Object.defineProperty(n,'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify(downloads[0])}]});await act(async()=>n.dispatchEvent(new window.Event('change',{bubbles:true})));await settle();assert.ok(container.textContent.includes('实验记录 · 3/20'));
  assert.deepEqual(calls,['/api/guided-review','/api/guided-review']);
 }finally{await act(async()=>root.unmount());}
});

test('batch merge keeps selected drafts, reports deduplication, rejects conflicts and a corrupt second file atomically',async()=>{
 const {newExperiment,researchPacket}=await import('../frontend-source/research-workspace.mjs');
 const {researchComparisonPacket}=await import('../frontend-source/research-comparison.mjs');
 const downloads=[],calls=[],root=createRoot(container);
 const props={active:true,api:async route=>{calls.push(route);return guidedReview();},download:p=>downloads.push(p),onPrepare:()=>{}};
 async function merge(raws){const n=container.querySelector('[aria-label="合并研究档案"]');assert.equal(n.multiple,true);Object.defineProperty(n,'files',{configurable:true,value:raws.map(raw=>({size:100,text:async()=>raw}))});await act(async()=>n.dispatchEvent(new window.Event('change',{bubbles:true})));await settle();}
 try{
  await act(async()=>root.render(el(ResearchWorkbench,props)));await click('创建实验');await click('导出研究工作区');
  const original=downloads[0];await input('实验名称','未保存的名称');
  const incoming={experiments:[newExperiment('long_full')]};
  await merge([JSON.stringify(researchPacket(incoming)),JSON.stringify(researchComparisonPacket(incoming))]);
  assert.ok(container.textContent.includes('新增1轮，跳过1条相同实验'));assert.ok(container.textContent.includes('实验记录 · 2/20'));
  assert.equal(container.querySelector('[aria-label="实验名称"]').value,'未保存的名称');
  await click('导出研究工作区');const good=downloads.at(-1);assert.equal(good.workspace.experiments[0].title,'未保存的名称');assert.equal(replayResearch(good).experiments,2);
  await merge([JSON.stringify(original)]);assert.match(container.querySelector('[role="alert"]').textContent,/不同版本/);
  const third=researchPacket({experiments:[newExperiment('long_full')]});
  await merge([JSON.stringify(third),'{']);assert.match(container.querySelector('[role="alert"]').textContent,/第2个档案/);
  await click('导出研究工作区');assert.deepEqual(downloads.at(-1),good);assert.deepEqual(calls,[]);
 }finally{await act(async()=>root.unmount());}
});

test('clear cancels a pending merge; byte budget checks actual file text and preserves current drafts',async()=>{
 const {newExperiment,researchPacket,MAX_RESEARCH_BYTES}=await import('../frontend-source/research-workspace.mjs');
 const root=createRoot(container);let resolve,secondReads=0;
 async function files(value){const n=container.querySelector('[aria-label="合并研究档案"]');Object.defineProperty(n,'files',{configurable:true,value});await act(async()=>n.dispatchEvent(new window.Event('change',{bubbles:true})));}
 try{
  await act(async()=>root.render(el(ResearchWorkbench,{active:true,api:async()=>{throw new Error('No network expected');},download:()=>{},onPrepare:()=>{}})));
  await click('创建实验');await input('实验名称','保留草稿');
  await files([{size:1,text:async()=> ' '.repeat(MAX_RESEARCH_BYTES+1)}]);await settle();
  assert.match(container.querySelector('[role="alert"]').textContent,/超过8MB/);assert.equal(container.querySelector('[aria-label="实验名称"]').value,'保留草稿');
  await files([{size:1,text:()=>new Promise(r=>{resolve=r;})},{size:1,text:async()=>{secondReads++;return '{}';}}]);
  assert.equal(button('创建实验').disabled,true);await click('清空实验台');
  await act(async()=>resolve(JSON.stringify(researchPacket({experiments:[newExperiment('long_full')]}))));await settle();
  assert.ok(container.textContent.includes('实验记录 · 0/20'));assert.equal(secondReads,0);assert.ok(!container.textContent.includes('合并完成'));assert.equal(button('创建实验').disabled,false);
 }finally{await act(async()=>root.unmount());}
});


test('importing two scenarios over the same observation restores the new parameters without retaining prior edits',async()=>{
 const {portfolioExample}=await import('../server/portfolio-example.mjs');
 const {defaultScenario,portfolioScenarioPacket,replayPortfolioScenario}=await import('../server/portfolio-scenarios.mjs');
 const observation=portfolioExample(),scenario=defaultScenario(observation),downloads=[],root=createRoot(container);
 async function file(packet){const n=container.querySelector('[aria-label="选择账户或成交证据文件"]');Object.defineProperty(n,'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify(packet)}]});await act(async()=>n.dispatchEvent(new window.Event('change',{bubbles:true})));await settle();}
 try{
  await act(async()=>root.render(el(AccountWorkbench,{active:true,api:async()=>({available:false}),tick:Date.now(),download:p=>downloads.push(p)})));
  await file(portfolioScenarioPacket(observation,scenario));
  assert.equal(container.querySelector('[aria-label="市场1 shockPct"]').value,'-10');
  scenario.markets[0].shockPct=-20;scenario.markets[0].exitDepthPct=50;
  await file(portfolioScenarioPacket(observation,scenario));
  assert.equal(container.querySelector('[aria-label="市场1 shockPct"]').value,'-20');
  assert.equal(container.querySelector('[aria-label="市场1 exitDepthPct"]').value,'50');
  await click('导出逐市场情景');assert.equal(replayPortfolioScenario(downloads[0]).status,'reproduced');assert.deepEqual(downloads[0].scenario,scenario);
 }finally{await act(async()=>root.unmount());}
});


test('edited market scenarios survive account subview navigation and export the retained values',async()=>{
 const {portfolioExample}=await import('../server/portfolio-example.mjs');
 const {defaultScenario,portfolioScenarioPacket,replayPortfolioScenario}=await import('../server/portfolio-scenarios.mjs');
 const observation=portfolioExample(),scenario=defaultScenario(observation),downloads=[],root=createRoot(container);
 try{
  await act(async()=>root.render(el(AccountWorkbench,{active:true,api:async()=>({available:false}),tick:Date.now(),download:p=>downloads.push(p)})));
  const n=container.querySelector('[aria-label="选择账户或成交证据文件"]');Object.defineProperty(n,'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify(portfolioScenarioPacket(observation,scenario))}]});await act(async()=>n.dispatchEvent(new window.Event('change',{bubbles:true})));await settle();
  await input('市场1 shockPct','-20');await input('市场1 exitDepthPct','50');await input('市场1 fundingBps','3');await input('市场1 exitSlippageBps','25');await input('情景持有小时','12');
  await click('1 实际持仓');await click('2 持仓压力预演');await click('账户风险总览');
  assert.equal(container.querySelector('[aria-label="市场1 shockPct"]').value,'-20');assert.equal(container.querySelector('[aria-label="情景持有小时"]').value,'12');
  await click('导出逐市场情景');const exported=downloads.at(-1);assert.equal(replayPortfolioScenario(exported).status,'reproduced');assert.equal(exported.scenario.hours,12);assert.deepEqual(exported.scenario.markets[0],{...scenario.markets[0],shockPct:-20,exitDepthPct:50,fundingBps:3,exitSlippageBps:25});
  await click('清除本页数据');assert.equal(container.querySelector('[aria-label="市场1 shockPct"]'),null);
 }finally{await act(async()=>root.unmount());}
});


test('research UI separates plan mismatch from verified evidence and prepares the declared parameters',async()=>{
 const {createTestPlan}=await import('../frontend-source/testnet-plan.mjs');
 const {attachResearchEvidence,researchPacket}=await import('../frontend-source/research-workspace.mjs');
 const e=attachResearchEvidence(createTestPlan({marketId:16,notional:10,leverage:2,slippageBps:50}).evidence.research.workspace.experiments[0],guidedReview());
 const prepared=[],root=createRoot(container);
 try{
  await act(async()=>root.render(el(ResearchWorkbench,{active:true,api:async()=>{throw new Error('No network expected');},download:()=>{},onPrepare:e=>prepared.push(e)})));
  const n=container.querySelector('[aria-label="恢复研究工作区"]');Object.defineProperty(n,'files',{configurable:true,value:[{size:100,text:async()=>JSON.stringify(researchPacket({experiments:[e]}))}]});await act(async()=>n.dispatchEvent(new window.Event('change',{bubbles:true})));await settle();
  const progress=container.querySelector('[aria-label="本轮验收进度"]');assert.ok(progress.textContent.includes('事前对照已匹配'));assert.ok(progress.textContent.includes('计划条件与基线不符'));assert.ok(progress.textContent.includes('比较准入未通过'));assert.ok(!progress.textContent.includes('基线未匹配'));
  await click('准备多头预演（2× / 计划条件）');assert.deepEqual(prepared[0].plan,e.plan);
 }finally{await act(async()=>root.unmount());}
});


test('judge entry labels real summary limits and keeps synthetic navigation and anonymous download explicit',async()=>{
 const downloads=[],calls=[],root=createRoot(container);
 try{
  await act(async()=>root.render(el(JudgeEvidence,{onExample:()=>calls.push('synthetic'),onResearch:()=>calls.push('research'),download:p=>downloads.push(p)})));
  assert.ok(container.textContent.includes('不是公开链上证明'));assert.ok(container.textContent.includes('原始档案未公开'));
  await click('体验合成完整流程');await click('进入测试网实验台');await click('下载匿名验收摘要');assert.deepEqual(calls,['synthetic','research']);assert.equal(downloads[0].schema,'public-acceptance-summary-v1');assert.equal(downloads[0].independentlyVerifiableFromSummary,false);
  assert.ok([...container.querySelectorAll('a')].some(a=>a.href.endsWith('/docs/JUDGE_GUIDE.md')));
 }finally{await act(async()=>root.unmount());}
});
