import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generateKeyPairSync,verify} from 'node:crypto';
import {Store,hash} from '../server/store.mjs';
import {positionExample} from '../server/position-examples.mjs';
import {AccountReader,accountReadiness,analyzeAccount,collectAccount,replayAccount} from '../server/account-readonly.mjs';
import {analyzeExit} from '../server/position-exit.mjs';
import {evaluateWatch} from '../server/risk-watch.mjs';

const expectedWallet='0x'+'3'.repeat(40);
const approval={approved:true,blocked:false,reference:'synthetic test fixture only',checkedAt:'2026-10-10T00:00:00Z'};
function fixture(){
  const f=positionExample('long');
  return {expectedWallet,context:f.context,positions:{mt:26,sn:100,at:f.snapshotAt,d:[f.position]},wallet:{mt:19,sn:100,at:f.snapshotAt,addr:expectedWallet,as:[{id:1,in:1,ft:1,b:'20000000',lb:'1000000',fr:false,fw:false}]},rpcChainId:10143,rpcHead:100,now:f.now};
}
function readerFor(t,f=fixture(),reply){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tp-reader-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const calls=[],{privateKey,publicKey}=generateKeyPairSync('ed25519');
  const key={token:'synthetic-token',secret:privateKey.export({format:'der',type:'pkcs8'}).subarray(-32).toString('hex')};
  const reader=new AccountReader(new Store(root),{now:()=>f.now,request:async(url,options)=>{
    calls.push({url,options});
    if(reply)return reply(url,options);
    if(url.endsWith('/api/v1/trading/wallet')||url.endsWith('/api/v1/trading/positions')){
      const h=options.headers,target=new URL(url).pathname.slice(4);
      const message=['10143','GET',target,h['X-API-Timestamp'],h['X-API-Nonce'],hash('')].join('\n');
      assert.ok(verify(null,Buffer.from(message),publicKey,Buffer.from(h['X-API-Signature'],'base64url')));
      assert.equal(options.redirect,'error');
    }
    const body=options.body?JSON.parse(options.body):null;
    const data=body?{result:body.method==='eth_chainId'?'0x279f':'0x64'}:url.endsWith('/wallet')?f.wallet:url.endsWith('/positions')?f.positions:f.context;
    return new Response(JSON.stringify(data));
  }});
  reader.key=()=>key;
  return {reader,calls,key};
}

