// One source for current product claims. Historical release notes remain dated records.
export const CAPABILITIES=[
 {id:'preview',label:'公开行情、成本及风险预演',implementation:'implemented',automated:true,testnet:'market_read_verified',boundary:'估算模型；不承诺收益或实际清算价'},
 {id:'long',label:'多头单次开平仓与基线复盘',implementation:'implemented',automated:true,testnet:'limited_verified',boundary:'已有有限历史测试网证据；不代表所有交易结构'},
 {id:'short',label:'空头单次开平仓',implementation:'implemented',automated:true,testnet:'pending',boundary:'合成回归覆盖；真实链端样本待补'},
 {id:'staged',label:'单次开仓后的连续部分退出',implementation:'implemented',automated:true,testnet:'pending',boundary:'每次单个吃单事件；不支持加仓和抵押变更'},
 {id:'scenario',label:'逐市场价格、资金费与退出情景',implementation:'implemented',automated:true,testnet:'not_applicable',boundary:'输入为假设；不把深度比例冒充盘口'},
 {id:'research',label:'研究档案、后台复算与可选本机恢复',implementation:'implemented',automated:true,testnet:'not_applicable',boundary:'本机明文存储须主动开启；不自动上传'},
 {id:'diagnostics',label:'运行诊断与读取状态',implementation:'implemented',automated:true,testnet:'not_applicable',boundary:'被动记录本进程状态，不主动增加协议请求'},
 {id:'funding',label:'跨资金周期的实际事件归因',implementation:'planned',automated:false,testnet:'pending',boundary:'目前可核对退出资金损益，尚非完整周期归因'},
 {id:'live',label:'真实资金与公共自动下单',implementation:'disabled',automated:true,testnet:'not_applicable',boundary:'公共服务主网与测试网下单均关闭'}
];
