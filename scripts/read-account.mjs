import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {Store} from '../server/store.mjs';
import {AccountReader,accountReadiness,collectAccount} from '../server/account-readonly.mjs';

// No HTTP listener and no credential values/account identities in console output.
try {
  const {values}=parseArgs({options:{config:{type:'string'},collect:{type:'boolean',default:false}}});
  if(!values.config)throw new Error('CONFIG_REQUIRED');
  const filename=path.resolve(values.config),config=JSON.parse(fs.readFileSync(filename,'utf8'));
  const relative=value=>{if(typeof value!=='string'||!value)throw new Error('CONFIG_PATH_MISSING');return path.resolve(path.dirname(filename),value);};
  const stateDir=relative(config.stateDir),eligibilityFile=path.join(stateDir,'eligibility_testnet.json');
  const eligibility=fs.existsSync(eligibilityFile)?JSON.parse(fs.readFileSync(eligibilityFile,'utf8')):null;
  const reader=new AccountReader(new Store(stateDir));
  const readiness=accountReadiness({eligibility,expectedWallet:config.expectedWallet,keyConfigured:Boolean(reader.key('testnet'))});
  const restriction=reader.store.exists('restriction_testnet')?reader.store.get('restriction_testnet'):null;
  if(restriction?.blocked){readiness.blockers.push('PROTOCOL_RESTRICTION_BLOCKED');readiness.ready=false;}
  if(!values.collect||!readiness.ready){console.log(JSON.stringify(readiness,null,2));if(!readiness.ready)process.exitCode=2;}
  else {
    const packet=await collectAccount(reader,{eligibility,expectedWallet:config.expectedWallet});
    const output=new Store(relative(config.outputDir));
    const saved=output.create('account_observation',packet);
    console.log(JSON.stringify({status:packet.report.status,accountCount:packet.report.accountCount,positionCount:packet.report.positionCount,recordId:saved.id,privateOutput:true},null,2));
  }
}catch(e){
  // Never print upstream bodies, arbitrary exception text or environment values.
  const safe=['CONFIG_REQUIRED','CONFIG_PATH_MISSING','WALLET_IDENTITY_MISMATCH','NETWORK_OR_HEAD_INVALID','ACCOUNT_SCHEMA_INVALID','ACCOUNT_IDENTITY_OR_BALANCE_INVALID','POSITION_IDENTITY_INVALID','POSITION_INSTANCE_MISMATCH','POSITION_STAMP_INVALID','POSITION_EVENT_NOT_SNAPSHOT','POSITION_VALUES_INVALID','SNAPSHOT_STAMP_INVALID'];
  const match=/返回 (\d{3})/.exec(e.message??'');
  console.error(JSON.stringify({status:'read_failed',code:safe.includes(e.code??e.message)?e.code??e.message:match?`UPSTREAM_${match[1]}`:'READ_OR_CONFIG_ERROR',retryAutomatically:false}));process.exitCode=1;
}
