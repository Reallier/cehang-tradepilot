# CeHang TradePilot · 策航

Risk rehearsal and evidence-based strategy validation for Monad / Perpl traders.

策航帮助交易者在提交交易前检查费用、深度、杠杆与压力情景，并把假设、数据快照和核对结果保存为可复算证据。参赛方向：链上金融与交易 / Perpl Analytics & Risk Tool。

## Publication status

**This is a public business-source release. It is not a complete standalone frontend distribution.**

The backend, models, tests and authored React components are included. The local prototype uses the proprietary Data app runtime; that runtime, its compiler, template code and prebuilt bundles are intentionally absent while redistribution permission is unresolved. A fresh clone can run the backend tests and API, but cannot build or open the complete UI. Frontend integration imports are preserved and documented in [frontend-source/README.md](frontend-source/README.md).

GitHub publication does not establish Monad end-to-end settlement, a public HTTPS demo, real users, profitability or competition acceptance. Actual account / chain validation and demo videos remain pending. Real-money trading is disabled.

## Implemented scope

- Read-only Perpl public context, order book and completed candles.
- Fee, funding, depth, margin and stress estimates, with unknown inputs kept unknown.
- Two independent scenarios compared against the same market snapshot.
- Saved JSON evidence, hashes and complete local replay.
- Execution audit: five explicitly synthetic examples, including partial fills and missing evidence.
- Position exit estimates: six synthetic scenarios; actual settlement values stay unknown.
- Risk watch: eight synthetic stages, state deduplication and minimum refresh interval.
- Scenario presets and locally stored study records. No participant records are published.

## Run tests / local API

Node.js >=24.5 is required. Node 26 was used for local verification.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run scan:privacy
npm start
```

The service listens only on `127.0.0.1:8780`. Use `TP_PORT=18780 npm start` for a different port. Check it with:

```sh
curl http://127.0.0.1:8780/api/health
curl 'http://127.0.0.1:8780/api/execution-audit?example=full'
```

See source exports in `server/execution-examples.mjs` for valid example identifiers. The `/` route returns a missing-frontend response in this source-only checkout. This is expected, not a deployed UI.

The demo launcher removes inherited Perpl API key variables and forces testnet orders off. It does not load an environment file. State is created in ignored `data/private/`; `TP_DATA_DIR` may point to a separate private location. Never expose this local shared-state API directly to the internet.

To replay an exported evidence file:

```sh
node scripts/replay.mjs /absolute/path/to/evidence.json
```

Hashes and replay check internal consistency; they do not authenticate an upstream provider or prove a real transaction.

## Repository map

| Path | Purpose |
|---|---|
| `server/` | API, risk calculations, persistence, protocol adapter and receipt verification |
| `tests/` | Model, event decoding, safety and workflow tests using synthetic fixtures |
| `frontend-source/` | Authored React components and scoped styling; runtime not included |
| `scripts/replay.mjs` | Recompute exported evidence |
| `docs/MODEL.md` | Formulas, assumptions and interpretation limits |
| `docs/PUBLICATION_REVIEW.md` | Publication scope and privacy check results |

## Licensing

The repository is publicly readable; no open-source license has yet been granted for project-authored code. Third-party terms remain applicable to their respective files. The Perpl SDK event ABI is accompanied by its MIT license and provenance in `server/vendor/`. npm dependencies retain their own licenses. See [LICENSE_STATUS.md](LICENSE_STATUS.md).

## 中文说明

本仓库发布的是可审阅、可测试的业务源码。完整前端目前仍依赖未随仓库发布的专有运行时，直接克隆后可以运行后端与测试，不能直接构建完整页面。合成演练不计为真实交易、用户或收益；真实资金交易继续关闭。
