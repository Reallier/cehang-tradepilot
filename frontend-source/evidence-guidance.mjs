// Presentation only. Never upgrades an audit status or recomputes economic results.
const item=(code,title,why,next)=>({code,title,why,next});
const collect='使用本机只读历史采集工具重新导出同一账户的订单、成交、仓位、账户流水及交易回执，保留原文件供比较。';
const mismatch='对照同一笔交易的原始记录和回执重新采集；若仍不一致，保留未通过状态并检查采集或解码逻辑，不要手改金额或哈希。';
const definitions={
 UNIQUE_RECEIPT:['交易回执缺失或不唯一','该订单需要且只能关联一份保存回执。',collect],
 RECEIPT_MISSING:['缺少回执或交易详情','仅有交易哈希不足以核对链上事件。',collect],
 LOGS_MISSING:['回执缺少事件日志','无法从空日志核对成交与结算。',collect],
 FILL_HISTORY_COVERAGE:['成交历史未能对应链上事件','成交条数、日志位置或金额没有完整对应。',collect],
 FILL_HISTORY:['退出成交历史未能对应回执','退出成交记录的身份、价格或费用未能全部核对。',collect],
 POSITION_HISTORY_IDENTITY:['缺少唯一的开仓仓位记录','账户、市场、请求与订单需要共同对应一条开仓记录。',collect],
 SINGLE_EXIT_EVENT:['退出仓位记录缺失或不唯一','本版本需要一次退出对应一条仓位变更记录。',collect],
 VERIFIED_OPENING:['尚无唯一的已核验开仓','退出净损益必须先找到同一仓位的有效开仓证据。','先补齐并核验对应开仓，再检查退出；只有平仓回执不足以计算完整净损益。'],
 SINGLE_OPEN_SINGLE_EXIT_LIFECYCLE:['历史不完整或生命周期超出支持范围','当前只支持单次开仓后一次全部或部分退出；历史分页也必须完整。','先检查分页覆盖；若已完整但存在加仓、多次退出等结构，需要扩展模型，不能删掉中间事件来通过核验。'],
 SINGLE_OPEN_POSITION:['开仓成交结构不受当前模型支持','本版本要求单个吃单成交事件与唯一开仓仓位。','保留完整记录；多次撮合或多仓位事件需要扩展模型，不要裁剪回执。'],
 SINGLE_FILL_SUPPORTED:['退出成交结构或附加费用不受支持','当前只支持单个吃单事件且无 builder 附加费用。','保留原始事件，待模型支持该结构后复核；重复采集不会改变真实成交结构。'],
 NO_BUILDER_FEES:['存在尚未支持的附加费用','当前结算模型不处理非零 builder 费用。','保留记录并扩展费用归因模型，不能把费用改为零。'],
 REQUEST_IOC:['订单不是受支持的 IOC 结构','当前自动核验限定 IOC 吃单请求。','使用与原始订单类型匹配的核验模型；不需要为通过验收重新交易。'],
 ACCOUNT_MARKET_IDENTITY:['账户与市场身份未对应','账户、市场、实例或抵押币种关联不完整。',collect],
 ORDER_FIELDS:['订单字段不完整或结构不受支持','数量、费用、状态或订单标志未满足当前模型条件。',mismatch],
 SCALING:['数值精度不受支持','代币、价格或数量精度缺失或超出模型范围。','检查同一市场的配置与代币精度，重新导出；不要自行缩放原始整数。'],
 NUMERIC_RANGE:['金额超出可安全计算范围','浏览器数值精度无法保证当前金额可准确复算。','保留原始整数，待精确数值模型支持后复核。'],
 REQUEST_AND_FILL_EVENTS:['请求与成交事件未能对应','已保存事件无法完整确认这一请求的成交。',mismatch],
 REQUEST_FILL:['退出请求与成交事件未能对应','事件匹配或 IOC 标志未满足核验条件。',mismatch],
 CHAIN_ENVELOPE:['交易链与区块身份核对','核对交易成功状态、目标合约、区块和日志归属。',mismatch],
 REQUEST_LEVERAGE:['杠杆记录不一致','API 订单杠杆与链上请求不同。',mismatch],
 API_CHAIN_PRICE:['成交价格不一致','API 价格与链上解码价格超过允许舍入差异。',mismatch],
 POSITION_EVENT_AMOUNTS:['开仓仓位金额不一致','仓位数量、抵押、费用或价格未对应链上事件。',mismatch],
 PROTOCOL_FEE_COMPONENTS:['协议费用分项不一致','保险与协议费用合计不等于订单费用。',mismatch],
 ACCOUNT_SETTLEMENT:['账户结算流水未能对应','流水身份、入扣账金额或费用与回执不一致或缺失。',collect],
 COLLATERAL_PLUS_FEE_DEBIT:['开仓账户扣款不平','抵押加开仓费用没有对应账户扣款。',mismatch],
 EXIT_EVENT_IDENTITY:['退出事件身份未对应','找不到唯一的对应平仓或减仓事件。',mismatch],
 EXIT_AMOUNTS:['退出数量或损益不一致','退出数量、资金、损益或费用与链上事件不一致。',mismatch],
 OPEN_PRECEDES_EXIT:['开仓和退出的先后顺序异常','不能确认对应开仓先于退出。',mismatch],
 FULL_CLOSE_SIZE:['全部平仓数量未对应','退出数量或状态无法证明该开仓已全部平掉。',mismatch],
 PARTIAL_CLOSE_SIZE:['部分退出数量未对应','退出前后数量及抵押变化未能核对。',mismatch],
 EXIT_COLLATERAL_AND_PRICE:['抵押释放或退出价格不一致','释放抵押、方向或退出价格未对应原始开仓。',mismatch],
 ENTRY_FEE_SHARE:['开仓费分摊不一致','退出部分承担的开仓费用超出允许舍入差异。',mismatch],
 COLLATERAL_PNL_FEE_CREDIT:['退出账户入账不平','释放抵押加损益减费用未对应账户入账。',mismatch]
};
for(const code of ['CHAIN_IDENTITY_MISMATCH','BLOCK_MISMATCH','BLOCK_IDENTITY_MISMATCH','TRANSACTION_DESTINATION_MISMATCH','LOG_IDENTITY_MISMATCH'])definitions[code]=['交易、区块或合约身份不一致','保存的回执不能确认为同一网络、同一交易的完整证据。',mismatch];
export function checkGuidance(code){const v=definitions[code];return v?item(code,...v):item('UNCLASSIFIED_CHECK','未能完成当前核验','当前证据尚未得到模型确认。','保留原始导出包，重新采集并检查模型版本；不要把未核验项目视为通过。');}
const labels={ACCOUNT_MARKET_IDENTITY:'账户与市场身份',ORDER_FIELDS:'订单字段与支持范围',SCALING:'价格、数量及代币精度',UNIQUE_RECEIPT:'唯一交易回执',CHAIN_ENVELOPE:'网络、合约与区块身份',REQUEST_AND_FILL_EVENTS:'请求与成交事件',REQUEST_FILL:'退出请求与成交事件',REQUEST_LEVERAGE:'请求杠杆',REQUEST_IOC:'IOC 请求类型',NO_BUILDER_FEES:'附加费用支持范围',API_CHAIN_PRICE:'API 与链上成交价格',FILL_HISTORY_COVERAGE:'成交历史覆盖',FILL_HISTORY:'退出成交历史',SINGLE_OPEN_POSITION:'单次开仓结构',POSITION_HISTORY_IDENTITY:'开仓仓位历史',POSITION_EVENT_AMOUNTS:'开仓事件金额',PROTOCOL_FEE_COMPONENTS:'协议费用分项',ACCOUNT_SETTLEMENT:'账户结算流水',COLLATERAL_PLUS_FEE_DEBIT:'抵押与费用扣账',NUMERIC_RANGE:'数值安全范围',SINGLE_FILL_SUPPORTED:'单个退出成交事件',SINGLE_EXIT_EVENT:'唯一退出仓位记录',EXIT_EVENT_IDENTITY:'退出事件身份',EXIT_AMOUNTS:'退出数量及损益',VERIFIED_OPENING:'对应开仓已核验',SINGLE_OPEN_SINGLE_EXIT_LIFECYCLE:'单开单退生命周期及分页完整性',OPEN_PRECEDES_EXIT:'开仓先于退出',FULL_CLOSE_SIZE:'全部平仓数量',PARTIAL_CLOSE_SIZE:'部分退出数量',EXIT_COLLATERAL_AND_PRICE:'释放抵押及退出价格',ENTRY_FEE_SHARE:'开仓费用分摊',COLLATERAL_PNL_FEE_CREDIT:'退出账户入账'};
export function checkLabel(code){return labels[code]??'其他核验项';}
export function importFailure(error){
 const m=error?.message??'';
 if(error instanceof SyntaxError)return item('INVALID_JSON','文件不是有效 JSON','文件可能被截断，或选中了网页、密钥文本等其他文件。','重新选择工具导出的完整 JSON；不要粘贴或上传 API 密钥。');
 if(m==='FILE_TOO_LARGE')return item(m,'文件超过 4 MB','本页限制单次导入体积，避免大文件阻塞浏览器。','用采集工具按较小账户或时间范围导出完整证据包；不要手动裁剪事件。');
 if(m==='UNSUPPORTED_EVIDENCE')return item(m,'文件类型不适用于账户工作台','支持账户观察、持仓复盘、组合总览、成交历史、成交复盘和事前基线。','选择下方文件指南中的 JSON。行情预演或方案对比文件请使用对应分析页，不要导入凭据文件。');
 if(/IDENTITY|NETWORK_OR_HEAD|POSITION_INSTANCE/.test(m))return item('IDENTITY_INVALID','账户或网络身份未通过','文件内部的账户、网络、市场或链头信息没有对应。',collect);
 if(/完整性|改变|改动|校验失败|无法复算|无法复现|复现|重现|不一致|MISMATCH|INTEGRITY|REPLAY/.test(m))return item('REPLAY_FAILED','文件完整性或复算未通过','保存结果与原始证据不一致，或当前模型无法重现此版本。','重新导出原始材料，并使用兼容的模型版本复核。不要手动改写结果或重新计算哈希以跳过检查。');
 if(m==='LOCAL_UNAVAILABLE')return item(m,'本机观察不可用','此服务没有可读取的本机采集文件。','使用“读取本机证据”选择已有 JSON；采集配置在本机完成，密钥不要放进网页。');
 return item('IMPORT_FAILED','未能读取这份证据','文件结构、字段或模型版本不受当前读取流程支持。','参考文件指南重新导出完整 JSON。原工作区保持不变；不要发送密钥或私有文件给公共服务。');
}
export function baselineGuidance(comparison,baseline){
 if(!baseline)return item('BASELINE_MISSING','缺少事前基线','成交与结算可以独立核验，但无法得出事前预估偏差。','若已有成交前保存的对应基线，可继续导入；若没有，保持偏差未知，在未来实际交易前保存预演，不能为旧交易补造。');
 if(comparison?.status==='compared')return null;
 const reason=comparison?.reason??'';
 if(reason.includes('两分钟'))return item('BASELINE_WINDOW','基线时间不适用','基线未早于成交，或成交超出保存后的两分钟关联窗口。','使用当时保存且处于有效窗口内的原始基线；不存在时保持未知，不能修改时间倒填。');
 if(reason.includes('网络、市场'))return item('BASELINE_PARAMETERS','基线参数与开仓不同','网络、市场、方向、原始数量或杠杆至少一项不一致。','选择对应这笔开仓的事前基线；保留原参数，不要修改文件强行匹配。');
 return item('BASELINE_ASSOCIATION','基线暂时无法关联','成交尚未通过核验，或订单对应关系不唯一。','先解决这笔开仓的证据问题，再比较基线；这项状态不会推翻已独立通过的结算。');
}
export function evidenceGaps(trade){
 const e=trade.observation.evidence,report=trade.report,gaps=[];
 const names={'order-history':'订单','fills':'成交','position-history':'仓位','account-history':'账户流水'};
 const missing=Object.entries(e.histories).filter(([,h])=>!h.complete).map(([k])=>names[k]??'历史');
 if(missing.length)gaps.push(item('HISTORY_PAGES',`${missing.join('、')}历史尚未完整`,'仍有未采集分页，无法确认完整交易生命周期。','扩大采集覆盖范围或完成剩余分页后重新导出；不要把 complete 字段手动改为 true。'));
 if(e.receiptCoverageComplete!==true)gaps.push(item('RECEIPT_COVERAGE','回执采集覆盖不足','部分历史交易的回执或交易详情未包含在文件中。',collect));
 const orders=e.histories['order-history'].pages.flatMap(p=>p.value.d);
 const unsupported=orders.filter(o=>![1,2,3,4].includes(o.t)).length;
 const pending=orders.filter(o=>[1,2,3,4].includes(o.t)&&![3,4,5,6].includes(o.st)).length;
 const empty=orders.filter(o=>[1,2,3,4].includes(o.t)&&[3,4,5,6].includes(o.st)&&!(o.fs>0)).length;
 if(unsupported)gaps.push(item('UNSUPPORTED_ORDERS',`${unsupported} 条订单类型未进入自动核验`,'当前自动复盘只处理支持的开仓、平仓类型。','保留这些记录，待模型支持后核验；不把未处理订单计为已通过。'));
 if(pending)gaps.push(item('NONTERMINAL_ORDERS',`${pending} 条订单未满足终态条件`,'非终态或未识别状态的订单未进入已完成成交复盘。','待订单状态明确后只读采集；无需为了验收取消或新增交易。'));
 if(empty)gaps.push(item('NO_FILLED_SIZE',`${empty} 条订单没有可核验成交量`,'零成交或缺失成交量不能证明发生了交易。','查看原始订单状态；未成交订单不计算成交偏差与结算收益。'));
 const failed=[...report.opening.orders,...report.closed].filter(r=>!r.status.endsWith('_reconciled'));
 if(failed.length)gaps.push(item('ORDER_CHECKS',`${failed.length} 笔订单核验尚未通过`,'文件可以读取，不代表每笔成交都已通过证据核对。','在逐笔交易中展开未通过订单，按具体缺项补齐；未核验净损益保持未知。'));
 return {gaps,orderCount:orders.length,checkedCount:report.opening.orders.length+report.closed.length,failedCount:failed.length};
}
