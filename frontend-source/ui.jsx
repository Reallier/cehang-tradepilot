import {Compass,ChartNoAxesCombined,Files,FlaskConical,ShieldCheck,CircleHelp,ArrowUpRight} from 'lucide-react';
import React,{createContext,useContext,useEffect,useCallback,useState} from 'react';

const Navigation=createContext(null);
export function Workspace({children}){
 const [tabs,setTabs]=useState([]),[activeTabId,setActive]=useState(new URLSearchParams(location.search).get('tab')||'market');
 const navigate=useCallback(id=>{setActive(id);const u=new URL(location.href);u.searchParams.set('tab',id);history.replaceState(null,'',u);window.scrollTo(0,0);},[]);
 useEffect(()=>{const fn=()=>setActive(new URLSearchParams(location.search).get('tab')||'market');window.addEventListener('popstate',fn);return()=>window.removeEventListener('popstate',fn);},[]);
 const nav=[{id:'market',label:'工作台',icon:ChartNoAxesCombined},{id:'account',label:'账户工作台',icon:ShieldCheck},{id:'research',label:'测试网实验台',icon:FlaskConical},{id:'evidence',label:'方案记录',icon:Files},{id:'exit',label:'风险实验室',icon:FlaskConical}];
 return <Navigation.Provider value={{activeTabId,setTabs,navigate}}><a className="skip-link" href="#workspace-main">跳至工作区</a><header className="app-header"><button className="app-brand" onClick={()=>navigate('market')} aria-label="TradePilot 工作台"><span className="app-symbol"><Compass size={23}/></span><strong>TradePilot<span>策航</span></strong></button><nav className="app-nav" aria-label="主导航">{nav.map(t=>{const selected=t.id===activeTabId||(t.id==='exit'&&['audit','watch'].includes(activeTabId));return <button key={t.id} aria-current={selected?'page':undefined} onClick={()=>navigate(t.id)}><t.icon size={16}/>{t.label}</button>;})}</nav><div className="header-tools"><span className="demo-chip"><ShieldCheck size={13}/> 只读演示</span><button className="icon-button" aria-label="关于产品" title="关于产品" onClick={()=>navigate('competition')}><CircleHelp size={18}/></button></div></header><main id="workspace-main">{children}</main><footer className="app-footer"><span><span className="status-dot"/> MONAD × PERPL <i> / </i> READ-ONLY · RISK RESEARCH</span><div><button onClick={()=>navigate('wallet')}>访问与隐私</button><a href="https://github.com/Reallier/cehang-tradepilot" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={12}/></a><a href="./licenses.txt">第三方许可</a></div></footer></Navigation.Provider>;
}
export function useNavigation(tabs){const n=useContext(Navigation);useEffect(()=>{n.setTabs(tabs);if(!tabs.some(t=>t.id===n.activeTabId))n.navigate(tabs[0].id);},[tabs,n.activeTabId]);return n;}
export function useWorkspace(){const n=useContext(Navigation);return {visible:()=>true,exploreDashboard:n.navigate};}
function SourceRows({rows=[]}){return <details className="source-details"><summary>查看计算数据 · {rows.length} 行</summary><pre>{JSON.stringify(rows,null,2)}</pre></details>;}
export function EvidencePanel({id,title,children,sourceRows=[],loading,loadingError}){return <section className="evidence-panel" id={id} aria-label={title}><h3>{title}</h3>{loading&&<p role="status">正在读取…</p>}{loadingError&&<p role="alert">{loadingError}</p>}{children}<SourceRows rows={sourceRows}/></section>;}
export function EvidenceTable({rows=[],columns=[],rowKey}){return <div className="table-scroll"><table className="plain-table"><thead><tr>{columns.map(c=><th key={c.field} scope="col">{c.label}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r[rowKey]??i}>{columns.map(c=><td key={c.field}>{c.renderCell?c.renderCell(r[c.field]):String(r[c.field]??'—')}</td>)}</tr>)}</tbody></table></div>;}
const numeric=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const format=v=>Number(v).toLocaleString('en-US',{maximumFractionDigits:3});
// Independent SVG renderer. Missing values break paths and remain absent in bars.
export function EvidencePlot({id,title,rows=[],sourceRows=rows,spec={},height=240,description,loading,loadingError}){
 const width=720,pad={l:68,r:22,t:20,b:46},w=width-pad.l-pad.r,h=height-pad.t-pad.b;
 const labels=[...new Set(rows.map(r=>String(r[spec.x])))],groups=spec.series?[...new Set(rows.map(r=>r[spec.series]))]:[''],palette=['#ab99ff','#50c3a5','#eb8293'];
 const ys=rows.filter(r=>numeric(r[spec.y])).map(r=>Number(r[spec.y]));let low=ys.length?Math.min(...ys):0,high=ys.length?Math.max(...ys):1;
 if(spec.type==='bar'||spec.startAtZero){low=Math.min(0,low);high=Math.max(0,high);}if(low===high){const d=Math.abs(low)*0.05||1;low-=d;high+=d;}
 const continuous=labels.length>0&&labels.every(v=>v.trim()!==''&&numeric(v));const xs=continuous?labels.map(Number):[];const xlo=continuous?Math.min(...xs):0,xhi=continuous?Math.max(...xs):labels.length-1;
 const x=v=>pad.l+(continuous?(Number(v)-xlo)/(xhi-xlo||1):(labels.indexOf(String(v))+.5)/Math.max(1,labels.length))*w;
 const y=v=>pad.t+(high-v)/(high-low)*h;
 const tickLabel=v=>/^\d{4}-\d{2}-\d{2}T/.test(v)?new Date(v).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):v;
 return <EvidencePanel id={id} title={title} sourceRows={sourceRows} loading={loading} loadingError={loadingError}>{description&&<p className="tp-note">{description}</p>}{!ys.length?<p className="tp-empty">暂无可计算的数据；未知值不补零。</p>:<><svg className="evidence-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}。精确数值可展开查看计算数据。`}>
 {[0,.25,.5,.75,1].map(f=>{const v=low+(high-low)*f;return <g key={f}><line x1={pad.l} x2={width-pad.r} y1={y(v)} y2={y(v)} stroke="#292d39"/><text x={pad.l-8} y={y(v)+4} textAnchor="end">{format(v)}</text></g>;})}
 {labels.filter((_,i)=>i===0||i===labels.length-1||i%Math.max(1,Math.ceil(labels.length/5))===0).map(v=><text key={v} x={x(v)} y={height-22} textAnchor="middle">{tickLabel(v)}</text>)}
 {groups.map((group,gi)=>{const rr=spec.series?rows.filter(r=>r[spec.series]===group):rows,color=palette[gi%palette.length];let pen=false;const d=rr.map(r=>{if(!numeric(r[spec.y])){pen=false;return '';}const point=`${pen?'L':'M'} ${x(r[spec.x])} ${y(Number(r[spec.y]))}`;pen=true;return point;}).join(' ');
 return <g key={String(group)}>{spec.type!=='bar'&&<path d={d} fill="none" stroke={color} strokeWidth="2.5"/>}{rr.filter(r=>numeric(r[spec.y])).map((r,i)=>spec.type==='bar'?<rect key={i} x={x(r[spec.x])-Math.min(22,w/Math.max(1,labels.length)*.65)/2} y={Math.min(y(0),y(Number(r[spec.y])))} width={Math.min(22,w/Math.max(1,labels.length)*.65)} height={Math.max(.8,Math.abs(y(0)-y(Number(r[spec.y]))))} fill={color}><title>{`${r[spec.x]} · ${r[spec.y]}`}</title></rect>:<circle key={i} cx={x(r[spec.x])} cy={y(Number(r[spec.y]))} r="2.4" fill={color}><title>{`${group} ${r[spec.x]} · ${r[spec.y]}`}</title></circle>)}</g>;})}
 </svg>{spec.showLegend&&spec.series&&<div className="plot-legend">{groups.map((g,i)=><span key={g}><i style={{background:palette[i%palette.length]}}/>{g}</span>)}</div>}{(spec.xLabel||spec.yLabel)&&<p className="tp-note">{spec.xLabel&&`横轴：${spec.xLabel}`} {spec.yLabel&&`纵轴：${spec.yLabel}`}</p>}</>}</EvidencePanel>;
}
