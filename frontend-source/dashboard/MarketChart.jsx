import React,{useEffect,useRef,useState} from 'react';
import {createChart,CandlestickSeries,HistogramSeries,ColorType} from 'lightweight-charts';
import {Maximize2} from 'lucide-react';
const format=(v,d=2)=>v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:d});
export function MarketChart({candles=[],asset='',collateral='',decimals=2,loading}){
 const container=useRef(null),chartRef=useRef(null),series=useRef(null),volume=useRef(null),identity=useRef('');
 const [hover,setHover]=useState(null),[range,setRange]=useState(48);
 useEffect(()=>{
  const chart=createChart(container.current,{autoSize:true,layout:{background:{type:ColorType.Solid,color:'#101419'},textColor:'#9297a9',fontFamily:'Inter, system-ui, sans-serif',fontSize:10,attributionLogo:true},grid:{vertLines:{color:'#1b222b'},horzLines:{color:'#1b222b'}},rightPriceScale:{borderColor:'#292d39',scaleMargins:{top:.12,bottom:.26}},timeScale:{borderColor:'#292d39',timeVisible:true,secondsVisible:false,rightOffset:3},crosshair:{vertLine:{color:'#77758b',labelBackgroundColor:'#49425f'},horzLine:{color:'#77758b',labelBackgroundColor:'#49425f'}},localization:{locale:'zh-CN'}});
  const price=chart.addSeries(CandlestickSeries,{upColor:'#47b89a',downColor:'#d97482',wickUpColor:'#47b89a',wickDownColor:'#d97482',borderVisible:false});
  const vol=chart.addSeries(HistogramSeries,{priceFormat:{type:'volume'},priceScaleId:'volume',lastValueVisible:false,priceLineVisible:false});vol.priceScale().applyOptions({scaleMargins:{top:.82,bottom:0},visible:false});
  chartRef.current=chart;series.current=price;volume.current=vol;
  chart.subscribeCrosshairMove(p=>{const candle=p.seriesData.get(price);setHover(candle&&'close' in candle?candle:null);});
  return()=>{chart.remove();chartRef.current=null;};
 },[]);
 useEffect(()=>{
  if(!series.current)return;
  const sorted=[...candles].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  series.current.applyOptions({priceFormat:{type:'price',precision:decimals,minMove:10**(-decimals)}});
  series.current.setData(sorted.map(c=>({time:Date.parse(c.time)/1000,open:c.open,high:c.high,low:c.low,close:c.close})));
  volume.current.setData(sorted.map(c=>({time:Date.parse(c.time)/1000,value:c.volume,color:c.close>=c.open?'#245b51':'#613443'})));
  const id=asset+':'+range;if(identity.current!==id&&sorted.length){identity.current=id;chartRef.current.timeScale().setVisibleLogicalRange({from:Math.max(0,sorted.length-range)-.5,to:sorted.length+2});setHover(null);}
 },[candles,asset,decimals,range]);
 const last=hover??candles.at(-1);
 return <section className="market-chart" aria-label={`${asset}一小时蜡烛图`}>
  <div className="chart-toolbar"><span className="chart-period">1H <span>已结束的小时线</span></span><div className="chart-range" aria-label="图表显示范围">{[24,48].map(n=><button key={n} aria-pressed={range===n} onClick={()=>setRange(n)}>{n}小时</button>)}<button aria-label="重置图表缩放" title="重置缩放" onClick={()=>chartRef.current?.timeScale().fitContent()}><Maximize2 size={14}/></button></div></div>
  <div className="chart-ohlc" aria-live="off">{[['开',last?.open],['高',last?.high],['低',last?.low],['收',last?.close]].map(([label,v])=><span key={label}>{label} <b>{format(v,decimals)}</b></span>)}</div>
  <div className="chart-canvas" ref={container}/>
  {!candles.length&&<div className="chart-empty" role="status">{loading?'正在读取真实行情…':'暂无有效K线数据'}</div>}
  <div className="chart-foot"><span>成交额 · {collateral} · 拖动或滚轮缩放</span><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™</a></div>
  <details className="source-details chart-data"><summary>读取图表数值 · {candles.length} 根K线</summary><div className="table-scroll"><table className="plain-table"><thead><tr>{['时间','开','高','低','收','成交额'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{candles.map(c=><tr key={c.time}><th>{new Date(c.time).toLocaleString('zh-CN')}</th>{['open','high','low','close','volume'].map(k=><td key={k}>{format(c[k],decimals)}</td>)}</tr>)}</tbody></table></div></details>
 </section>;
}
