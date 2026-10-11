import test from 'node:test';import assert from 'node:assert/strict';
import {feedQuality} from '../frontend-source/feed-quality.mjs';
import {DemoSessionClient} from '../frontend-source/demo-session.mjs';
import {PublicBookFeed} from '../server/public-book-feed.mjs';
const now=1791500000000;
const live=()=>({network:'testnet',selectedId:1,markets:[{marketId:1,sourceMs:now}],book:['ask','bid'].map(side=>({side,sourceTime:new Date(now).toISOString()})),sources:[{transport:'websocket',stream:'order-book@1'}]});
test('fresh price never hides stale, absent, future or wrong-market book',()=>{
 const good=live();assert.equal(feedQuality(good,'testnet',1,now).fresh,true);
 for(const change of [v=>v.book[0].sourceTime=new Date(now-46000).toISOString(),v=>v.book.pop(),v=>v.book[0].sourceTime='invalid',v=>v.book[0].sourceTime=new Date(now+6000).toISOString(),v=>v.selectedId=2,v=>v.network='mainnet']){
  const v=live();change(v);assert.equal(feedQuality(v,'testnet',1,now).fresh,false);
 }
 const stale=live();stale.book.forEach(r=>r.sourceTime=new Date(now-46000).toISOString());
 const q=feedQuality(stale,'testnet',1,now);assert.equal(q.price.state,'fresh');assert.equal(q.book.state,'stale');assert.equal(q.transport,'WebSocket 快照');
 assert.equal(feedQuality(good,'testnet',1,now,'failed').fresh,false);
});
function feedFixture(snapshot){
 let clock=now;const states=new Map(),reader={store:{exists:k=>states.has(k),get:k=>states.get(k)},cooldowns:new Map(),cached:async()=>({rest:true})};
 return {reader,states,advance:ms=>clock+=ms,feed:new PublicBookFeed(reader,{snapshot,now:()=>clock})};
}
test('web visitors, previews and comparisons share one in-flight snapshot and cache',async()=>{
 let resolve,calls=0;const h=feedFixture(()=>{calls++;return new Promise(r=>resolve=r);});
 const a=h.feed.read('testnet',1),b=h.feed.read('testnet',1);await Promise.resolve();assert.equal(calls,1);
 resolve({value:{at:{t:now}},source:{transport:'websocket'}});const results=await Promise.all([a,b]);assert.strictEqual(results[0],results[1]);
 assert.strictEqual(await h.feed.read('testnet',1),results[0]);assert.equal(calls,1);
 assert.deepEqual(await h.feed.read('mainnet',1),{rest:true});
 h.advance(15001);const c=h.feed.read('testnet',1);await Promise.resolve();assert.equal(calls,2);resolve({next:true});await c;
});
test('socket concurrency, failure backoff and persistent restriction cannot be bypassed by cache',async()=>{
 const releases=[];let calls=0;const h=feedFixture(()=>{calls++;return new Promise((resolve,reject)=>releases.push({resolve,reject}));});
 const a=h.feed.read('testnet',1),b=h.feed.read('testnet',2);await Promise.resolve();
 await assert.rejects(h.feed.read('testnet',3),/繁忙/);assert.equal(calls,2);
 releases[0].resolve({ok:true});releases[1].reject(new Error('snapshot failed'));await a;await assert.rejects(b,/snapshot failed/);
 await assert.rejects(h.feed.read('testnet',2),/snapshot failed/);assert.equal(calls,2);
 h.reader.cooldowns.set('testnet',now+60000);await assert.rejects(h.feed.read('testnet',1),/冷却/);
 h.reader.cooldowns.clear();h.states.set('restriction_testnet',{blocked:true});await assert.rejects(h.feed.read('testnet',1),/阻断/);
});
const response=(data,status=200)=>({ok:status===200,status,headers:new Headers(),json:async()=>data});
const session=token=>({token,expiresAt:new Date(now+1800000).toISOString()});
test('session recovery coalesces, keeps client evidence independent and never replays a failed POST',async()=>{
 const calls=[];let expired=0,count=0;
 const client=new DemoSessionClient({onExpired:()=>expired++,request:async(url,init)=>{calls.push({url,init});return url==='./api/session'?response(session(`session-${++count}`)):response({error:'expired'},401);}});
 const [a,b]=await Promise.all([client.connect(),client.connect()]);assert.strictEqual(a,b);assert.equal(calls.length,1);
 await assert.rejects(client.api('/api/preview',{input:'unchanged'}),/会话已过期/);assert.equal(expired,1);assert.equal(calls.length,2);
 const next=await client.connect();assert.equal(next.replaced,true);assert.equal(calls.length,3);
 assert.equal(calls.filter(c=>c.init?.method==='POST').length,1);assert.equal(client.session.token,'session-2');
});
test('old-session completions are discarded and failed renewal retains retry ability',async()=>{
 let complete,count=0,fail=false;
 const client=new DemoSessionClient({request:async url=>url==='./api/session'?(fail?response({error:'busy'},503):response(session(`s${++count}`))):new Promise(r=>complete=r)});
 await client.connect();const pending=client.api('/api/records');await client.connect();complete(response({records:['old']}));await assert.rejects(pending,/会话已切换/);
 fail=true;await assert.rejects(client.connect(),/busy/);assert.equal(client.session.token,'s2');fail=false;assert.equal((await client.connect()).session.token,'s3');
});
