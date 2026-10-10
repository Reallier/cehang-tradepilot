import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';

export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
// Temporary visitor data only. Copies prevent callers from mutating quota accounting.
export class MemoryStore {
  constructor({maxRecords=120,maxBytes=2*1024*1024}={}){this.records=new Map();this.bytes=0;this.maxRecords=maxRecords;this.maxBytes=maxBytes;}
  validate(id){if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new HttpError(400,'记录ID无效');}
  save(id,value){this.validate(id);const raw=JSON.stringify(value),size=Buffer.byteLength(raw),old=this.records.get(id);
    if((!old&&this.records.size>=this.maxRecords)||this.bytes-(old?.size??0)+size>this.maxBytes)throw new HttpError(429,'本次访客会话存储已满，请导出需要的证据');
    this.bytes+=size-(old?.size??0);this.records.set(id,{raw,size});return JSON.parse(raw);}
  get(id){this.validate(id);const r=this.records.get(id);if(!r)throw new HttpError(404,'记录不存在或不属于当前会话');return JSON.parse(r.raw);}
  exists(id){this.validate(id);return this.records.has(id);}
  list(prefix=''){return [...this.records].filter(([id])=>id.startsWith(prefix)).map(([,v])=>JSON.parse(v.raw)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
  create(kind,value){const id=`${kind}_${randomUUID()}`;return this.save(id,{...value,id,createdAt:new Date().toISOString()});}
  event(kind,details){return this.create('event',{kind,details});}
}
function limitedNumber(value,fallback,min,max){const n=value===undefined?fallback:Number(value);if(!Number.isInteger(n)||n<min||n>max)throw new Error('Invalid demo limit');return n;}
export function demoConfig(env=process.env){
  const port=limitedNumber(env.TP_PORT,8780,1024,65535);
  const basePath=env.TP_BASE_PATH??'';
  if(basePath&&!/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+$/.test(basePath))throw new Error('Invalid demo base path');
  const host=env.TP_LISTEN_HOST??'127.0.0.1';
  if(!['127.0.0.1','0.0.0.0'].includes(host))throw new Error('Invalid listen host');
  let origins=[`http://127.0.0.1:${port}`,`http://localhost:${port}`],secure=false;
  if(env.TP_PUBLIC_ORIGIN){const u=new URL(env.TP_PUBLIC_ORIGIN);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error('TP_PUBLIC_ORIGIN must be an HTTPS origin');origins=[u.origin];secure=true;}
  return {port,host,basePath,cookieName:basePath?'tp_tradepilot_session':'tp_session',origins,secure,maxSessions:limitedNumber(env.TP_MAX_SESSIONS,64,1,256),ttlMs:30*60*1000};
}
export class DemoAccess {
  constructor(config,{now=()=>Date.now()}={}){this.config=config;this.now=now;this.sessions=new Map();this.global=[];this.mints=[];this.active=0;}
  sweep(){for(const [id,s]of this.sessions)if(s.expires<=this.now())this.sessions.delete(id);}
  boundary(req){const {origins}=this.config;
    if(!origins.some(o=>new URL(o).host===req.headers.host))throw new HttpError(403,'访问域名不允许');
    if(req.headers.origin&&!origins.includes(req.headers.origin))throw new HttpError(403,'来源不允许');
    if((req.url??'').length>2048)throw new HttpError(414,'请求地址过长');
  }
  budget(list,max){const now=this.now();while(list.length&&list[0]<=now-60000)list.shift();if(list.length>=max)throw new HttpError(429,'请求过于频繁，请稍后重试');list.push(now);}
  enter(req,res,{mint=false}={}){
    this.boundary(req);this.sweep();
    if(req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'跨站API请求禁止');
    this.budget(this.global,240);
    if(this.active>=16)throw new HttpError(503,'演示服务繁忙，请稍后重试');
    const cookiePrefix=`${this.config.cookieName}=`;
    const cookies=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(cookiePrefix));
    const id=cookies.length===1?cookies[0].slice(cookiePrefix.length):'',existing=/^[a-f0-9]{64}$/.test(id)?this.sessions.get(id):null;
    let s=existing;
    if(!s){if(!mint)throw new HttpError(401,'演示会话已过期，请刷新页面重新开始');
      this.budget(this.mints,20);if(this.sessions.size>=this.config.maxSessions)throw new HttpError(503,'演示访客已满，请稍后重试');
      const sessionId=randomBytes(32).toString('hex');s={token:randomBytes(32).toString('hex'),expires:this.now()+this.config.ttlMs,store:new MemoryStore(),requests:[],active:0};this.sessions.set(sessionId,s);
      res.setHeader('Set-Cookie',`${this.config.cookieName}=${sessionId}; Path=${this.config.basePath}/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(this.config.ttlMs/1000)}${this.config.secure?'; Secure':''}`);
    }
    this.budget(s.requests,60);if(s.active>=4)throw new HttpError(429,'此会话有请求处理中');
    if(!['GET','HEAD'].includes(req.method)){
      const value=String(req.headers['x-tradepilot-token']??'');
      if(!this.config.origins.includes(req.headers.origin)||value.length!==s.token.length||!timingSafeEqual(Buffer.from(value),Buffer.from(s.token)))throw new HttpError(403,'会话操作令牌或来源无效');
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new HttpError(415,'仅接受JSON请求');
    }
    s.active++;this.active++;return {session:s,release:()=>{s.active--;this.active--;}};
  }
}
