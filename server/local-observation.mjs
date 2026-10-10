import fs from 'node:fs';
import {replayAccount} from './account-readonly.mjs';
export function localObservation(config,filename){
  if(!filename||config.host!=='127.0.0.1'||config.secure||config.basePath||!config.origins.every(o=>['127.0.0.1','localhost'].includes(new URL(o).hostname)))return {available:false};
  const stat=fs.statSync(filename);if(!stat.isFile()||stat.size>4*1024*1024)throw new Error('本机观察文件无效');
  const packet=JSON.parse(fs.readFileSync(filename,'utf8'));replayAccount(packet);
  return {available:true,packet};
}
