import {replayComparison} from './comparison.mjs';
import {decisionPacket} from './decision-metrics.mjs';
import {hash} from './integrity.mjs';
export function replayPlanDecision(packet){
 if(packet?.schema!=='plan-decision-review-v1')throw new Error('需要完整的方案决策证据');
 replayComparison(packet.evidence.comparison);
 const reproduced=decisionPacket(packet.evidence.comparison,packet.evidence.limits);
 if(hash(reproduced)!==hash(packet))throw new Error('方案预算或决策结果无法复现');
 return {status:'reproduced',classification:'simulation_decision',plans:reproduced.report.plans.map(p=>p.status),note:'用户预算与静态情景判定，不是成交承诺或收益预测'};
}
