import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Orders} from '../server/orders.mjs';
import {Store} from '../server/store.mjs';
// All inputs here are synthetic, and the request stub never contacts a chain.
function setup(){
  const store=new Store(fs.mkdtempSync(path.join(os.tmpdir(),'tradepilot-close-'))),now=Date.now();
  const original=store.create('intent',{accountId:8,chainId:10143,status:'filled',spec:{t:1,mkt:16,s:100,rq:9},reconciliation:{chainVerified:true}});
  const account={configured:true,wallet:{as:[{id:8,fr:false,fw:true,lfr:9}]},positions:{at:{t:now},d:[{acc:8,mkt:16,sd:1,s:100}]},sources:[]};
  const market={id:16,instance_id:1,symbol:'BTC',config:{is_open:true,price_decimals:2,size_decimals:3,initial_margin:1000,maintenance_margin:2000,taker_fee:1000,maker_fee:100},state:{mrk:10000,bid:10000,ask:10001,prv:10000,lst:10000,at:{t:now}},funding_interval_sec:3600};
  const context={chain:{chain_id:10143},instances:[{id:1,collateral_token_id:1}],tokens:[{id:1,symbol:'TESTUSD',decimals:6}],markets:[market]},book={at:{t:now},bid:[{p:10000,s:1000}],ask:[{p:10001,s:1000}]};
  let posts=0;
  const perpl={authCache:new Map(),account:async()=>account,context:async()=>({value:context,source:{}}),cached:async()=>({value:book,source:{}}),call:async(_network,_target,opts)=>{if(opts?.method==='POST'){posts++;return {value:{status:{code:0},statuses:[{code:0}]},source:{}};}return {value:{d:[]}};}};
  const orders=new Orders(perpl,store);orders.enabled=()=>true;
  return {store,original,account,market,book,orders,posts:()=>posts};
}
test('close rechecks fresh exact position, persists monotonic request and prevents duplicate submit',async()=>{
  const f=setup(),r=await f.orders.close(f.original.id,'CONFIRM TESTNET 10143');
  assert.equal(r.parentIntentId,f.original.id);assert.equal(r.spec.t,3);assert.equal(r.spec.s,100);assert.equal(r.spec.rq,10);assert.equal(r.spec.lv,0);assert.equal(r.status,'forwarded');assert.equal(f.posts(),1);assert.equal(f.store.get('counter_8').rq,10);
  await assert.rejects(f.orders.close(f.original.id,'CONFIRM TESTNET 10143'),/未核验|重复/);assert.equal(f.posts(),1);
});
test('close refuses unverified, changed, stale, closed or shallow positions without posting',async()=>{
  for(const kind of ['unverified','direction','size','stale','future','closed','depth','pending']){
    const f=setup();if(kind==='unverified')f.store.save(f.original.id,{...f.original,reconciliation:{chainVerified:false}});
    if(kind==='direction')f.account.positions.d[0].sd=2;
    if(kind==='size')f.account.positions.d[0].s=101;
    if(kind==='stale')f.account.positions.at.t-=46000;
    if(kind==='future')f.book.at.t+=6000;
    if(kind==='closed')f.market.config.is_open=false;
    if(kind==='depth')f.book.bid[0].s=1;
    if(kind==='pending')f.store.create('intent',{accountId:8,status:'unknown'});
    await assert.rejects(f.orders.close(f.original.id,'CONFIRM TESTNET 10143'),undefined,kind);assert.equal(f.posts(),0,kind);assert.equal(f.store.exists('counter_8'),false,kind);
  }
});
