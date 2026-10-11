import {hash} from './integrity.mjs';

const URL='wss://testnet.perpl.xyz/ws/v1/market-data';
const integer=n=>Number.isSafeInteger(n)&&n>0;
function validateBook(book,now){
 if(book.mt!==15||!integer(book.sid)||!integer(book.sn)||book.sn!==book.at?.b||!integer(book.at?.t))throw new Error('WS_BOOK_INVALID');
 if(now-book.at.t>45000||book.at.t>now+5000)throw new Error('WS_BOOK_STALE');
 for(const side of ['bid','ask']){
  if(!Array.isArray(book[side])||!book[side].length||book[side].length>10000)throw new Error('WS_BOOK_INVALID');
  const prices=new Set();let previous=null;
  for(const level of book[side]){
   if(!integer(level.p)||!integer(level.s)||!integer(level.o)||prices.has(level.p)||
      (previous!==null&&(side==='bid'?level.p>=previous:level.p<=previous)))throw new Error('WS_BOOK_INVALID');
   prices.add(level.p);previous=level.p;
  }
 }
 if(book.bid[0].p>=book.ask[0].p)throw new Error('WS_BOOK_INVALID');
}

// Public testnet snapshot only. No credentials, order frames, deltas, retries or fallback.
// Protocol: https://github.com/PerplFoundation/api-docs/blob/main/websocket.md
export async function readTestnetBookSnapshot(reader,marketId,{WebSocketImpl=globalThis.WebSocket,now=()=>Date.now(),timeoutMs=12000}={}){
 if(!integer(marketId)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>12000)throw new Error('WS_PARAMETERS_INVALID');
 if(typeof WebSocketImpl!=='function')throw new Error('WS_UNAVAILABLE');
 reader.guard('testnet');
 const stream=`order-book@${marketId}`;
 return new Promise((resolve,reject)=>{
  let socket,timer,done=false,ack=null,snapshot=null,frames=0,bytes=0;
  const finish=(error,result)=>{
   if(done)return;done=true;clearTimeout(timer);
   // Retain the error listener until close so a connecting socket can be aborted safely.
   try{socket?.close();}catch{}
   if(error)reject(error);else resolve(result);
  };
  const complete=()=>{
   if(!ack||!snapshot)return;
   const book=snapshot.value;
   if(book.sid!==ack.sid)throw new Error('WS_SUBSCRIPTION_MISMATCH');
   validateBook(book,now());
   finish(null,{value:book,source:{url:URL,network:'testnet',chainId:10143,transport:'websocket',stream,marketId,
    fetchedAt:new Date(now()).toISOString(),sha256:hash(snapshot.raw)}});
  };
  try{
   socket=new WebSocketImpl(URL);
   timer=setTimeout(()=>finish(new Error('WS_SNAPSHOT_TIMEOUT')),timeoutMs);
   socket.addEventListener('open',()=>{
    if(done)return;
    try{socket.send(JSON.stringify({mt:5,subs:[{stream,subscribe:true}]}));}catch{finish(new Error('WS_SEND_FAILED'));}
   });
   socket.addEventListener('message',event=>{
    if(done)return;
    try{
     if(typeof event.data!=='string')throw new Error('WS_FRAME_INVALID');
     bytes+=Buffer.byteLength(event.data);
     if(++frames>8||bytes>4*1024*1024)throw new Error('WS_FRAME_BUDGET');
     let message;try{message=JSON.parse(event.data);}catch{throw new Error('WS_FRAME_INVALID');}
     if(message?.mt===6){
      if(ack||!Array.isArray(message.subs)||message.subs.length!==1||message.subs[0].stream!==stream)throw new Error('WS_SUBSCRIPTION_MISMATCH');
      const sub=message.subs[0];
      if(sub.status?.code!==0){
       if([403,429,451].includes(sub.status?.code))reader.checkStatus('testnet',{status:sub.status.code,ok:false,headers:new Headers()});
       throw new Error('WS_SUBSCRIPTION_REJECTED');
      }
      if(!integer(sub.sid))throw new Error('WS_SUBSCRIPTION_MISMATCH');
      ack=sub;
     }else if(message?.mt===15){
      if(snapshot)throw new Error('WS_DUPLICATE_SNAPSHOT');
      validateBook(message,now());snapshot={value:message,raw:event.data};
     }else{
      // A delta is never re-labelled as a complete snapshot, even if it looks fresh.
      throw new Error('WS_UNEXPECTED_FRAME');
     }
     complete();
    }catch(error){finish(error);}
   });
   socket.addEventListener('error',()=>finish(new Error('WS_CONNECTION_FAILED')));
   socket.addEventListener('close',()=>finish(new Error('WS_CLOSED_BEFORE_SNAPSHOT')));
  }catch{finish(new Error('WS_CONNECTION_FAILED'));}
 });
}
