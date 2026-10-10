import test from 'node:test';
import assert from 'node:assert/strict';
import {DemoAccess,MemoryStore,demoConfig} from '../server/demo-access.mjs';
const req=(headers={},method='GET')=>({url:'/api/session',method,headers:{host:'demo.example.org',...headers}});
function mint(access){const headers={};const result=access.enter(req(),{setHeader:(k,v)=>headers[k]=v},{mint:true});result.release();return {cookie:headers['Set-Cookie'].split(';')[0],rawCookie:headers['Set-Cookie'],session:result.session};}
test('HTTPS origin is exact; forwarded headers cannot authorize foreign hosts; cookie is secure and opaque',()=>{
 const config=demoConfig({TP_PUBLIC_ORIGIN:'https://demo.example.org'}),a=new DemoAccess(config),s=mint(a);
 assert.match(s.rawCookie,/HttpOnly; SameSite=Strict/);assert.match(s.rawCookie,/; Secure$/);assert.equal(s.cookie.includes(s.session.token),false);
 assert.throws(()=>a.boundary(req({host:'evil.example','x-forwarded-host':'demo.example.org'})),/域名/);
 assert.throws(()=>a.boundary(req({origin:'https://evil.example'})),/来源/);
 const withUser=new URL('https://demo.example.org');withUser.username='synthetic-user';withUser.password='synthetic-password';assert.throws(()=>demoConfig({TP_PUBLIC_ORIGIN:withUser.href}));
 for(const origin of ['http://demo.example.org','https://demo.example.org/path','https://demo.example.org/?x=1'])assert.throws(()=>demoConfig({TP_PUBLIC_ORIGIN:origin}));
});
test('visitor A cannot access visitor B data or reuse A token with B cookie; expiration clears access',()=>{
 let now=0;const a=new DemoAccess({...demoConfig({TP_PUBLIC_ORIGIN:'https://demo.example.org'}),ttlMs:1000},{now:()=>now}),one=mint(a),two=mint(a);
 const r=one.session.store.create('preview',{value:'only-a'});assert.throws(()=>two.session.store.get(r.id),e=>e.status===404);
 assert.throws(()=>a.enter(req({cookie:two.cookie,origin:'https://demo.example.org','content-type':'application/json','x-tradepilot-token':one.session.token},'POST'),{},{}),e=>e.status===403);
 now=1001;a.sweep();assert.equal(a.sessions.size,0);assert.throws(()=>a.enter(req({cookie:one.cookie}),{},{}),e=>e.status===401);
});
test('memory records are copied and bounded; full capacity and rate buckets reject without unbounded growth',()=>{
 const s=new MemoryStore({maxRecords:1,maxBytes:100}),input={a:'test'};s.save('x',input);input.a='changed';const copy=s.get('x');copy.a='other';assert.equal(s.get('x').a,'test');
 assert.throws(()=>s.save('y',{}),e=>e.status===429);assert.throws(()=>s.save('x',{a:'x'.repeat(100)}),e=>e.status===429);assert.equal(s.get('x').a,'test');
 let now=0;const a=new DemoAccess({...demoConfig({TP_PUBLIC_ORIGIN:'https://demo.example.org'}),maxSessions:1},{now:()=>now});mint(a);assert.throws(()=>mint(a),e=>e.status===503);assert.equal(a.sessions.size,1);
 const bucket=[];for(let i=0;i<5;i++)a.budget(bucket,5);assert.throws(()=>a.budget(bucket,5),e=>e.status===429);assert.equal(bucket.length,5);now=60001;a.budget(bucket,5);assert.equal(bucket.length,1);
});
