import {newExperiment,researchPacket,replayResearch} from './research-workspace-v2.mjs';
import {hash} from '../server/integrity.mjs';
export const TEST_PLAN_SCHEMA='testnet-experiment-plan-v1';
export function createTestPlan({marketId,notional,leverage,slippageBps,repetitions=2},now=Date.now()){
 if(!Number.isSafeInteger(marketId)||marketId<1||!Number.isFinite(notional)||notional<=0||notional>1000||!Number.isFinite(leverage)||leverage<1||leverage>5||!Number.isInteger(slippageBps)||slippageBps<0||slippageBps>100||!Number.isInteger(repetitions)||repetitions<1||repetitions>3)throw new Error('计划参数超出测试边界');
 const input={marketId,notional,leverage,slippageBps,repetitions},experiments=[];
 for(const kind of ['long_full','short_full','partial'])for(let i=0;i<repetitions;i++){
  const e=newExperiment(kind,crypto.randomUUID(),now);e.title+=` · 对照${i+1}`;
  e.purpose+=` 固定市场${marketId}，名义金额${notional}，杠杆${leverage}×，滑点${slippageBps}bps；每次使用新行情和新基线。`;
  e.notes='计划尚未执行，不是成交。先用当前市场过滤规则检查最小数量与金额；准备就绪后保存新基线。分批退出先退出50%再退出剩余，若最小数量不允许则记录不可执行，不扩大资金。';experiments.push(e);
 }
 const evidence={createdAt:new Date(now).toISOString(),chainId:10143,input,research:researchPacket({experiments}),steps:['检查测试网络、独立测试账户、最小数量和资金','准备参数；临近操作才预演并保存基线','官方测试页面完成交易并确认；本工具不下单','有仓位时先结束原实验，不重复开仓','按实验目标定向读取历史与回执','离线归档、复算、按真实生命周期去重'],note:'不设收益目标，不保证成交或盈利。计划仅为实验组织；基线过期不能补造。新类型的真实链端覆盖须由实际证据确认。'};
 return {schema:TEST_PLAN_SCHEMA,evidence,evidenceHash:hash(evidence)};
}
export function replayTestPlan(p){if(p?.schema!==TEST_PLAN_SCHEMA||hash(p.evidence)!==p.evidenceHash)throw new Error('测试计划格式无效');const {input,createdAt,research}=p.evidence;const expected=createTestPlan(input,Date.parse(createdAt));replayResearch(research);if(research.workspace.experiments.length!==expected.evidence.research.workspace.experiments.length)throw new Error('计划实验数量不符');for(let i=0;i<research.workspace.experiments.length;i++){const actual=research.workspace.experiments[i],template=expected.evidence.research.workspace.experiments[i];if(hash({...actual,id:template.id})!==hash(template))throw new Error('计划实验内容已改变');}expected.evidence.research=research;if(hash(expected.evidence)!==p.evidenceHash)throw new Error('测试计划无法复算');return {status:'reproduced',planned:research.workspace.experiments.length,actualTrades:0};}
