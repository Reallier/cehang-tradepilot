import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export const hash = value => createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export class Store {
  constructor(root) {this.root=root;fs.mkdirSync(root,{recursive:true,mode:0o700});fs.chmodSync(root,0o700);}
  file(id){if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new Error('记录ID无效');return path.join(this.root,`${id}.json`);}
  save(id,value){const target=this.file(id),temp=`${target}.${randomUUID()}.tmp`;const fd=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,target);const dir=fs.openSync(this.root,'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}return value;}
  get(id){return JSON.parse(fs.readFileSync(this.file(id),'utf8'));}
  exists(id){return fs.existsSync(this.file(id));}
  list(prefix=''){return fs.readdirSync(this.root).filter(x=>x.startsWith(prefix)&&x.endsWith('.json')).map(x=>this.get(x.slice(0,-5))).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
  create(kind,value){const id=`${kind}_${randomUUID()}`;return this.save(id,{...value,id,createdAt:new Date().toISOString()});}
  // Intent updates and events are durable before a network submit. No retry loop.
  event(kind,details){return this.create('event',{kind,details});}
}
