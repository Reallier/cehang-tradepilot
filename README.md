# CeHang TradePilot · 策航

Risk rehearsal and evidence-based strategy validation for Monad / Perpl traders.

策航帮助交易者在提交交易前检查费用、深度、杠杆与压力情景，并把假设、数据快照和核对结果保存为可复算证据。参赛方向：链上金融与交易 / Perpl Analytics & Risk Tool。

## Current status

The repository now includes an independently buildable frontend and an isolated public-demo backend. It does not require or redistribute the proprietary Data app runtime. See [deployment instructions](docs/DEPLOYMENT.md).

The demo is deployed over HTTPS; see docs/PUBLIC_LAUNCH.md for its verified release. Real-money and testnet trading remain disabled in the demo server. One private testnet long opening and full close have been reconciled against API history and chain events, including trading PnL and both fees (docs/HISTORY_ACCEPTANCE.md). A second testnet lifecycle has also passed a real pre-trade-baseline-to-fill-to-full-close comparison, with zero remaining positions; demo videos remain pending. The account workspace offers an explicitly synthetic, reproducible end-to-end example without keys or private files.

## Judge entry and current boundary

Start with the [judge walkthrough](docs/JUDGE_GUIDE.md) and [existing-foundation / competition-work disclosure](docs/BUILD_DISCLOSURE.md).

Current verification: **110 automated tests pass**. A corrected local proxy-bypass invocation completed one real testnet read-only cycle on 2026-10-10 at 19:44 Asia/Shanghai (chain 10143, no open positions, no validation issues). An earlier HTTP 451 attempt had omitted the lowercase `no_proxy` override. This single cycle does not establish continuous refresh; the collector stopped at its configured one-cycle limit. Earlier saved testnet lifecycle checks remain historical evidence. Public account-update examples are explicitly synthetic. See [monitor behavior and limits](docs/ACCOUNT_MONITOR.md).

## Implemented scope

- Read-only Perpl public context, order book and completed candles.
- Fee, funding, depth, margin and stress estimates, with unknown inputs kept unknown.
- Two scenarios compared against the same market snapshot, with local margin/loss budgets and parameter transfer to a fresh preview.
- Saved JSON evidence, hashes and complete local replay.
- Account workspace: browser-local observation/history import, position stress, receipt/settlement review, pre-trade baseline comparison and replayable export. One-click synthetic guided case requires no wallet or files. See [account workflow](docs/ACCOUNT_WORKFLOW.md).
- Collateral-aware portfolio stress, guided evidence import and direct pre-trade-baseline handoff.
- Bounded loopback-only account monitoring, observation deltas and failure/staleness states; actual continuous refresh remains blocked as described above.
- Execution audit: five explicitly synthetic examples, including partial fills and missing evidence.
- Position exit estimates: six synthetic scenarios; actual settlement values stay unknown.
- Risk watch: eight synthetic stages, state deduplication and minimum refresh interval.
- Scenario presets and locally stored study records. No participant records are published.

## Run tests / local API

Node.js >=24.5 is required. Node 26 was used for local verification.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
npm run scan:privacy
npm start
```

The service listens only on `127.0.0.1:8780`. Use `TP_PORT=18780 npm start` for a different port. Check it with:

```sh
curl http://127.0.0.1:8780/api/health
curl -c /tmp/tradepilot-demo.cookies http://127.0.0.1:8780/api/session
curl -b /tmp/tradepilot-demo.cookies 'http://127.0.0.1:8780/api/execution-audit?example=full'
```

Open `http://127.0.0.1:8780/` for the complete UI. API routes except health require a visitor cookie: obtain it through `/api/session` first. The examples endpoint uses synthetic data; it does not contact an exchange.

Both the launcher and server enforce the credential-free demo boundary. Visitor records are isolated in memory, expire after 30 minutes and disappear on restart. Export records you need to keep. Shared protocol restriction state is stored in ignored `data/public-demo/`. Configure HTTPS and an explicit domain allowlist before exposing the service.

To replay an exported evidence file:

```sh
node scripts/replay.mjs /absolute/path/to/evidence.json
```

Hashes and replay check internal consistency; they do not authenticate an upstream provider or prove a real transaction.

## Repository map

The local read-only CLI has passed one actual Perpl test-account observation and private replay (2026-10-10): an initial deposit-only observation, followed by a long opening and full close. See [account read-only acceptance and boundaries](docs/ACCOUNT_READONLY.md). Current acceptance details and boundaries are in docs/HISTORY_ACCEPTANCE.md. Host credentials and private account data are not exposed through the public demo.

| Path | Purpose |
|---|---|
| `server/` | API, risk calculations, persistence, protocol adapter and receipt verification |
| `tests/` | Model, event decoding, safety and workflow tests using synthetic fixtures |
| `frontend-source/` | Independent React shell, charts, evidence components and business pages |
| `scripts/replay.mjs` | Recompute exported evidence |
| `docs/MODEL.md` | Formulas, assumptions and interpretation limits |
| `docs/PUBLICATION_REVIEW.md` | Publication scope and privacy check results |

## Licensing

The repository is publicly readable; no open-source license has yet been granted for project-authored code. Third-party terms remain applicable to their respective files. The Perpl SDK event ABI is accompanied by its MIT license and provenance in `server/vendor/`. npm dependencies retain their own licenses. See [LICENSE_STATUS.md](LICENSE_STATUS.md).

## 中文说明

完整前端已迁移为独立实现，可从公开源码构建，无需安装 Codex 插件。公网演示适配加入域名校验、访客会话隔离和有界限流；本地验收不等于公网部署完成。合成演练不计为真实交易、用户或收益。真实资金和测试网交易均关闭。现已完成一次私有测试网多头开仓、全部平仓与结算核对；另一次测试网交易已通过事前基线、成交偏差、全部平仓及结算核验，最新观察为空仓，详见 docs/HISTORY_ACCEPTANCE.md。

## Public demonstration

Open [CeHang TradePilot](https://reallier.com/demos/tradepilot/). Trading is disabled; visitor records are temporary. See [public launch evidence and limits](docs/PUBLIC_LAUNCH.md).
