// A plan is an explicit constraint, never inferred from editable notes in legacy archives.
export function validateExperimentPlan(p){
 if(!p||Object.keys(p).sort().join()!=='leverage,marketId,notional,slippageBps'||!Number.isSafeInteger(p.marketId)||p.marketId<1||!Number.isFinite(p.notional)||p.notional<=0||p.notional>1000||!Number.isFinite(p.leverage)||p.leverage<1||p.leverage>5||!Number.isInteger(p.slippageBps)||p.slippageBps<1||p.slippageBps>100)throw new Error('固定计划参数无效');
 return p;
}
export function matchExperimentPlan(plan,baseline){
 if(plan==null)return {status:'not_declared',differences:[]};validateExperimentPlan(plan);
 if(!baseline)return {status:'needs_baseline',differences:[]};
 const r=baseline.evidence.preview.result,actual={marketId:r.marketId,notional:r.input.notional,leverage:r.input.leverage,slippageBps:r.input.slippageBps};
 const labels={marketId:'市场',notional:'请求名义金额',leverage:'杠杆',slippageBps:'滑点上限'};
 const differences=Object.keys(labels).filter(k=>actual[k]!==plan[k]).map(key=>({key,label:labels[key],expected:plan[key],actual:actual[key]}));
 return {status:differences.length?'mismatch':'matched',differences};
}
export function prepareExperiment(experiment,currentInput){
 const direction=experiment.kind==='short_full'?'short':'long',plan=experiment.plan==null?null:validateExperimentPlan(experiment.plan);
 return {network:'testnet',marketId:plan?.marketId??null,input:{...currentInput,direction,hours:0,shockPct:direction==='short'?5:-5,leverage:plan?.leverage??1,...(plan?{notional:plan.notional,slippageBps:plan.slippageBps}:{})}};
}
