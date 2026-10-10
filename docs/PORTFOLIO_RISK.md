# Account portfolio risk — 2026-10-10

## Product scope

Account workspace → Account risk overview. Import a verified account observation or use the explicitly synthetic three-position example. Apply the same percentage change to every observed mark price; inspect per-position losses, equity, margin buffer and the count crossing an estimated isolated threshold. Click a row to carry that scenario into the existing single-position view.

No API polling, account collection, trading, persistent browser storage or upload is added. The pure calculation is memoized by packet and shock; session-clock renders do not recalculate it. Public synthetic examples are literals, never private account data.

## Arithmetic and boundaries

- Group by chain, account, protocol instance and token ID/address. Same symbols are not identity. No cross-group grand total or undocumented FX conversion.
- Gross exposure = sum(size × observed mark); signed exposure uses +long/−short. These are collateral-denominated linear exposure measures, not base-token quantities.
- Shock delta = direction × size × (scenario mark − observed mark). Scenario equity = observed equity + delta. Funding remains the saved observed value; entry fees already charged are not deducted again.
- Maintenance and liquidation follow the existing isolated-linear model. No new protocol liquidation or cross-margin model is claimed. Each position's buffer is evaluated separately; a winning position never rescues another position's threshold failure.
- Contribution share uses nonnegative adverse deltas divided by their group sum. Positive deltas do not offset the loss ranking. With zero total loss, share is unavailable, not zero. Incomplete groups do not show shares or a complete total.
- Missing market/funding/maintenance/token identity or snapshot issues remain unknown. Known complete positions have a separately labeled subtotal and coverage. Arithmetic for incomplete rows is diagnostic only, not a complete risk result.
- Wallet/free balances are excluded to avoid adding unavailable collateral or double counting. Empty positions do not prove settlement or absence of other account risks.
- Static synchronized shocks are assumptions, not a covariance model or return forecast. No future funding, close fees, gas or liquidation path simulation. Values beyond a threshold are not realizable outcomes.
- Observation time is displayed, including historical/non-live status. Hash/model reproduction proves internal consistency, not upstream authenticity or chain finality.

## Export

`account-portfolio-review-v1` contains original observation, selected shock and reproduced report/hash. Import restores the shock locally. `node scripts/replay.mjs /absolute/path/report.json` revalidates the observation and recomputes the report, rejecting altered results even when their hash is recomputed. Private exports contain account information and must stay private.

## Acceptance

92 tests pass, including independent long/short arithmetic, isolated threshold despite positive aggregate equity, token/account separation, unknown/stale data, empty snapshots and rehashed tampering. Local Chrome verified the three-position/two-token synthetic case, −20% → two threshold flags, correct single-position drilldown and exported JSON independently replayed in Node. No new trades were needed.

Public Chrome acceptance also passed: synthetic example, −20% threshold flags, position drilldown and returning to overview preserve the scenario. Local export/reimport restores the original shock. HTTPS JS/CSS match the release, and public trading remains disabled.
