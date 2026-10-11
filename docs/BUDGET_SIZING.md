# Budget-driven size analysis

## User flow

Workbench → Plan comparison → run a comparison → enter margin and/or scenario-loss budgets → choose A or B as the fixed assumptions → set a target-notional search ceiling → calculate.

The result gives a **model-feasible interval on a 0.01 target-notional grid**, starting at 1 and ending no later than the user's ceiling (maximum 10 million). It is not a search over direction, leverage, holding time or shock. Quantity still follows the existing protocol precision and floors down. Several adjacent target amounts can therefore correspond to the same actual quantity. Actual book-valued notional can differ from the target amount.

The lower and upper endpoints can be transferred to the existing preview. Transfer clears the prior preview and requires fresh market analysis before a new baseline can be saved. Changing budgets, ceiling or base plan hides the old sizing result. Changing comparison parameters invalidates the source comparison and its sizing workspace.

## Cost and data boundary

The first calculation loads the already saved comparison evidence from the same-origin visitor session. Further calculations reuse it in page memory; there are no added protocol requests or polling. Budgets stay in the page and in a user-requested export. Expired/missing visitor evidence is an error, never a substituted current snapshot.

Search uses the comparison's evaluation time, so results describe that saved market, not current liquidity. The UI labels this boundary. Market status, 45-second freshness at that historical evaluation time, fees, funding, maintenance, protocol minimum, depth and slippage checks are inherited from the preview model. Missing inputs remain unknown. At least one budget is required; zero is an explicit limit. Margin excludes extra fees and Gas, and the loss cap applies only to the chosen scenario, not maximum possible loss. The interval is not a recommended or guaranteed-safe position.

## Algorithm and limits

There are two integer binary searches: first find the smallest grid amount meeting quantity and settlement minimums, then find the last passing amount under all model/budget checks. Endpoints and the next grid amount are evaluated with the same full `simulate` function. At most 70 distinct candidate evaluations are allowed, in addition to source-comparison replay. Books over 1,000 levels per side return unknown.

This relies on the fixed isolated-linear model and sorted positive-price book: filled value increases with quantity; average execution price worsens as quantity grows; slippage and margin budgets are upper constraints. For long positions, price/fee/funding loss is convex from zero unless the combined cost coefficient is negative, in which case the modeled loss is zero. The analogous short expression is convex when its book-value coefficient is positive; otherwise loss increases throughout. A positive margin buffer per unit cannot recover after falling through zero under these same fixed assumptions. Thus, after the protocol minimum, passing sizes form a prefix. Adding nonlinear fees, changing funding with size, portfolio offsets or a different model requires re-evaluating this property before reusing the search.

No cross-token conversion, wallet spending limit, live order, future funding path or liquidation execution model is added.

## Export and verification

`budget-sizing-review-v1` contains the source comparison, normalized budgets/search settings, endpoint results and hashes. Replay checks the whole original comparison and recalculates the search:

```sh
node scripts/replay.mjs /absolute/path/budget-comparison_ID.json
```

Hash/replay proves internal consistency only. Tests cover independent flat-book arithmetic, exhaustive cent-grid comparisons across long/short and signed funding, minimum quantity/settlement, zero budgets, incomplete depth, missing inputs, stale/paused markets, invalid leverage, cap rounding, bounded search and rehashed tampering.

Offline DOM tests exercise budget editing, result invalidation, one-time evidence fetch, export replay and parameter transfer. They also verify full account-page clear, disabled polling and late-response rejection. They are not fresh browser, visual, accessibility or live-chain acceptance.

## Release acceptance — 2026-10-11

120 tests and production build passed. HTTPS assets match the deployed source; a newly saved public-market comparison produced a bounded interval and exported search replayed successfully. Both transaction modes remain disabled and private endpoints unavailable. See PUBLIC_LAUNCH.md for the runtime identity and browser-verification limit.
