# Research workflow upgrade — 2026-10-12

## Browser work and privacy

Research mutations, archive import/merge and export run in a dedicated module Worker. The verified report is reused by the comparison view; state is committed only after successful validation. Cancelling terminates the worker and generation checks reject late file/API results. Older workspace/comparison v1 and trade-review v2 packets retain their original replay rules; new exports use workspace/comparison v2 and trade-review v3. Raw observations are rechecked under the current model; an old report is never silently rewritten.

本机研究恢复 is opt-in and off on each page load. Enabling it saves complete research drafts locally after a debounce, with the last three distinct versions in IndexedDB. This is plaintext storage for this site/browser, not an encrypted vault or cloud backup. Shared devices should leave it off. Restore independently replays the selected archive and replaces the page workspace; disable autosave before restoring. 删除全部本机快照 clears stored versions without clearing the current page. Browser storage removal/quotas can lose copies, so exported files remain the portable backup. No credential is stored by this feature.

Explicit cancel and before-unload warnings remain. Public evidence is not uploaded by these features. Optional panels load through build-generated chunks. Hashed chunk assets are cacheable; entry HTML/JS retain no-store. The backend only serves named root assets and traversal-free JS chunk names, never build metadata, source or private data.

## Sequential settlement (v3)

The new verifier supports one verified opening followed by ordered reductions and final close, with exactly one taker fill per exit. It checks receipt/API identities, complete history, sequence, start/end quantities and collateral, remaining entry-fee allocation, each settlement credit and zero remaining balances on full close. Duplicate/missing prior events, unsupported collateral changes/increases, foreign receipts and inconsistent amounts cannot certify a later close. Openings/exits are associated by account, market and position; the trade view shows a per-exit ledger and cumulative realized components only when all associated exits verify.

Amounts use integer arithmetic for remaining collateral/fees. A partial allocation permits one smallest collateral unit of rounding difference; the final close must consume the exact remaining entry fee. Single-fill, zero-builder-fee restrictions remain explicit. Gas and transfers remain outside PnL. This is saved-evidence replay, not independent consensus finality.

The field definitions were checked against [Perpl's official types](https://github.com/PerplFoundation/api-docs/blob/main/types.md); receipt ABI provenance remains in server/vendor. Synthetic long/short staged exits and adversarial mutations test the new algorithm. Actual staged-exit testnet acceptance remains pending and is not inferred from synthetic tests.

## Scenario and operational analysis

账户风险总览 now includes 逐市场压力情景: per-market shock, assumed funding bps per protocol interval, holding hours, assumed adverse exit price bps and assumed executable percentage. Funding uses scenario notional with a constant rate, long pays positive/short receives positive. Executable percentage is a user assumption, not observed order-book depth. Remaining size is visible; no future liquidation path, future fee change or unknown FX valuation is simulated. Missing inputs remain unknown, units/account groups stay separate. Export/import has an independently replayed scenario schema.

访问与隐私 → 运行诊断 reads passive process-local market outcomes, previous success, cooldown/restriction and bounded event history. It adds no upstream probe, never exposes raw errors, credentials or account data, and does not clear restrictions. Health probes remain simple process liveness; upstream problems must not trigger restart loops.

## Test planning and claims

固定条件测试网实验计划 creates 1–3 repetitions each of long/full, short/full and long/staged drafts using one parameter set. It exports a replayable plan and merges drafts into the workspace. Each actual trial needs current-market minimum-size checks, a fresh baseline and actual saved trade/receipt evidence. If a partial size is below the protocol minimum, record the trial as infeasible rather than enlarging funding. No orders are submitted; no baseline time is changed to fit a trade.

server/capabilities.mjs drives the UI and generated CURRENT_CAPABILITIES.md. Run `node scripts/capability-docs.mjs --test-log /absolute/completed-test.log` after a complete successful suite. Historical dated release reports are preserved. Actual chain samples, automated tests, source deployment and human usability remain separate evidence categories.
