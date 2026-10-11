## Cross-experiment comparison — 2026-10-11

The research workspace now groups reconciled lifecycles and compares execution deviation, fees, funding, realized net PnL and saved stress buffers. Duplicate/conflicting evidence and incomplete experiments are explicit. Export is independently replayable; see [RESEARCH_COMPARISON.md](RESEARCH_COMPARISON.md). This is descriptive analysis, not strategy performance or causal attribution.

# Product iteration — 2026-10-10

## 2026-10-11 — feed and research continuity

Market and order-book freshness now jointly determine the public UI status. The testnet website shares bounded WebSocket snapshots across market display, preview and comparison, with explicit provenance, connection limits and failure backoff. Research text drafts survive experiment switching and are included in exports; expired demo sessions can be recovered without refreshing away browser-local evidence. See FEED_CONTINUITY.md for limits and validation. Broader experiment analytics and runtime diagnostics remain pending.

## 2026-10-11 — page clear and budget-driven size analysis

The account page's clear action now also resets the independent observation module and its polling state. Pending import/read completions cannot restore cleared page data. This does not delete exported files or stop the separately launched collector. Monitor copy now states five reads normally, at most six with bounded context catch-up.

Plan comparison now offers bounded, snapshot-local size analysis under the user's margin/scenario-loss budgets, with endpoint transfer and independently replayable evidence. See BUDGET_SIZING.md. The testnet research workspace is now implemented (see TESTNET_EXPERIMENTS.md). A data-quality timeline and broader portfolio/lifecycle support remain pending.

## 2026-10-11 — testnet research workspace

Added a local multi-experiment workspace, independently replayable archive, per-experiment baseline/trade association, deduplicated coverage and explicit unsupported lifecycle states. The next actual test is a user-operated short opening/full exit with a fresh baseline. This change itself performs no chain transactions.

## Shipped scope: trade-level review

The account workspace previously listed all opening orders, then all exits, then an unlabeled set of baseline comparisons. With multiple trades, a failed comparison could look like a failure of the whole imported history. Small fee differences could round to zero.

The new view provides:

- A compact trade table with one selectable lifecycle per opening. Display joins require account, market and position identity, plus a unique opening.
- The selected opening's baseline, exit, timestamps, verified status and PnL components together. No cross-token aggregate return is calculated.
- Price PnL, signed funding, allocated opening fee, exit fee and settlement net shown separately. Adverse entry price cost is explanatory and is not deducted a second time.
- Missing/failed/ambiguous settlements remain unknown. A zero-position snapshot never implies a reconciled close. Partial exits are explicitly scoped to the exited quantity.
- Small nonzero values remain visible. Unknown values are distinct from zero.
- Order-level checks remain expandable; exported workspace schema and independent replay are unchanged.
- Explicitly absent baselines in an imported workspace clear the previous workspace's baseline. Empty position selectors are omitted from the closed-trade review.

Verification: 82 automated tests pass. Local browser accepted the synthetic case and an existing private two-trade testnet packet. Switching trades changed the matching baseline, exit and net values. Private packets are processed in local page memory and are not included in the runtime package. No new protocol/account request or trading permission is introduced by this view.

## Next product priorities

1. **Pre-trade decision support — implemented:** same-snapshot size/leverage comparison, local margin/loss budgets, depth constraints, cost/stress breakdown and parameter transfer to a fresh preview. See PLAN_DECISION.md for scope and acceptance. No implied recommendation or profit probability.
2. **Account risk overview — implemented:** identify the largest contributors to a specified adverse scenario across supported positions, with token-aware aggregation and explicit unavailable inputs. Do not aggregate different collateral assets without a documented valuation source.
3. **Evidence import usability — implemented:** explain unsupported lifecycle types and missing receipt/history coverage with corrective steps instead of raw check codes alone.
4. **Broader validation:** supported short and partial-exit paths have synthetic regression coverage; additional real testnet samples require separate user-operated transactions. They are not prerequisites to reading existing evidence.

Account overview implementation and boundaries are documented in PORTFOLIO_RISK.md. Evidence import guidance and acceptance are documented in EVIDENCE_IMPORT.md. Item 4 remains a planned priority. Mainnet funds and public order submission remain disabled. Source publication and competition videos are separate release tasks.

## Competition path and status alignment

Implemented compact preview-to-review navigation and direct in-memory baseline transfer. Synthetic examples remain distinct from public-market previews and private saved testnet evidence. Product and privacy copy now reflect the completed limited testnet acceptance. See REVIEW_PATH.md for workflow, regression evidence and browser-validation limits.

## Bounded account refresh and risk changes

Implemented independent local read-only sampling, persisted cooldown/stop status and observation differences. Public users receive a labeled synthetic change example; no owner account is exposed. An earlier collection returned HTTP 451 and stopped. A later single cycle succeeded on 2026-10-10 at 19:44 Asia/Shanghai after both proxy-bypass variables were set. Three consecutive cycles then succeeded at 23:43 Asia/Shanghai. The default 15-cycle local testnet read-only run completed on 2026-10-11 (chain 10143, zero positions): 13 complete snapshots and 2 incomplete snapshots. Incomplete rounds were marked stale because the context head lagged behind the account snapshots; subsequent scheduled rounds recovered without extra retry. The collector stopped normally and released its writer lock. Unattended scheduling and live 429/451 recovery remain unaccepted. See ACCOUNT_MONITOR.md.
