# Pre-trade comparison and decision evidence

## Workflow

Open Workbench → 方案对比. Plan A uses the current scenario. Plan B can change notional size, leverage and holding time; direction, price shock and slippage limit remain shared. The existing `/api/compare` call reads one public context/book snapshot and evaluates both plans at one timestamp.

Shortcuts deliberately isolate changes:

- Half size: half A's notional, with a minimum of 1; unchanged leverage and holding time. Exact lot rounding can prevent proportional results.
- Lower leverage: half A's leverage, with a minimum of 1x; unchanged notional and holding time. This increases required margin without reducing same-size trading fees or price PnL.
- Reset: all three fields match A.

Optional margin and scenario-loss limits are evaluated locally. Empty means unspecified; zero is an explicit zero limit. The margin cap applies to model margin only, excluding fees and Gas. Scenario loss is max(0, negative scenario net PnL), including modeled entry/exit fees and signed funding. It is neither a stop order nor maximum possible loss.

Incomplete depth or missing net-PnL/margin inputs yields unknown; a model blocker cannot turn into a passing decision because budgets are loose. Incomplete-depth numbers shown in the detailed table apply only to book-covered quantity. No cross-plan portfolio or automatic recommendation is created.

Selecting either plan only copies its normalized scenario parameters into the preview and clears the old result. A new risk calculation is required before saving a new baseline. Changing parameters invalidates the displayed comparison; changing budgets re-evaluates the same saved comparison without requesting market data. A displayed saved comparison does not update when live quotes refresh.

The budget search panel now finds a bounded target-size interval using either plan's fixed assumptions and the same saved evidence. See [BUDGET_SIZING.md](BUDGET_SIZING.md) for grid precision, constraints, local computation and replay. It does not select leverage or automatically recommend an endpoint.

## Reproducibility

`导出方案与预算证据` downloads `plan-decision-review-v1`, containing the original comparison context/book, original inputs/results, normalized user limits, decision report and integrity hashes. Budgets are not sent to the service. The original comparison-only export remains available.

```sh
node scripts/replay.mjs /absolute/path/to/decision-comparison_ID.json
```

Replay reproduces the entire original comparison, then recomputes budget checks and derived costs. Altered model results, limits without corresponding results, or forged decision outcomes fail even if their outer hashes are updated. Integrity hashes do not independently certify upstream data or the time it was saved.

## Acceptance

- 87 automated tests passed, including independently expected fees/loss/margin arithmetic, signed funding income, explicit zero budgets, missing data, insufficient depth, protocol/model blockers and modified evidence.
- Local browser: same-notional 3x vs 1.5x comparison; model fees and scenario loss equal while margin doubles. A margin limit of 40 classified A within and B over; editing only the loss limit to 5 made both exceed without changing the comparison record.
- Browser export independently reproduced through the CLI. The B selection restored 1.5x and cleared the previous preview; fresh calculation remains required for a new baseline.
- Public acceptance: HTTPS assets match the build; same-snapshot API comparison and full decision replay passed. Native Chrome half-size shortcut → compare → transfer B → fresh preview succeeded, with notional 50 and a new baseline save action.
- Mainnet funds and public order submission remain disabled. This feature does not use account credentials or add market polling.
