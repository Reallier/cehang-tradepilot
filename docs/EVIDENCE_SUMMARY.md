# Anonymous testnet acceptance summary

Current machine-readable summary: [acceptance-summary.json](../frontend-source/content/acceptance-summary.json). Product entry: https://reallier.com/demos/tradepilot/?tab=competition . Reviewed on 2026-10-12.

## What was checked

The earlier selected research archive and the newly completed short/staged-exit batch were replayed under their recorded versions, then their trade/baseline evidence was replayed and projected into lifecycles. Opening identity, quantity/fees, exit collateral/funding/fees/settlement, and earlier baseline association were evaluated. Repeated lifecycles are deduplicated in memory by network, wallet, account, market and opening order/transaction identity.

The combined selected archives contain **2 completed long single-exit lifecycles**, **1 completed short single-exit lifecycle**, **1 completed long staged-exit lifecycle** and **1 matched earlier baseline** (4 distinct closed lifecycles). A missing/mismatched baseline does not invalidate independently reconciled settlement, but it does not pass pre-trade comparison. These counts are not total account activity, trade volume, users or profit, and are not an exhaustive account history. The new short and staged-exit lifecycles were performed by the owner on Monad Testnet during this acceptance run.

## Privacy and evidence boundary

Output is an explicit allowlist: schema, review date, chain, source category, aggregate counts, fixed check descriptions and limitation. No wallet addresses, transaction hashes, order IDs, amounts, balances, PnL, file paths or credentials are published. Original files remain private. The classifier and original documents are supplied by the publisher; replay cannot independently authenticate their source.

**The summary alone cannot independently prove a transaction on-chain.** It is a publisher-generated aggregate from locally replayed saved evidence, not a cryptographic inclusion/finality proof, live account observation or claim of strategy returns. The public interactive case remains explicitly synthetic. Any future public raw evidence or explorer-linked account identifiers require a separate deliberate disclosure review; do not scrub a real receipt and call the altered data original evidence.

## Regenerate with authorized local evidence

```sh
node scripts/acceptance-summary.mjs 2026-10-12 /private/output-summary.json /private/research.json
```

This command makes no network requests and places no orders. It rejects invalid archives and synthetic evidence, skips unfinished lifecycles, deduplicates repeated evidence and emits only aggregate fields. The output file is not automatically published. Review it before replacing the checked-in summary. Automated fixtures test the projection, not the authenticity of private inputs.

Real short/full-close and sequential partial-exit settlement samples now pass. Both new openings occurred after their saved two-minute baseline windows, so neither passes pre-trade comparison. No baseline was replaced retrospectively. Matched-baseline short and staged-exit examples remain missing; settlement coverage and baseline coverage are separate. Funding-cycle attribution is a separate future capability. Website hosting is off-chain; integration is with Perpl on Monad Testnet 10143. No new project-authored trading contract is claimed.
