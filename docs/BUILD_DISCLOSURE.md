# Existing foundation and competition work

This project has a pre-existing context: a separate Binance-oriented quantitative research project informed the risk-rehearsal workflow, cost awareness, simulation practice and operational safeguards. We do not claim that those ideas or all underlying experience originated during Metropolis.

TradePilot is the Monad / Perpl competition adaptation. The separate Binance deployment and its private data are not part of this submission. No exchange credentials, real account exports or proprietary application runtime are distributed here.

## Work represented by this submission

The project records document the following work in the current competition iteration (October 9–10, 2026):

- Perpl public market adapter, cost/depth/funding assumptions and saved simulation evidence.
- Independently buildable React trading/research terminal, without a proprietary application runtime.
- Credential-free public demo, bounded sessions, request budgets, isolated visitor records and disabled trading routes.
- Read-only testnet account and history collection, protocol-event decoding, opening/exit reconciliation and independent replay.
- Baseline saved before an opening, with constrained time/parameter association and quantity-normalized price/fee comparison.
- Same-snapshot plan comparison, local budgets, portfolio risk and collateral-aware aggregation.
- Browser-local evidence import, per-trade lifecycle review, missing-evidence guidance and direct baseline handoff.
- Bounded local account monitoring, freshness/backoff states and observation-to-observation risk changes. The default 15-cycle local testnet read-only run completed on 2026-10-11 (chain 10143, zero positions): 13 complete snapshots and 2 incomplete snapshots. Incomplete rounds were marked stale because the context head lagged behind the account snapshots; subsequent scheduled rounds recovered without extra retry. The collector stopped normally and released its writer lock. Unattended scheduling and live 429/451 recovery remain unaccepted. See ACCOUNT_MONITOR.md.
- Dedicated HTTPS deployment and private user-operated testnet acceptance of the limited long/full-close workflow. Public cases remain synthetic.

The initial public commit `c16f1785a93e98b7629df4235f0e22d5541d4c3f` is a publication baseline. **It is not a snapshot taken before the September 1 build window.** Comparing a later release to that commit shows later publication changes, not the complete set of work created during the competition. No commit dates or transaction timestamps have been backdated to suggest otherwise.

## Third-party components

React, React DOM, lucide-react, lightweight-charts, ethers and esbuild are third-party dependencies, not our inventions. The Perpl SDK-derived event ABI has its source provenance and MIT notice beside it in `server/vendor/`. Additional chart notices are in `docs/licenses/`; the build assembles runtime notices in `dist/licenses.txt`.

Project-authored code is publicly inspectable; no general open-source license has been granted. See LICENSE_STATUS.md. Competition eligibility and awards are determined by the organizer; this disclosure is not a claim of organizer approval.