test('preflight blocks before requests; a blocked eligibility record wins over approval',async t=>{
  const {reader,calls}=readerFor(t);
  assert.equal(accountReadiness({eligibility:{...approval,blocked:true},expectedWallet,keyConfigured:true}).ready,false);
  for(const eligibility of [null,{blocked:true},{}])assert.equal((await collectAccount(reader,{eligibility,expectedWallet})).status,'not_ready');
  reader.key=()=>null;
  assert.equal((await collectAccount(reader,{eligibility:approval,expectedWallet})).ready,false);
  assert.equal(calls.length,0);
});
test('transport denies writes, mainnet, history, unapproved RPC and authenticated public calls',async t=>{
  const {reader,calls}=readerFor(t);
  for(const args of [['mainnet','/v1/trading/wallet',{auth:true}],['testnet','/v1/trading/orders',{method:'POST'}],['testnet','/v1/trading/fills',{auth:true}],['testnet','/v1/pub/context',{auth:true}]])await assert.rejects(reader.call(...args),/DENIED/);
  for(const args of [['testnet','eth_sendRawTransaction',[]],['mainnet','eth_chainId',[]],['testnet','eth_blockNumber',['extra']]])await assert.rejects(reader.rpc(...args),/DENIED/);
  assert.equal(calls.length,0);
});
test('signed collection yields bounded private report, account fee tier, risk and reproducible evidence',async t=>{
  const {reader,calls,key}=readerFor(t),packet=await collectAccount(reader,{eligibility:approval,expectedWallet});
  assert.equal(calls.length,5);assert.equal(packet.report.status,'observed_positions');
  assert.equal(packet.report.accounts[0].feeTier,1);assert.equal(packet.report.positions[0].risk.equity,24);
  assert.equal(replayAccount(packet).status,'reproduced');
  assert.ok(!JSON.stringify(packet).includes(key.token));assert.ok(!JSON.stringify(packet).includes(key.secret));
  const saved=reader.store.create('account_observation',packet);
  assert.equal(fs.statSync(reader.store.file(saved.id)).mode&0o777,0o600);
  assert.equal(fs.statSync(reader.store.root).mode&0o777,0o700);
  packet.report.positions[0].risk.equity=999;packet.reportHash=hash(packet.report);
  assert.throws(()=>replayAccount(packet),/REPLAY/);
});
test('rejects foreign identity and stops before fetching further account data',async t=>{
  const f=fixture();f.wallet.addr='0x'+'4'.repeat(40);
  const {reader,calls}=readerFor(t,f);
  await assert.rejects(collectAccount(reader,{eligibility:approval,expectedWallet}),/IDENTITY/);
  assert.equal(calls.length,2);
});
test('REST positions may omit update stamp fields while the enclosing snapshot remains authoritative',async t=>{
  const f=fixture(),expected=analyzeAccount(f).positions[0].risk;
  f.positions.d[0].at={};
  const {reader}=readerFor(t,f),packet=await collectAccount(reader,{eligibility:approval,expectedWallet});
  assert.equal(packet.report.status,'observed_positions');
  assert.deepEqual(packet.report.positions[0].risk,{...expected,sourceTime:null});
  assert.equal(replayAccount(packet).status,'reproduced');
  const x=positionExample('long');x.position.at={};
  assert.equal(analyzeExit(x).status,'estimated');
  const watch={network:'testnet',source:'account',positionId:1,accountId:1,marketId:1,warningBufferPct:100};
  const feed={kind:'positions',position:x.position,context:x.context,snapshotAt:x.snapshotAt};
  assert.equal(evaluateWatch({watch,feed,now:x.now}).state,'healthy');
  f.positions.at.t=f.now-46000;
  assert.equal(analyzeAccount(f).status,'incomplete');
});
test('optional position update fields still reject malformed or future values',()=>{
  for(const at of [null,[],{b:null},{t:null},{b:101},{b:-1},{t:NaN},{t:-1},{t:fixture().now+5001}]){
    const f=fixture();f.positions.d[0].at=at;assert.throws(()=>analyzeAccount(f),/POSITION_STAMP_INVALID/);
  }
  for(const at of [{b:10},{t:fixture().now-1000}]){
    const f=fixture();f.positions.d[0].at=at;assert.equal(analyzeAccount(f).status,'observed_positions');
  }
});
test('account absence, empty positions, incomplete funding and stale snapshots are distinct',()=>{
  const f=fixture();f.positions.d=[];assert.equal(analyzeAccount(f).status,'empty_positions');
  f.wallet.as=[];assert.equal(analyzeAccount(f).status,'no_exchange_account');
  f.wallet.at={...f.wallet.at,t:f.now-46000};assert.equal(analyzeAccount(f).status,'incomplete');
  const g=fixture();delete g.context.markets[0].funding;
  assert.equal(analyzeAccount(g).status,'incomplete');assert.equal(analyzeAccount(g).positions[0].risk.equity,null);
  const h=fixture();h.context.markets=[];assert.equal(analyzeAccount(h).positions[0].reason,'UNKNOWN_MARKET');
  const j=fixture();j.rpcHead=99;assert.equal(analyzeAccount(j).status,'incomplete');
});
test('rejects chain, duplicate/foreign positions, invalid account money and event snapshots',()=>{
  for(const mutate of [f=>f.rpcChainId=143,f=>f.positions.d.push(structuredClone(f.positions.d[0])),f=>f.positions.d[0].acc=2,f=>f.wallet.as[0].b='NaN',f=>f.positions.d[0].cfee='1',f=>f.positions.sn=99,f=>f.context.markets[0].instance_id=2]){
    const f=fixture();mutate(f);assert.throws(()=>analyzeAccount(f));
  }
});
test('429 cooldown prevents another request; public 451 persists restriction; 404 does not become empty',async t=>{
  for(const code of [429,451,404]){
    const {reader,calls}=readerFor(t,fixture(),()=>new Response('{}',{status:code,headers:{'Retry-After':'60'}}));
    await assert.rejects(collectAccount(reader,{eligibility:approval,expectedWallet}));
    assert.equal(calls.length,1);
    if(code!==404){await assert.rejects(reader.rpc('testnet','eth_chainId',[]));assert.equal(calls.length,1);}
    if(code===451)assert.equal(reader.store.get('restriction_testnet').blocked,true);
  }
});


