import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env={...process.env,TP_ENABLE_TESTNET_ORDERS:'false'};
for(const key of Object.keys(env))if(/^PERPL_.*API_KEY/.test(key))delete env[key];
// Demo launch cannot inherit account access or order enablement from the host.
const child=spawn(process.execPath,['--use-env-proxy',path.join(root,'server/index.mjs')],{cwd:root,env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
child.once('error',error=>{console.error(error.message);process.exitCode=1;});
child.once('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
