# Current acceptance: real baseline-to-fill-to-settlement lifecycle

The dedicated Monad Testnet account has completed one user-operated long opening and full close. A fresh read-only collection observed zero open positions, two order/fill/position history rows and both successful transaction receipts. Opening checks passed (18); closing checks passed (19), including returned collateral, signed funding, both fees, and account credit. A separate Python Decimal calculation reproduced price PnL, net PnL and final balance. Trading PnL excludes MON gas and deposit/withdrawal costs, which use separate transaction accounting.

Private identifiers, quantities and financial results remain in ignored `data/account-readonly/reports/`; they are not bundled into the public application. The browser imported the real trade review, independently decoded saved logs and recomputed the report; its exported workspace packet reproduced with the CLI.

## Actual pre-trade baseline acceptance

A second user-operated testnet long opening matched a baseline saved before the transaction and within its two-minute window. Network, market, direction, original quantity and leverage matched; all 18 opening checks passed. The saved packet independently reproduces the estimated/actual price comparison and quantity-normalized fee difference. Python Decimal arithmetic from raw integer book/order values independently matched the comparison. The earlier unrelated trade correctly remains unavailable for this baseline; it is not retrospectively matched.

The user has now fully closed the second position. The final read-only observation contains four order/fill/position-history rows, four transaction receipts, and zero open positions. Both openings pass 18 checks each and both exits pass 19 checks each. A separate Python Decimal calculation reproduces the second exit price PnL, both fees, account credit and final account balance. The complete baseline-to-fill-to-settlement workspace reproduces through the CLI and was imported successfully into the deployed public frontend for browser-local recomputation. This verifies one real baseline-linked lifecycle, not strategy profitability or general execution quality. Private identifiers and results remain under ignored `data/account-readonly/reports/`.

## Supported scope and remaining evidence

- Single IOC opening followed by one full or partial close, one taker fill per order; REST and contract enum/index conventions are checked explicitly.
- Synthetic regression covers long/short, partial IOC opening and partial/full exit. Only long/full-close has actual testnet evidence; synthetic cases are not claimed as real executions.
- Increases, collateral changes, multiple exits, inversion, liquidation, builder fees and other complex lifecycles fail closed or remain unsupported.
- Saved receipts establish consistency with collected RPC/REST data, not independent provenance, cryptographic inclusion proof or consensus finality.
- The first historical trade had no pre-trade baseline. Its price/fee estimate deviations remain unknown; the second trade has its own valid pre-trade baseline. No retrospective baseline is fabricated.
- Future baselines are exact-model-recomputed, saved within 45 seconds of calculation, and eligible for manual association only to a matching later testnet opening within two minutes. Hashes/local timestamps are not third-party timestamp or account-ownership proofs.
- One user-operated real baseline-to-fill comparison now passed. Broader real short/partial-fill/partial-exit coverage remains pending; no automatic trade is enabled.

## Reproduce privately

```sh
node scripts/replay.mjs /absolute/path/to/trade_review.json
node scripts/replay.mjs /absolute/path/to/tradepilot-private-trade-review.json
```

Browser: Account workspace → Read local evidence → trade history/review JSON. Optional: import a baseline saved before the trade. All processing remains in page memory; exporting creates a local file. Do not import credentials.

---

## Earlier opening-only acceptance (historical)

# Testnet opening reconciliation and model check

Local acceptance date: 2026-10-10. This covers the owner's existing test transaction, not a new order placed by TradePilot. No mainnet transaction or new trade permission was used.

Validation: 70/70 automated tests passed, the production frontend build passed, and the corrected decoder was deployed to the existing public demo. Public API synthetic-audit download/replay passed; private real evidence remains local. See PUBLIC_LAUNCH.md for release identity.

## Completed

