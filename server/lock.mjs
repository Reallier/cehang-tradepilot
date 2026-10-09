import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export function acquireLock(root){const file=path.join(root,'.writer.lock'),id=randomUUID();
  for(let attempt=0;attempt<3;attempt++){
    try{const fd=fs.openSync(file,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({pid:process.pid,id}));fs.fsyncSync(fd);fs.closeSync(fd);return ()=>{try{if(JSON.parse(fs.readFileSync(file,'utf8')).id===id)fs.unlinkSync(file);}catch{}};}
    catch(error){if(error.code!=='EEXIST')throw error;let owner;try{owner=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw new Error('写入锁损坏，请人工检查，不会自动删除');}
      try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH'){fs.unlinkSync(file);continue;}throw new Error('无法确认写入进程状态，拒绝启动');}
      throw new Error('同一数据目录已有写入进程，拒绝启动第二实例');
    }
  }
  throw new Error('无法获取独占写入锁');
}