test('monitor context catch-up keeps account stamps and makes at most one uncached public read',async t=>{
 for(const recovered of [true,false]){
  const f=fixture();f.context.chain.gas.h=99;const {reader,calls}=readerFor(t,f);let waits=0;
  const packet=await collectAccount(reader,{eligibility:approval,expectedWallet,contextCatchUp:true},{wait:async ms=>{
   assert.equal(ms,10000);waits++;f.now+=ms;if(recovered)f.context.chain.gas.h=100;
  }});
  assert.equal(waits,1);assert.equal(calls.length,6);
  assert.equal(calls.filter(c=>c.url.endsWith('/pub/context')).length,2);
  assert.equal(calls.filter(c=>c.url.endsWith('/wallet')).length,1);
  assert.equal(calls.filter(c=>c.url.endsWith('/positions')).length,1);
  assert.deepEqual(packet.snapshot.wallet.at,f.wallet.at);
  assert.deepEqual(packet.snapshot.positions.at,f.positions.at);
  assert.equal(packet.report.status,recovered?'observed_positions':'incomplete');
  assert.equal(replayAccount(packet).status,'reproduced');
 }
});
test('catch-up is skipped by default, without lag, or without enough snapshot lifetime',async t=>{
 for(const mode of ['default','covered','old']){
  const f=fixture();if(mode!=='covered')f.context.chain.gas.h=99;if(mode==='old')f.now+=14000;
  const {reader,calls}=readerFor(t,f);let waits=0;
  const p=await collectAccount(reader,{eligibility:approval,expectedWallet,contextCatchUp:mode!=='default'},{wait:async()=>{waits++;}});
  assert.equal(calls.length,5);assert.equal(waits,0);assert.equal(p.report.status,mode==='covered'?'observed_positions':'incomplete');
 }
 const f=fixture();f.context.chain.gas.h=99;const {reader,calls}=readerFor(t,f);
 const p=await collectAccount(reader,{eligibility:approval,expectedWallet,contextCatchUp:true},{wait:async()=>{f.now+=24000;}});
 assert.equal(calls.length,5);assert.equal(p.report.status,'incomplete');
});
test('rejected context catch-up stops before final RPC and retains protocol cooldown/restriction',async t=>{
 for(const code of [401,403,429,451]){
  const f=fixture();f.context.chain.gas.h=99;const {reader,calls}=readerFor(t,f);let catchUpRequests=0;
  const packet=collectAccount(reader,{eligibility:approval,expectedWallet,contextCatchUp:true},{wait:async()=>{
   f.now+=10000;reader.request=async(url)=>{catchUpRequests++;assert.ok(url.endsWith('/pub/context'));return new Response('{}',{status:code,headers:{'Retry-After':'120'}});};
  }});
  await assert.rejects(packet,new RegExp(String(code)));
  // Four initial requests; the rejected fifth request does not reach the fixture logger.
  assert.equal(calls.length,4);assert.equal(catchUpRequests,1);
  if(code===429)assert.equal(reader.cooldowns.get('testnet'),f.now+120000);
  if([403,451].includes(code))assert.equal(reader.store.get('restriction_testnet').blocked,true);
 }
});
