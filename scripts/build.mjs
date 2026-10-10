import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await fs.mkdir(path.join(root,'dist'),{recursive:true});
await build({absWorkingDir:root,entryPoints:['frontend-source/main.jsx'],bundle:true,minify:true,format:'esm',target:['es2022'],outfile:'dist/app.js',legalComments:'linked',metafile:true,define:{'process.env.NODE_ENV':'"production"'}}).then(async r=>{await fs.writeFile(path.join(root,'dist/build-meta.json'),JSON.stringify(r.metafile,null,2));});
await fs.copyFile(path.join(root,'frontend-source/index.html'),path.join(root,'dist/index.html'));
console.log('Built independent TradePilot frontend in dist/');

const notices=await Promise.all(['react','react-dom','scheduler','lightweight-charts','lucide-react','ethers'].map(async name=>`=== ${name} ===\n${await fs.readFile(path.join(root,'node_modules',name,name==='ethers'?'LICENSE.md':'LICENSE'),'utf8')}`));
for (const name of ['lightweight-charts-NOTICE.txt','fancy-canvas-LICENSE.txt']) notices.push(`=== ${name} ===\n${await fs.readFile(path.join(root,'docs/licenses',name),'utf8')}`);
await fs.writeFile(path.join(root,'dist/licenses.txt'),notices.join('\n\n'));
