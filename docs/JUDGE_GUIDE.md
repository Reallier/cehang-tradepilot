# Judge quick start

**Project:** CeHang TradePilot / 策航. **Track:** Onchain Finance & Trading. **Target bounty:** Perpl Analytics / Risk Tool.

Live product: https://reallier.com/demos/tradepilot/?tab=account

No login, wallet, API key, deposit or transaction is required. Use a current desktop browser with JavaScript. The public app never places mainnet or testnet orders. Visitor records expire after 30 minutes or a service restart; local file imports stay in page memory and clear on refresh.

## Three-minute product walkthrough

1. **Account workspace → 体验完整合成案例.** Inspect the linked baseline, opening, exit and fee/PnL breakdown. Expand the receipt checks and export the full review. The fictional baseline price is 99.5 and fill price 100, producing adverse entry cost 0.5. The fully synthetic settlement net is 9.78, excluding Gas and transfers. These are teaching values, not observed profit or volume.
2. **账户更新与风险变化 → 体验风险变化案例.** Compare two synthetic observations, then choose **演示采集退避**. Missing/failed updates retain the previous evidence and never imply fresh account safety. A disappearing position does not prove settlement.
3. **Market workspace.** Read public Perpl quotes, edit a risk scenario and run the analysis when upstream data is available. Inspect fees, margin and the adverse scenario; compare two plans against the same snapshot. API rejection/expired data remains explicit. If data is unavailable, continue with the labeled synthetic example; it is not a substitute for current market data.
4. **Save a baseline → 带基线进入成交复盘.** Saving downloads evidence and carries the unchanged baseline to account review. It does not trade. Matching a real testnet trade requires separately collected history and receipts from that account; no private account packet is included in this repository.

## Independently reproduce

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
npm start
```

Requires Node >=24.5. Open `http://127.0.0.1:8780/?tab=account`. The synthetic paths and tests do not require upstream account access. Exported review packets can be checked with:

```sh
node scripts/replay.mjs /absolute/path/to/exported-review.json
```

## What has and has not been demonstrated

| Area | Evidence and limitation |
|---|---|
| Public UI | HTTPS deployment and resource checks; current source builds independently |
| Local model and safety | 110 automated tests; synthetic coverage is identified explicitly |
| Actual testnet lifecycle | Two previously collected user-operated long/full-close lifecycles; one with an earlier matching baseline. Saved-data replay only; private raw packets excluded |
| Account continuous updates | Three consecutive local testnet read-only cycles succeeded on 2026-10-10 at 23:43 Asia/Shanghai (chain 10143, empty positions, no validation issues). The collector stopped at the requested three-cycle limit. The default 15-cycle run, unattended polling, and live 429/451 recovery are **not accepted** |
| Public wallet data | No owner account/credentials exposed; public update example is synthetic |
| Model scope | No general strategy-profit claim; no independently established source provenance or consensus finality |
| Human usability | No external-user comprehension or adoption evidence yet; automated checks are not user interviews |
| Videos | Technical demonstration and team/pitch video still pending |

See [history acceptance](HISTORY_ACCEPTANCE.md), [account monitor](ACCOUNT_MONITOR.md), [model assumptions](MODEL.md) and [build disclosure](BUILD_DISCLOSURE.md). The app is a pre-trade risk and post-trade validation tool; the current read-only build is not presented as a production automated trading bot.
