import fs from 'node:fs';
import {acceptanceSummary} from '../server/acceptance-summary.mjs';
const [reviewedOn,output,...files]=process.argv.slice(2);
if(!output||!files.length)throw new Error('Usage: node scripts/acceptance-summary.mjs YYYY-MM-DD output.json research.json [research.json ...]');
const summary=acceptanceSummary(files.map(f=>JSON.parse(fs.readFileSync(f,'utf8'))),reviewedOn);
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({status:'replayed',counts:summary.counts}));
