import {hash} from './integrity.mjs';
import {analyzeAccount} from './account-analysis.mjs';
const ACCOUNT_SCHEMA='account-observation-v1';
const fail=code=>{throw new Error(code);};
export function replayAccount(packet) {
  if(packet.schema!==ACCOUNT_SCHEMA||!['private_account_observation','synthetic_account_observation'].includes(packet.classification)||hash(packet.snapshot)!==packet.snapshotHash||hash(packet.report)!==packet.reportHash||hash(analyzeAccount(packet.snapshot))!==packet.reportHash)fail('ACCOUNT_REPLAY_MISMATCH');
  return {status:'reproduced',classification:packet.classification,note:'仅复算保存的观察；不证明来源真实性或链上成交。'};
}
