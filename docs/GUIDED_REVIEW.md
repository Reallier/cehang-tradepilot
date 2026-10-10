# Guided review and pre-trade acceptance

## Judge path

Open the public demo → Account workspace → **体验完整案例**. No wallet, API key or file is required.

The example is **entirely synthetic**: fictional account, prices, transactions and receipt bytes. It is generated from literals in `server/guided-review.mjs`, never from a private report. The browser runs the same baseline/history/settlement verifier used for local real observations. The page and exported evidence retain synthetic classification. It is not evidence of onchain volume or profit.

Expected values: baseline entry 99.5; fill 100; quantity 1; adverse cost 0.5; price deviation about 50.2513 bps; fee difference 0.0005. Exit price 110; gross PnL 10; funding -0.01; entry/exit fees 0.1/0.11; trading net 9.78, excluding Gas/transfer costs. The final synthetic position list is empty. Export the review and replay with `node scripts/replay.mjs /absolute/file.json`.

## Real testnet baseline workflow

1. Market workspace: select **Monad Testnet · read-only**, choose market, direction, amount and leverage. Switching networks preserves scenario parameters; zero transaction permission never zeroes the simulation amount.
2. Run analysis and save a valid baseline within 45 seconds. The result displays the exact rounded quantity, network, leverage and two-minute association deadline. Saving does not trade.
3. The user manually operates the independent official testnet account with matching parameters before expiry. Refresh the preview and save a new baseline if the window expires; never edit saved timestamps to pass.
4. Collect read-only history with `scripts/read-history.mjs`, import its trade review and the earlier baseline in the account workspace. Closed-order history remains visible even when the current position list is empty.
5. Check estimated/observed prices, adverse price cost and fees for the same filled quantity. Incomplete history, wrong identity, stale/late baseline or mismatched size/leverage remain unavailable.

Local bounded preparation helper (long only, up to 25 test collateral notional and 5x; no order endpoint or private key used):

```sh
NO_PROXY=testnet.perpl.xyz,perpl.xyz,.perpl.xyz node --use-env-proxy scripts/read-baseline.mjs --config data/account-readonly/config.json --market 16 --raw-size 10 --leverage 2
```

The helper uses the existing eligibility/restriction state and only reads public context/book. It saves an exact baseline privately (0600). It does not enable any trading. Matching is user-associated and timestamps are locally recorded, not independently certified.

## Boundaries

Actual prior long/full-close settlement passed, but that historical trade had no prior baseline. A subsequent user-operated testnet lifecycle has passed the real baseline-to-fill comparison and full-close settlement checks, with zero positions in the final observation. The complete packet reproduces in the CLI and deployed browser frontend. Synthetic coverage does not satisfy that gate. Mainnet funds and public order endpoints stay disabled.
