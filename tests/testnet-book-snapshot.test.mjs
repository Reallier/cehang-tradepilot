import test from 'node:test';
import assert from 'node:assert/strict';
import {readTestnetBookSnapshot} from '../server/testnet-book-snapshot.mjs';
import {Perpl} from '../server/perpl.mjs';
import {hash} from '../server/integrity.mjs';
import {manualBaselinePreview} from '../server/manual-baseline.mjs';
import {createBaseline,verifyBaseline} from '../server/pretrade-baseline.mjs';
import {fixture} from './risk-fixture.mjs';

const f=fixture(),now=()=>f.now;
const ack=()=>({mt:6,subs:[{stream:'order-book@1',sid:11,status:{code:0}}]});
const book=()=>({mt:15,sid:11,sn:100,at:{b:100,t:f.now},bid:[{p:9900,s:20000,o:2}],ask:[{p:10000,s:1000,o:1}]});
function setup(events){
 const sockets=[],states=new Map();
 const store={exists:k=>states.has(k),get:k=>states.get(k),save:(k,v)=>states.set(k,v)};
 const reader=new Perpl(store,{now});
 class Socket extends EventTarget{
  constructor(url){super();this.url=url;this.sent=[];this.closed=false;sockets.push(this);queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
  send(value){this.sent.push(JSON.parse(value));queueMicrotask(()=>{
   for(const item of events){if(this.closed)break;
    if(item==='close'||item==='error'){this.dispatchEvent(new Event(item));continue;}
    this.dispatchEvent(new MessageEvent('message',{data:typeof item==='string'?item:JSON.stringify(item)}));
   }
  });}
  close(){this.closed=true;}
 }
 return {reader,sockets,states,run:options=>readTestnetBookSnapshot(reader,1,{WebSocketImpl:Socket,now,timeoutMs:30,...options})};
}
test('one public subscription yields exact snapshot provenance and a reproducible short baseline',async()=>{
 for(const events of [[ack(),book()],[book(),ack()]]){
  const h=setup(events),result=await h.run(),s=h.sockets[0];
  assert.equal(s.url,'wss://testnet.perpl.xyz/ws/v1/market-data');
  assert.deepEqual(s.sent,[{mt:5,subs:[{stream:'order-book@1',subscribe:true}]}]);
  assert.equal(s.closed,true);assert.equal(h.sockets.length,1);assert.equal(h.reader.calls.length,1);
  assert.equal(result.source.sha256,hash(JSON.stringify(book())));assert.equal(result.source.chainId,10143);
  assert.equal(result.source.stream,'order-book@1');assert.equal(result.source.transport,'websocket');
  const p=manualBaselinePreview({...f,book:result.value,marketId:1,rawSize:100,direction:'short',sources:[result.source]});
  verifyBaseline(createBaseline(p,f.now));assert.equal(p.result.riskPass,true);
 }
});
test('unconfirmed, wrong-subscription and incremental frames never become snapshots',async()=>{
 const wrong=ack();wrong.subs[0].stream='order-book@2';
 const wrongId=book();wrongId.sid=12;
 const duplicate=ack();duplicate.subs.push({...duplicate.subs[0]});
 for(const [frames,code]of [
  [[book()],'WS_SNAPSHOT_TIMEOUT'],[[wrong,book()],'WS_SUBSCRIPTION_MISMATCH'],
  [[ack(),wrongId],'WS_SUBSCRIPTION_MISMATCH'],[[duplicate],'WS_SUBSCRIPTION_MISMATCH'],
  [[ack(),{...book(),mt:16}],'WS_UNEXPECTED_FRAME'],[[book(),book()],'WS_DUPLICATE_SNAPSHOT'],
  [[{...ack(),subs:[{stream:'order-book@1',sid:11}]}],'WS_SUBSCRIPTION_REJECTED']
 ]){const h=setup(frames);await assert.rejects(h.run(),new RegExp(code));assert.equal(h.sockets[0].closed,true);assert.equal(h.sockets.length,1);}
});
test('stale/future or malformed depth, prices, sequence and stamps fail closed',async()=>{
 const mutations=[b=>b.at.t-=45001,b=>b.at.t+=5001,b=>b.sn=101,b=>delete b.at.t,b=>b.bid=[],
  b=>b.bid[0].o=0,b=>b.ask[0].s=-1,b=>b.bid[0].p=10000,b=>b.bid.push({...b.bid[0]}),
  b=>b.ask.push({p:9999,s:1,o:1}),b=>b.sn='100'];
 for(const mutate of mutations){const b=book();mutate(b);const h=setup([ack(),b]);await assert.rejects(h.run(),/WS_BOOK_(STALE|INVALID)/);assert.equal(h.sockets[0].closed,true);}
});
test('timeouts, disconnects, protocol errors and oversized frames close without reconnect',async()=>{
 for(const [frames,code]of [[[],'WS_SNAPSHOT_TIMEOUT'],[['close'],'WS_CLOSED_BEFORE_SNAPSHOT'],[['error'],'WS_CONNECTION_FAILED'],[['not-json'],'WS_FRAME_INVALID'],[['x'.repeat(4*1024*1024+1)],'WS_FRAME_BUDGET'],[[null],'WS_UNEXPECTED_FRAME']]){
  const h=setup(frames);await assert.rejects(h.run(),new RegExp(code));assert.equal(h.sockets.length,1);assert.equal(h.sockets[0].closed,true);
 }
});
test('existing restriction/cooldown gates and subscription 429/451 remain enforced',async()=>{
 for(const status of [429,451]){
  const rejected=ack();rejected.subs[0].status.code=status;
  const h=setup([rejected]);await assert.rejects(h.run());
  if(status===429)assert.ok(h.reader.cooldowns.get('testnet')>f.now);
  else assert.equal(h.states.get('restriction_testnet').blocked,true);
  await assert.rejects(h.run());assert.equal(h.sockets.length,1);
 }
 const h=setup([]);await assert.rejects(h.run({timeoutMs:12001}),/WS_PARAMETERS_INVALID/);assert.equal(h.sockets.length,0);
});
