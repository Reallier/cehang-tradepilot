# Submission pack — CeHang TradePilot

Status: prepared text and links, **not submitted**. Videos remain deferred at the owner's request. Do not paste placeholder links into the submission form.

## Project name

CeHang TradePilot

## One-line description (under 200 characters)

A risk-rehearsal and execution-review workbench for Monad traders, connecting market snapshots, pre-trade baselines and saved Perpl receipts to explain trading costs and risk.

## Description

Trading interfaces make it easy to enter a position, but understanding its full cost and checking the result often requires collecting information from several places. Fees, order-book depth, funding and margin pressure can be overlooked. Without a saved pre-trade baseline, it is also difficult to distinguish the original decision from execution differences.

CeHang TradePilot brings that workflow into a research terminal for Monad and Perpl users. Traders can inspect public market snapshots, compare two plans against the same data, rehearse adverse price and funding scenarios, and preserve an unchanged pre-trade baseline. After a testnet trade, locally imported history and saved receipts can be checked against that baseline and against opening and settlement records.

The account workspace supports portfolio risk, per-market scenarios and lifecycle review. The research workspace organizes experiments, applies fixed-plan constraints, merges archives, deduplicates lifecycles and exports independently reproducible files. Unknown inputs, stale data, incomplete receipts and unmatched baselines remain visible. Results are risk estimates and evidence-consistency checks, not return predictions.

The public demo requires no wallet, API key or deposit. It offers clearly labeled synthetic cases; personal evidence is processed in the browser. Optional browser-local research recovery is off by default. Public order submission is disabled on both networks.

The selected private testnet archive has been replayed and summarized: two deduplicated completed long lifecycles, one with a matched earlier baseline. The public aggregate does not disclose account identifiers and is not independently verifiable chain proof. Actual short and staged-exit samples remain pending, while synthetic tests cover those implemented paths.

TradePilot is an off-chain analytics interface integrating the existing Perpl protocol on Monad, not a newly deployed trading contract. A separate Binance research project informed the original workflow; competition-specific work and third-party components are disclosed in the repository. The project does not claim users, TVL, revenue, partnerships or proven strategy profitability.

## Go-to-market and user acquisition

Our initial user hypothesis is individual Perpl traders managing a small number of perpetual positions, and developers running bounded testnet experiments who need understandable cost and execution reviews.

The initial release offers a no-wallet demo and a local evidence workflow. Our next validation target is five volunteer task sessions, recruited through permitted community participation and existing contacts. No outreach or completed user sessions are claimed here. Participants will try a cost comparison, identify missing/stale data and explain a baseline-versus-execution difference. With consent, we will record task completion, misunderstandings and optional measured time; aggregate results will guide the next iteration.

The intended distribution channels are public documentation, reproducible examples and feedback-driven improvements shared with relevant Monad/Perpl developer communities. Protocol partnerships are an aspiration, not an existing agreement. The immediate goal is repeat use of the review workflow, not an unvalidated TVL or trading-volume target.

## Form links

- GitHub: https://github.com/Reallier/cehang-tradepilot
- Live product: https://reallier.com/demos/tradepilot/?tab=competition
- Judge guide: https://github.com/Reallier/cehang-tradepilot/blob/main/docs/JUDGE_GUIDE.md
- Build disclosure: https://github.com/Reallier/cehang-tradepilot/blob/main/docs/BUILD_DISCLOSURE.md
- Technical video: **not recorded/uploaded; maximum 3 minutes**
- Team/motivation video: **not recorded/uploaded; maximum 2 minutes**

## Judge access text

Open the live product link in a current desktop browser with JavaScript. No account, wallet, API key or deposit is required. Start at the judge entry, choose the explicitly synthetic complete lifecycle, inspect baseline/execution/settlement differences and download a replayable file. The testnet archive summary describes separate real historical acceptance and its limitations. Public market data depends on upstream availability; failures are displayed and do not turn examples into live data. Private evidence imports stay local to the browser. Mainnet and testnet trading are disabled in the public demo.

## Logo / image

Vector source: `assets/brand/tradepilot-mark.svg`. Generate the submission PNG with Python and Pillow:

```sh
python scripts/export-logo.py /absolute/tradepilot-logo-1024.png
```

1024 × 1024, RGB PNG, below 2 MB: fits both the earlier upload form (2 MB, at least 500 px, at most 4 MP) and the provided delivery checklist (3 MB). The visual is a compass bearing plus verification path, not an investment-return chart. PNG is delivered separately and not exempted from the repository's binary privacy gate.

## Final gates

- [x] Public repository and deployed HTTPS product
- [x] Judge guide, build disclosure and anonymous acceptance summary
- [x] Submission description, acquisition plan and renderable logo
- [ ] Technical video uploaded and playable without login
- [ ] Confirmed real team introduction and motivation video uploaded
- [ ] Organizer acceptance of the analytics integration/deployment interpretation; do not infer eligibility from a running website
- [ ] Final form fields, image and links verified and submitted
- [ ] Optional: real short/staged-exit samples and external task feedback

The optional 30-second advertisement can be omitted. Never include API secrets, private account packets or fabricated user/transaction evidence in the form.
