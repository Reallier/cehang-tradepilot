import {SCENARIO_SCHEMA,replayPortfolioScenario} from '../server/portfolio-scenarios.mjs';
import {verifyObservation,replayWorkflow} from './account-workflow.mjs';
import {importTradeReview,replayWorkspaceReview} from './trade-review.mjs';
import {verifyBaseline} from '../server/pretrade-baseline.mjs';
import {PORTFOLIO_SCHEMA,replayPortfolio} from '../server/portfolio-risk.mjs';
export const EVIDENCE_FILES=[
 ['账户观察','account-observation-v1','只读采集导出；用于持仓与压力分析，不证明成交。'],
 ['持仓复盘 / 组合总览','account-workflow-review-v1 / account-portfolio-review-v1','本页导出；重新导入恢复保存的情景。'],
 ['成交历史 / 成交复盘','trade-history-observation-v1 / testnet-history-audit-v1 / testnet-trade-review-v2','历史采集或核验工具导出；需要原始历史和保存回执。'],
 ['完整成交工作区','account-trade-workspace-v1','本页导出；包含成交材料及当时选用的基线。'],
 ['事前基线','pretrade-baseline-v1','交易前在市场预演页保存；导入后与当前成交对照。']
];
// Return a complete, verified replacement before callers mutate any workspace state.
export async function prepareEvidence(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('UNSUPPORTED_EVIDENCE');
 if(p.schema==='pretrade-baseline-v1'){verifyBaseline(p);return {kind:'baseline',baseline:p,label:'事前基线已读取；对应关系需结合成交核验'};}
 let advancedScenario=null,observation=p,trade=null,baseline=null,replaceBaseline=true,shock=-10,selection=null,view='overview',label='账户观察已读取';
 if(p.schema===SCENARIO_SCHEMA){replayPortfolioScenario(p);observation=p.observation;advancedScenario=p.scenario;label='逐市场情景已复算并恢复';}
 else if(p.schema===PORTFOLIO_SCHEMA){replayPortfolio(p);observation=p.observation;shock=p.shockPct;label='组合总览已复算；已恢复保存的情景';}
 else if(p.schema==='account-workflow-review-v1'){await replayWorkflow(p);observation=p.observation;shock=p.scenario.shockPct;selection=`${p.review.accountId}:${p.review.positionId}`;view='stress';label='持仓复盘已复算；已恢复持仓与情景';}
 else if(p.schema==='account-trade-workspace-v1'){replayWorkspaceReview(p);trade=p.trade;baseline=p.baseline;observation=trade.observation.evidence.account;view='review';label='成交工作区已读取；请检查逐笔核验结果';}
 else if(['testnet-history-audit-v1','testnet-trade-review-v2','testnet-trade-review-v3','trade-history-observation-v1'].includes(p.schema)){trade=importTradeReview(p);observation=trade.observation.evidence.account;replaceBaseline=false;view='review';label='成交材料已读取；请检查覆盖范围与逐笔核验结果';}
 else if(p.schema!=='account-observation-v1')throw new Error('UNSUPPORTED_EVIDENCE');
 await verifyObservation(observation);
 const r=observation.report.positions.find(p=>p.risk);
 return {kind:'workspace',advancedScenario,observation,trade,baseline,replaceBaseline,shock,selection:selection??(r?`${r.accountId}:${r.positionId}`:''),view,label};
}
export async function parseEvidence(text,size=new TextEncoder().encode(text).length){
 if(size>4*1024*1024)throw new Error('FILE_TOO_LARGE');
 return prepareEvidence(JSON.parse(text));
}