- A dedicated local reader collected wallet/positions/context, four signed history endpoints and one transaction/receipt pair. History pagination reached the end of each stream. Raw packets remain in ignored private storage with 0600 permissions.
- One full IOC opening passed 18 checks joining wallet account, protocol instance, market, request, fill, position opening, account debit, block/hash and successful receipt. The report is independently reproducible through `scripts/replay.mjs`.
- Quantity, entry price, collateral and fee agreed across REST histories and decoded contract events. Insurance/protocol fee components sum to the gross fee; collateral plus gross fee equals the account debit.
- Actual position collateral contains a collateralized PnL component. It must not be described as only entry notional divided by leverage. Fee comparison against the current tier was within one collateral base unit; current fee configuration is not independent proof of the historical configuration.
- A separate Python Decimal calculation, using the pinned official SDK position formula and the saved API funding/configuration inputs, matched collateral, funding PnL, maintenance margin and estimated liquidation price. The official testnet **positions table** liquidation price agreed to its displayed precision. The order ticket's estimate was excluded because it describes a proposed order.

## Defects found by actual-chain acceptance

1. REST `at.txid` may omit `0x`. Normalize exactly 64 hex digits before RPC lookup; reject other formats.
2. REST order types are 1–4, while the contract SDK enum is 0–3. Receipt association now converts explicitly. Contract position side is likewise zero-based.
3. REST `at.l` is the log index **within the transaction**. RPC `logIndex` is block-global. Preserve both; count all transaction logs, including foreign-contract logs, before filtering by exchange.

The earlier synthetic fixtures incorrectly encoded the REST enum and used block-global indices as REST indices. They have been corrected and regression cases added for the distinction, mismatched chain/account/amounts, repeated logs, truncated history and stop-on-rejection behavior. Earlier synthetic audit packets may fail replay under the corrected decoder; regenerate them and never describe them as chain evidence.

## Use

Use the same private config and read-only credentials described in ACCOUNT_READONLY.md:

```sh
NO_PROXY=testnet.perpl.xyz,perpl.xyz,.perpl.xyz no_proxy=testnet.perpl.xyz,perpl.xyz,.perpl.xyz \
  node --use-env-proxy --env-file=data/account-readonly/credentials.env \
  scripts/read-history.mjs --config data/account-readonly/config.json --collect
node scripts/replay.mjs /absolute/private/history_audit_ID.json
```

Without `--collect`, only readiness is checked. Collection is sequential and capped at 22 upstream reads: five account/context/head reads, up to eight history pages, up to eight transaction/receipt reads, and one final head. Each history is limited to two 100-row pages, with truncation explicit. At most four distinct filled-order transactions are fetched. Rejections stop the run without automatic retries. This does not establish continuous monitoring; no repeated scheduling is configured.

The auditor currently supports a single-fill, fully filled opening IOC with no builder fee. Other structures are not automatically passed. Saved hashes/replay establish internal consistency, not source authenticity or consensus finality. Historical collateral/market parameters are not independently recovered from historical storage.

## Remaining

- The observed position remains open. Closing fee, released collateral and realized PnL have not been accepted.
- No pre-trade baseline exists for this manually entered order; execution deviation remains null.
- One long position and one fee tier do not validate shorts, partial fills, inversions, liquidation execution, or changing margin configuration.
- Private history audit import is not yet wired into the public account workspace. Its prior observation-only review must continue to mark chain evidence unverified until an appropriate audit is loaded and independently checked.

## References

- [Official REST history endpoints](https://github.com/PerplFoundation/api-docs/blob/main/rest-endpoints.md#trading-history-endpoints)
- [Official API types and transaction-local log index](https://github.com/PerplFoundation/api-docs/blob/main/types.md#blocktxlogtimestamp)
- [Official SDK 0.2.7 position calculations](https://docs.rs/perpl-sdk/0.2.7/src/perpl_sdk/state/position.rs.html)
- [Official SDK order types](https://docs.rs/perpl-sdk/0.2.7/src/perpl_sdk/types/order.rs.html)

Reference position source SHA-256: `2faf5ecca5da0967cccfab9e34e214317ba445cbba9c2cc97d83c58ac66b2460`. SDK revision/ABI license are retained under `server/vendor/`. Private measurements and the native UI observation record are retained alongside the private report, not published here.
