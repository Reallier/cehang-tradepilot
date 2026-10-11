// Recover the anonymous server session without reloading browser-local evidence.
// Never replay a failed POST: the user's next action uses the new token.
export class DemoSessionClient {
 constructor({request=(...args)=>fetch(...args),onExpired=()=>{}}={}){this.request=request;this.onExpired=onExpired;this.session=null;this.epoch=0;this.connecting=null;}
 async decode(response){
  let data;try{data=await response.json();}catch{throw new Error('服务响应无效，请稍后重试');}
  if(!response.ok){const e=new Error(response.status===401?'演示会话已过期。请恢复会话，本页研究材料仍保留。':data.error||`HTTP ${response.status}`);e.status=response.status;e.retryAfterMs=Math.max(60000,(Number(response.headers.get('retry-after'))||60)*1000);throw e;}
  return data;
 }
 connect(){
  if(this.connecting)return this.connecting;
  this.epoch++;
  this.connecting=Promise.resolve().then(()=>this.request('./api/session')).then(r=>this.decode(r)).then(session=>{
   if(typeof session.token!=='string'||!session.token||!Number.isFinite(Date.parse(session.expiresAt)))throw new Error('演示会话响应无效');
   const replaced=!!this.session&&this.session.token!==session.token;
   this.session=session;return {session,replaced};
  }).finally(()=>{this.connecting=null;});return this.connecting;
 }
 async api(url,data){
  const epoch=this.epoch;
  try{
   const response=await this.request(`.${url}`,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-TradePilot-Token':this.session?.token??''}:undefined,body:data?JSON.stringify(data):undefined});
   if(epoch!==this.epoch)throw new Error('会话已切换，请重新执行此次操作');
   const value=await this.decode(response);
   if(epoch!==this.epoch)throw new Error('会话已切换，请重新执行此次操作');
   return value;
  }catch(error){if(epoch===this.epoch&&error.status===401)this.onExpired();throw error;}
 }
}
