# Preview-to-review path

The compact strip above the market and account workspaces links four actions:

1. Select a market and scenario; run risk analysis against public data.
2. Save the pre-trade baseline. The existing 45-second freshness and two-minute association rules still apply. The JSON downloads locally and its original object remains in page memory across tab changes.
3. Use **带基线进入成交复盘** to carry that verified baseline to the account workspace without a file round trip. Import saved trade history/receipts through the local file selector. Baseline-only imports do not imply a fill.
4. Read the matching baseline comparison and settlement review, then export the complete workspace. Progress counts derive from reproduced evidence, never tab visits or an empty position list.

The saved baseline is separate from current market parameters. Editing those parameters or switching networks clears the preview; an older saved baseline is not presented as a baseline for the new preview. Mainnet baselines are explicitly unsupported for the current testnet-only trade review.

**体验完整合成案例** opens the existing fictional lifecycle with its own earlier baseline. It replaces the imported review materials and baseline, clearly identified as synthetic. It is unrelated to a live market preview and does not count toward real volume, acceptance or returns. Existing downloaded files are unaffected.

Imported evidence and carried baselines remain in page memory; refresh clears them. No new account requests, polling, credentials or transaction endpoint is added. Position scenario calculations are memoized by evidence, selection and shock rather than recomputed on every clock tick.

## Acceptance scope

The product/about and privacy copy now reflect HISTORY_ACCEPTANCE.md: two saved user-operated testnet long/full-close lifecycles, one with a valid earlier baseline. Existing private saved evidence was replayed again while implementing this path: two full closes and one matching baseline. This is saved-data consistency, not a fresh account observation, general strategy validation or chain-finality proof. Private source files remain excluded from the public bundle.

Automated verification: all 101 tests pass, including progress rejection for missing receipts/forged results and a valid but too-late baseline. Production bundle and React server-render smoke pass. This revision has not received a new interactive browser acceptance; the previously imposed Computer Use restriction remains respected.

Source publication, videos, external-user comprehension and broader real short/partial-close cases remain separate work.
