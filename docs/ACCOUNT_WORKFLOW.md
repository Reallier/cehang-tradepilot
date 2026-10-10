# Account workspace

The terminal now joins a verified account observation, historical position stress and an exportable review. The public service remains credential-free and rejects orders.

## Public use

Open `?tab=account`, choose an `account_observation_*.json` produced by the local read-only collector, and select a position. The browser verifies snapshot/report hashes and recomputes the account report. File contents remain in page memory: no upload, localStorage or IndexedDB. Refresh clears them. Files above 4 MiB are rejected. Importing a file does not authenticate the provider or prove chain settlement.

The three steps are actual observed position, historical stress, and review. Observations older than 45 seconds are explicitly historical, and never advertised as live monitoring. Shocks use the saved mark and funding, omit future funding/exit costs and do not model early liquidation. Review leaves pre-trade baseline, execution deviation, receipt verification and settled PnL unknown when absent. The private review export includes the underlying account packet; do not publish it.

Replay a downloaded review with `node scripts/replay.mjs /absolute/path/tradepilot-private-review.json`.

## Local operator use

Set `TP_LOCAL_ACCOUNT_FILE` to the absolute path of a previously collected account packet and start the server on a free loopback port, e.g. `TP_PORT=18943 TP_DATA_DIR=data/local-workflow TP_LOCAL_ACCOUNT_FILE=/absolute/private/observation.json node server/index.mjs`. The account workspace loads that file when opened. The refresh button reloads the saved file; it does not collect live data or renew the API key. Keep using the separate read-only CLI for fresh collection.

`/api/local-observation` reads a file only with explicit configuration, loopback bind, loopback origins, no public HTTPS origin and no deployment base path. Otherwise it returns `available:false` before accessing the file. It uses the existing visitor session/Host/Origin checks and remains unavailable on the public deployment. No credentials are loaded by this endpoint.

Validation: 64 automated tests passed, including import tampering, shared model replay, stress arithmetic, unknown execution evidence and public/private file isolation. Native Chrome verified the actual local test position and changes between -10% and -20% stress. This does not certify every mobile device or a complete test-trade settlement.


## Trade review and pre-trade baseline

The account workspace also accepts `trade-history-observation-v1`, `testnet-history-audit-v1`, `testnet-trade-review-v2` and its own `account-trade-workspace-v1` export. Saved receipt logs and histories are recomputed in the browser using the same pure verifier as the CLI. Trade import replaces the account snapshot with that packet's account, preventing mixed account views. Empty positions do not imply successful settlement. A reconciled exit shows collateral returned separately from net PnL including opening/closing fees and signed funding.

The market result provides **Save pre-trade baseline**. Save within 45 seconds of a valid preview. Import the baseline in the account workspace to compare a later matching testnet opening within two minutes. Old trades cannot acquire a genuine baseline afterwards. Manual matching does not establish wallet ownership or independently certify file creation time. A changed or expired baseline is rejected or shown unavailable.

No private trade data is sent to a server; file imports and exports use browser memory and Blob downloads. Receipt recomputation is memoized per file/baseline, not repeated on the UI clock. The public instance still has no private API key, read-only account endpoint or order capability.
