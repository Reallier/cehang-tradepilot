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
await build({stdin:{contents:"export {AccountWorkbench} from './frontend-source/dashboard/AccountWorkbench.jsx';export {PlanComparison} from './frontend-source/dashboard/PlanComparison.jsx';export {Workspace} from './frontend-source/ui.jsx';",resolveDir:rootDir},bundle:true,format:'esm',platform:'node',packages:'external',loader:{'.css':'empty'},outfile});
const {AccountWorkbench,PlanComparison,Workspace}=await import(pathToFileURL(outfile));
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
