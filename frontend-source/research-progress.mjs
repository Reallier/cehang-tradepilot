// Time-sensitive presentation only; never changes saved evidence or verification.
export function experimentProgress(experiment,row,now=Date.now()){
 const baseline=experiment.baseline?.evidence,j=row.journey;
 let window='missing',remainingSeconds=null;
 if(baseline){
  const saved=Date.parse(baseline.savedAt),expiry=Date.parse(baseline.validUntil);
  if(!Number.isFinite(now)||now<saved)window='clock_invalid';
  else {remainingSeconds=Math.max(0,Math.ceil((expiry-now)/1000));window=now>expiry?'expired':'valid';}
 }
 const opening=!j?'missing':j.open.status==='opening_reconciled'?'verified':'unverified';
 const settlement=!j?'missing':j.state==='closed'?'verified':j.state==='partial'?'partial':j.state==='exit_missing'?'missing':'unverified';
 const comparison=j?.comparison?.status==='compared'?'matched':j?'unavailable':'pending';
 let next;
 if(row.state==='unsupported')next='当前生命周期不支持自动验收，请保留原始材料。';
 else if(experiment.trade&&!j)next='选择本轮对应的开仓；不要重新下单。';
 else if(opening==='unverified'||settlement==='unverified')next='补齐本次交易的历史与回执，重新只读采集；不要重复下单。';
 else if(opening==='verified'&&settlement!=='verified')next='当前已有开仓证据。完成原测试仓位退出后，定向采集并归档结算；无需重新开仓。';
 else if(settlement==='verified')next=row.state==='verified'?'开平仓与基线均已核验，可导出归档并查看去重比较。':'开平仓结算已核验；基线未匹配，保留本次结算证据，不计入事前对照。';
 else if(experiment.trade)next='选择并核对已有成交证据。';
 else if(window==='expired')next='基线已过期。若已经交易，先导入成交核验；若尚未交易，重新预演并保存基线。';
 else if(window==='valid')next='基线仍在关联窗口内；只有实际成交时间符合条件才能匹配。过期前不要仓促确认。';
 else if(window==='clock_invalid')next='本机时间早于基线保存时间，先核对时钟。';
 else next='先准备测试参数；临近操作时再运行预演并保存事前基线。';
 return {window,remainingSeconds,validUntil:baseline?.validUntil??null,opening,settlement,comparison,eligible:row.state==='verified',next};
}
