import fs from 'node:fs';
import {CAPABILITIES} from '../server/capabilities.mjs';
const arg=process.argv.indexOf('--test-log'),file=arg>=0?process.argv[arg+1]:null;
if(!file)throw new Error('Usage: node scripts/capability-docs.mjs --test-log /absolute/completed-test.log');
const text=fs.readFileSync(file,'utf8'),tests=Number(text.match(/(?:ℹ|#) tests (\d+)/)?.[1]),pass=Number(text.match(/(?:ℹ|#) pass (\d+)/)?.[1]),fail=Number(text.match(/(?:ℹ|#) fail (\d+)/)?.[1]);
if(!tests||pass!==tests||fail!==0)throw new Error('需要完整成功的测试结果，不能据此生成通过声明');
const impl={implemented:'已实现',planned:'待扩展',disabled:'关闭'},real={limited_verified:'有限历史样本通过',market_read_verified:'市场读取已验证',pending:'待真实链端验收',not_applicable:'不适用'};
const body=`# 当前能力与验证范围\n\n本文件由 server/capabilities.mjs 和成功测试摘要生成。测试记录：${new Date().toISOString()}，${pass}/${tests} 通过；它记录此次运行，不保证后来改动自动通过。\n\n| 能力 | 实现 | 自动覆盖 | 测试网 | 边界 |\n|---|---|---|---|---|\n`+CAPABILITIES.map(c=>`| ${c.label} | ${impl[c.implementation]} | ${c.automated?'有':'无'} | ${real[c.testnet]} | ${c.boundary} |`).join('\n')+'\n\n自动回归、合成案例和实际测试网证据分开统计。实施测试计划不会增加实际成交或用户数。发布与运行验收见 PUBLIC_LAUNCH.md；真人使用反馈和比赛视频仍是独立交付事项。\n';
fs.writeFileSync(new URL('../docs/CURRENT_CAPABILITIES.md',import.meta.url),body);console.log(JSON.stringify({tests,pass,output:'docs/CURRENT_CAPABILITIES.md'}));
