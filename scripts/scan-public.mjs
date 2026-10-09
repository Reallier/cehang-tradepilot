// Privacy supplement to Gitleaks. Reports locations/rules only, never matched values.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
if(!files.length)throw new Error('No tracked files to inspect');
const rules=[
 ['local-home',/\/(?:Users|home)\/[^/\s]+/g],
 ['private-network',/\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g],
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
 ['personal-email',/\b[A-Z0-9._%+-]+@(?:gmail|qq|163|126|outlook|hotmail|icloud)\.com\b/gi],
 ['wechat-id',/wxid_[a-z0-9_]+/gi],
 ['credential-url',/https?:\/\/[^\s/@:]+:[^\s/@]+@/g]
];
const findings=[];
for(const file of files){
 if(/(^|\/)(?:node_modules|data|dist|releases|\.data-app-offline)(\/|$)|(^|\/)\.env(?:\.|$)|\.(?:env|pem|key|p12|tar\.gz|zip|log)$/.test(file))findings.push({file,rule:'forbidden-path'});
 const absolute=path.join(root,file);if(fs.lstatSync(absolute).isSymbolicLink()){findings.push({file,rule:'symlink'});continue;}
 const bytes=fs.readFileSync(absolute);if(bytes.includes(0)){findings.push({file,rule:'unreviewed-binary'});continue;}
 const value=bytes.toString('utf8');
 for(const [rule,re]of rules)for(const match of value.matchAll(re))findings.push({file,line:value.slice(0,match.index).split('\n').length,rule});
}
console.log(JSON.stringify({files:files.length,findings},null,2));
if(findings.length)process.exitCode=1;
