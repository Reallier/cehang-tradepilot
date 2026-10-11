# Cross-experiment descriptive comparison

The testnet research workspace computes a local comparison from the current experiments, without extra protocol requests, account collection or orders. It replays each baseline and trade file through the existing research verifier. Only a supported, fully reconciled opening/full exit with a matching pre-trade baseline enters statistics. Draft, mismatched, partial and unsupported experiments remain visible with exclusion reasons.

## Counting and comparable groups

A lifecycle identity includes file classification, chain, wallet, account, market, opening order and transaction. Exact duplicate economic/baseline evidence counts once, chosen by sorted experiment ID. Conflicting baselines or results for the same identity exclude every variant; moving one variant to another scenario group cannot turn it into an additional sample.

Groups separate saved-testnet and synthetic classification, wallet/account, chain, market/instance/perpetual, collateral address/decimals, direction, model/assumptions, fee tier/rate, initial/maintenance margin rules and planned shock/hours/slippage limit. Notional, leverage and actual duration are displayed per lifecycle. These are descriptive groups, not controlled experiments: different market times, liquidity and selection bias remain. Fewer than two distinct lifecycles explicitly means no within-group comparison. File labels and hashes do not certify authenticity, account ownership or collection time.

## Units and interpretation

- Adverse entry deviation: `(actual / estimated price - 1) × 10,000`, positive for a worse long fill; sign reversed for short. Denominator is the estimated price.
- Entry fee deviation: actual opening fee minus baseline fee for the filled size, divided by actual opening notional, × 10,000.
- Two-sided trading fee: opening fee share plus closing fee, divided by actual opening notional, × 10,000.
- Funding PnL and realized net PnL: each divided by actual opening notional, × 10,000. Net PnL uses reconciled settlement, excludes gas and is not a strategy return estimate.
- Pre-trade stress buffer: `(stressEquity - maintenanceEstimate) / baseline notional × 100`. This is a saved model scenario, not an actual liquidation distance or a forecast of realized PnL.

Group metrics report count, equally weighted mean, median and range. They do not combine monetary totals across assets/accounts, annualize, report statistical significance or rank strategies by supposed profitability. Individual rows retain absolute token-denominated fees/funding/net amounts, actual duration and the link back to experiment evidence.

## Export and compatibility

`testnet-research-comparison-v1` contains the workspace, derived report and hashes. `node scripts/replay.mjs <file>` rebuilds all evidence checks and statistics, rejecting changed reports even if their hash was recomputed. The comparison archive can restore the research workspace; export includes current text drafts. Existing `testnet-research-workspace-v1` archives retain their schema and replay behavior. Files remain browser-local and may contain private wallet/transaction information; save them privately. The existing 20-experiment / 8-MiB bounds remain.

This adds comparisons between supported single-opening/full-exit experiments. The separate `size_leverage`, partial-exit, funding-cycle and long-observation acceptance types remain unsupported; a descriptive comparison does not certify those test protocols.
