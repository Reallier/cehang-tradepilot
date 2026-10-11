# Testnet research workspace

The **测试网实验台** page organizes up to 20 experiments in browser memory. It sends no imported account data to the server and adds no background API polling. Export the workspace before refreshing; restore replaces the page's existing workspace. Exports contain private wallet/trade details and should not be publicly uploaded. Maximum complete export size is 8 MiB. No localStorage or unattended trading is added.

## Workflow

1. Create a short or long single-lifecycle experiment; save the question and notes.
2. Prepare a fresh testnet preview. The preparation action selects Monad Testnet, the chosen direction, 1× leverage, zero-hour funding assumption and an adverse 5% price scenario. It preserves the current requested size and slippage input. It does not submit a trade or recommend that size.
3. Save the pre-trade baseline before opening. Import it or associate the most recently saved baseline. Expired baselines cannot be retroactively replaced to claim a historical match.
4. The user completes the final trade actions in the official testnet UI. Public TradePilot does not submit orders. Use only the authorized test account and test tokens.
5. Collect history with the existing local read-only tool, import the trade/review file, and select the corresponding opening. Importing a complete review replaces its baseline, including an explicit null; importing raw trade data preserves the existing baseline.
6. Inspect execution, costs, exit and settlement. Export the full research workspace and independently replay it with `node scripts/replay.mjs /path/to/workspace.json`.

A passing row requires a supported direction, a reproduced testnet baseline, a verified opening, a matched baseline and a verified full exit. No manual status override exists. The report is recalculated after import; hashing alone cannot certify the file's origin, original save time or current chain state.

## Coverage boundaries

| Experiment | Current workspace acceptance |
| --- | --- |
| Long single opening and full exit | Supported; imported testnet and synthetic evidence counted separately |
| Short single opening and full exit | Supported; further user-operated testnet evidence still needed |
| Size / leverage comparison | Separate single-lifecycle experiments can be recorded; cross-experiment attribution pending |
| Multiple fills or partial exits | Planning and notes only; complete experiment acceptance pending |
| Funding-period observations | Planning and notes only; event/time-window attribution pending |
| Long-running read-only monitoring | Existing monitor remains separate; experiment-level acceptance pending |

The same chain/wallet/account/market/opening transaction referenced by multiple experiments counts once within its source classification. Synthetic examples cannot contribute to the saved-testnet coverage count. Saved-testnet classification itself is a file claim, not independent source authentication. Repeated observations of the same trade are not extra trials and trade counts are not evidence of profitability.

The bounded history collector still reads at most four unique transaction receipts per collection (at most 22 upstream reads). A longer account history can therefore have missing receipt coverage. The experiment page exposes each trade's reconciliation state; it does not raise collection limits or bypass restriction/cooldown rules. Targeted collection is now supported: select the experiment opening, export its receipt target, then pass the file with `--target` to the local history reader. It resolves all filled order transactions associated with the same account/market/position in the already fetched history. Missing or ambiguous opening/order rows and more than four distinct target hashes stop before any transaction RPC. Unrelated history is retained for lifecycle checks; its missing receipts remain explicit.

## Validation

Unit and offline React DOM tests cover synthetic/real-file separation, duplicate counting, unsupported experiments, direction mismatches, null-baseline replacement, tampered reports, bounded archive parsing, tab retention, export/restore and late-import cancellation after clear. DOM tests do not establish browser rendering or new chain transactions.


## Targeted read-only collection

```sh
node --use-env-proxy --env-file=data/account-readonly/credentials.env scripts/read-history.mjs --config data/account-readonly/config.json --target /absolute/tradepilot-receipt-target.json
# Only after local readiness passes, explicitly collect once:
node --use-env-proxy --env-file=data/account-readonly/credentials.env scripts/read-history.mjs --config data/account-readonly/config.json --target /absolute/tradepilot-receipt-target.json --collect
```

The readiness-only command validates local configuration and target shape; it does not query or prove the target exists. Use the already approved network configuration. Existing restrictions, cooldowns and authentication checks apply unchanged. No automatic retry or new pagination is introduced.

