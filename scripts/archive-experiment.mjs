import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {archiveExperiment} from '../server/research-archive.mjs';
import {MAX_RESEARCH_BYTES} from '../frontend-source/research-workspace.mjs';
try{
 const {values:v}=parseArgs({options:Object.fromEntries(['workspace','history','experiment','target','output-dir'].map(k=>[k,{type:'string'}]))});
 if(Object.values(v).length!==5||Object.values(v).some(x=>!x))throw new Error('REQUIRED_ARGUMENTS');
 const read=f=>{const size=fs.statSync(f).size;if(size>MAX_RESEARCH_BYTES)throw new Error('FILE_TOO_LARGE');const raw=fs.readFileSync(f);if(raw.length>MAX_RESEARCH_BYTES)throw new Error('FILE_TOO_LARGE');return JSON.parse(raw);};
 const result=archiveExperiment({workspace:read(v.workspace),history:read(v.history),experimentId:v.experiment,target:read(v.target)});
 const dir=path.resolve(v['output-dir']);
 // Require a fresh directory, so interrupted/repeated runs cannot overwrite an archive.
 fs.mkdirSync(dir,{mode:0o700});
 for(const [name,value] of Object.entries(result)){const file=path.join(dir,`${name}.json`);const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
 fs.writeFileSync(path.join(dir,'COMPLETE'),new Date().toISOString(),{flag:'wx',mode:0o600});
 console.log(JSON.stringify({status:'archived',privateOutput:true,state:result.summary.state,opening:result.summary.progress.opening,settlement:result.summary.progress.settlement,baseline:result.summary.progress.comparison}));
}catch{console.error(JSON.stringify({status:'archive_failed',hint:'检查参数、材料复算、实验/账户目标以及输出目录是否全新；未完成目录不可作为验收结果。',retryAutomatically:false}));process.exitCode=1;}
