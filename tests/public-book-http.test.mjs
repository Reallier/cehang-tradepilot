import test from 'node:test';import assert from 'node:assert/strict';
import http from 'node:http';import {once} from 'node:events';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {Perpl} from '../server/perpl.mjs';import {fixture} from './risk-fixture.mjs';
test('public live/preview/compare use the same bounded WebSocket source and remain credential free',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'tp-feed-http-'));
 Object.assign(process.env,{TP_DATA_DIR:temp,TP_PORT:'8780',TP_BASE_PATH:'',TP_PUBLIC_ORIGIN:'https://demo.example.org'});
 const original={context:Perpl.prototype.context,cached:Perpl.prototype.cached,ws:globalThis.WebSocket};
 const f=fixture();f.market.state.at.t=Date.now();f.book.at.t=f.market.state.at.t;f.input={...f.input,notional:50,shockPct:-5};let sockets=0;
 Perpl.prototype.context=async()=>({value:f.context,source:{url:'https://testnet.perpl.xyz/api/v1/pub/context'}});
 Perpl.prototype.cached=async function(network,target){assert.equal(this.key(network),null);assert.ok(target.includes('/candles/'),'REST book must not be requested');return {value:{d:[]},source:{url:'https://testnet.perpl.xyz/api'+target}};};
 globalThis.WebSocket=class extends EventTarget{
  constructor(url){super();assert.equal(url,'wss://testnet.perpl.xyz/ws/v1/market-data');sockets++;queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
  send(raw){assert.deepEqual(JSON.parse(raw),{mt:5,subs:[{stream:'order-book@1',subscribe:true}]});
   queueMicrotask(()=>{for(const frame of [{mt:6,subs:[{stream:'order-book@1',sid:1,status:{code:0}}]},{...f.book,mt:15,sn:100,sid:1,bid:f.book.bid.map(r=>({...r,o:1})),ask:f.book.ask.map(r=>({...r,o:1}))}])this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(frame)}));});
  }close(){}
 };
 const {server}=await import('../server/index.mjs');server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;
 let cookie,token;
 const request=(route,body)=>new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:route,method:body?'POST':'GET',headers:{host:'demo.example.org',...(cookie?{cookie}:{}),...(body?{origin:'https://demo.example.org','content-type':'application/json','x-tradepilot-token':token}:{})}},res=>{let raw='';res.on('data',x=>raw+=x);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(raw)}));});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
 });
 try{
  const s=await request('/api/session');cookie=s.headers['set-cookie'][0].split(';')[0];token=s.data.token;
  const live=await request('/api/live?network=testnet&market=1');assert.equal(live.status,200);assert.equal(live.data.sources[1].transport,'websocket');
  const preview=await request('/api/preview',{network:'testnet',marketId:1,input:f.input});assert.equal(preview.status,200);assert.equal(preview.data.result.riskPass,true);
  const comparison=await request('/api/compare',{network:'testnet',marketId:1,inputs:[f.input,{...f.input,leverage:1}]});assert.equal(comparison.status,200);
  assert.equal(sockets,1);assert.equal(preview.data.sources[1].sha256,comparison.data.sources[1].sha256);
  assert.equal((await request('/api/testnet/submit',{})).status,403);
 }finally{await new Promise(r=>server.close(r));Perpl.prototype.context=original.context;Perpl.prototype.cached=original.cached;globalThis.WebSocket=original.ws;await fs.rm(temp,{recursive:true,force:true});}
});