`receiptCoverageComplete` retains its all-observed-orders meaning. Targeted observations additionally carry `receiptSelection`, and replay derives it again from the preserved history. `targetReceiptCoverage.receiptsAvailable` means the selected receipt/transaction responses are non-null; only full trade checks can establish reconciliation. `historyComplete` remains separate, and truncated history still blocks supported full-exit settlement checks. There is no API endpoint for private collection in the public application.


### Acceptance — 2026-10-11

130 tests pass. A single authorized read-only collection of an existing private testnet long lifecycle returned two selected receipts, complete history pagination, a reconciled opening and full exit, and a reproduced pre-trade baseline match. All-history receipt coverage correctly remained false because another lifecycle was outside the target. The restored research archive counted one saved-testnet lifecycle. No new trade or continuous collection was performed; actual short acceptance remains pending.


## Manual short baseline preparation

The local baseline tool now accepts `--direction long|short` (default remains long). Long uses the best ask and a -5% scenario; short uses the best bid and a +5% scenario. Both preserve the requested integer raw quantity, require Monad Testnet, cap requested notional at 25 collateral units, leverage at 1–5×, and use a 1% slippage ceiling. Neither signs or submits orders.

```sh
node --use-env-proxy scripts/read-baseline.mjs --config data/account-readonly/config.json --market MARKET_ID --raw-size RAW_QUANTITY --leverage 2 --direction short
```

Use the actual market ID and precision; do not guess them. Prepare the baseline only once the official page and account checks are ready: it expires two minutes after saving. A short baseline is not a completed short test. Direction/book-side and invalid-input tests bring source regression coverage to 132 tests.

The 2026-10-11 short acceptance attempt stopped before baseline creation or any new order: after refresh the official testnet frontend displayed a geographic-unavailability notice. Its cause and HTTP status were not established. A separate read-only account observation returned zero positions but `HEAD_NOT_COVERED` for wallet and positions, so account readiness was not accepted. Previously completed historical lifecycle checks remain historical evidence.

### Bounded WebSocket snapshot preparation

The local baseline CLI also accepts `--book-source websocket`; the default remains `rest`. Select this explicitly when diagnosing stale REST snapshots. It opens one public connection to the fixed official testnet market-data endpoint, subscribes to one market, and closes after a subscription-confirmed complete snapshot. The adapter has a 12-second deadline, 8-frame / 4-MiB input budget and no credentials, automatic reconnect, automatic source fallback or order frames. It does not apply incremental updates. A stale snapshot fails immediately; repeated requests are not used to wait for a pass.

```sh
node --use-env-proxy scripts/read-baseline.mjs --config data/account-readonly/config.json --market MARKET_ID --raw-size RAW_QUANTITY --leverage 2 --direction short --book-source websocket
```

Use the already approved network route. Existing eligibility, protocol restriction, cooldown and request-budget checks apply; subscription 429 pauses access and public 403/451 records the existing restriction state. The snapshot must match the acknowledged stream ID, carry consistent block/sequence metadata, have valid sorted uncrossed depth, and pass the unchanged 45-second freshness and risk checks. Exported provenance identifies the WebSocket URL, market, stream, receive time and raw-frame hash. These local records are reproducible evidence, not cryptographic authentication of the upstream service or proof of a trade.

**2026-10-11 follow-up:** after correcting the browser route, the official testnet page became accessible and a later bounded account observation completed with empty positions. REST book responses returned HTTP 200 but lagged context by 1,470 blocks in one diagnostic read; a separate 20-second public WebSocket observation returned a fresh snapshot, a book update and advancing heartbeats. The new CLI then saved a short baseline from a roughly 9-second-old snapshot, and the independent replay command reproduced it. This proves snapshot acquisition and pre-trade preparation only: no new order was submitted, short opening/full-exit acceptance remains pending, and the saved baseline expires after two minutes. Public demo data fetching remains unchanged by this local CLI addition.

Protocol references: [REST snapshot timestamps](https://github.com/PerplFoundation/api-docs/blob/main/rest-endpoints.md#get-apiv1market-datamarket_idbook), [public WebSocket subscriptions](https://github.com/PerplFoundation/api-docs/blob/main/websocket.md#market-data-websocket).
