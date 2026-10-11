# Independent test account: read-only acceptance

Status (2026-10-10): one local observation of an independent Perpl test account has passed. The owner authorized a seven-day read-only key through the official testnet UI. The reader returned one account, 100 test AUSD (100000000 raw units, collateral token decimals 6), zero locked balance and zero positions, matching the official UI. Chain ID was 10143, validation issues were empty, and private packet replay returned `reproduced`.

The preceding 100 test AUSD deposit was separately observed as successful in the official account history and Monad testnet explorer. It is deposit evidence, not an executed trade. No trading key was created and no mainnet funds were used. No private snapshot or credentials were published or deployed.

Later on 2026-10-10 the owner manually submitted a small test order through the official UI. A subsequent local collection returned one long BTC position of 0.0001 BTC with entry price 82482.5, matching the UI; private replay passed. The model calculated collateral 4.128605 test AUSD and estimated liquidation price 44495.75. Those risk values are model outputs: the liquidation price has not yet been independently matched against the protocol's position detail or settlement. This is not full trade/receipt or close acceptance.

That real response exposed a compatibility defect: `Position.at` was `{}`, which the documented optional `BlockTxLogTimestamp` fields permit. Account, watch and exit validation now accept omitted per-position update fields while still requiring and checking the enclosing snapshot time/block. Present malformed or future fields remain rejected; missing update time stays `sourceTime: null`. Regression coverage includes envelope staleness and field-shape failures. The local 61-test suite passed (two loopback HTTP tests required execution outside the filesystem/network sandbox).

## Boundary

`scripts/read-account.mjs` runs locally without an HTTP listener. The public demo still returns an unconfigured account and rejects wallet/transaction operations. No private account report or key is copied into the public demo, container or GitHub.

The dedicated reader allows only testnet wallet, positions, context, RPC chain ID and head reads. Even an accidentally supplied trade-capable key cannot cause this tool to place orders. Nevertheless use a separate **read-scope** key: successful reads cannot prove a key lacks trade permission. No permission probe sends an order.

Official references checked on 2026-10-10:

- [Perpl REST: live account state and read-scope support](https://github.com/PerplFoundation/api-docs/blob/main/rest-endpoints.md)
- [Perpl wallet and account fields](https://github.com/PerplFoundation/api-docs/blob/main/types.md)
- [API authentication](https://github.com/PerplFoundation/api-docs/blob/main/authentication.md)

## Local configuration

Create a private `data/account-readonly/config.json` (0600), for example:

```json
{
  "stateDir": "../protocol-state",
  "outputDir": "./reports",
  "expectedWallet": ""
}
```

Paths resolve relative to the configuration file. **Point stateDir at the existing private protocol state directory**, including any existing `eligibility_testnet.json` or `restriction_testnet.json`; do not use a new empty directory to evade an existing restriction. `expectedWallet` must be the independently checked address of the dedicated test wallet.

In `data/account-readonly/credentials.env` (0600), configure only:

```dotenv
PERPL_TESTNET_API_KEY=
PERPL_TESTNET_API_KEY_SECRET=
```

The secret is the enrolled Ed25519 API signing seed (32 bytes hex), not an Ethereum wallet private key or recovery phrase. Do not post it into chat or the public website. Existing Binance credentials are unrelated.

The state directory's eligibility record must be reviewed before collection: `blocked: true` always blocks. An allowed record needs `approved: true`, `blocked: false`, a nonempty `reference` to actual eligibility confirmation and a valid `checkedAt` ISO date. A missing/unconfirmed record blocks. This is an operator record, not independent verification of eligibility. This tool never clears or rewrites it. A protocol restriction also blocks reads.

Check readiness offline (does not contact Perpl):

```sh
node --env-file=data/account-readonly/credentials.env scripts/read-account.mjs --config data/account-readonly/config.json
```

Once credentials, independently checked identity and eligibility are available, collect one private observation:

```sh
NO_PROXY=testnet.perpl.xyz,perpl.xyz,.perpl.xyz no_proxy=testnet.perpl.xyz,perpl.xyz,.perpl.xyz \
  node --use-env-proxy --env-file=data/account-readonly/credentials.env scripts/read-account.mjs --config data/account-readonly/config.json --collect
```

This invocation reflects the verified local routing: Perpl uses the direct connection, while other hosts retain the existing proxy configuration. Shell clients do not inherit macOS proxy bypass settings. Merge any additional required bypass entries for your environment. On 2026-10-10 the direct official context returned HTTP 200, country CN, outside its current `geo_block` list; official login, deposit and read-key enrollment also succeeded. The old US-proxy frontend block record was preserved and superseded by a scoped operator review. This is observed access availability, not a provider-issued legal eligibility certification or permission for other hosts/networks.

Exit code 0: ready / observation saved; 2: not ready, no collection; 1: configuration or read failure. There is no retry loop or polling. A fresh CLI invocation makes at most five sequential upstream reads. Do not schedule repeated invocations; 429 cooldown is process-local, while protocol restrictions are durable. TLS verification remains enabled.

## Results and meaning

- `no_exchange_account`: successful, valid response explicitly contains no accounts.
- `empty_positions`: valid account snapshot explicitly contains no open positions.
- `observed_positions`: structurally matched API snapshots with modeled position risks; this does not mean low risk or trade readiness.
- `incomplete`: stale/future data, insufficient head coverage, unknown market/funding/margin inputs. Unknown values remain null.
- `read_failed`: no report is written. An upstream 404/401/403 is not interpreted as an empty account.

The report binds the configured wallet address, account/market instance and position IDs, checks chain 10143, snapshot sequence/block/time, and retains actual fee tier and raw account balance units. It reuses the existing position-risk model, including unknown funding handling. It does not total different collateral units or claim atomic snapshots across sequential requests.

Each packet contains private account/context snapshots, observation time, source metadata, derived risks and integrity hashes. Output directory mode is 0700 and files are 0600. Console output contains status/counts/record ID only. Inspect reports locally; they contain financial/account information and are **not public submission artifacts**.

```sh
node scripts/replay.mjs data/account-readonly/reports/account_observation_ID.json
```

Replay checks complete internal reproducibility. It does not authenticate the provider. RPC chain/head checks do not prove account storage, inclusion, finality or a settled trade.

## Acceptance completed and remaining

Completed locally: official read-scope enrollment; independently matched wallet configuration; readiness check; one bounded collection; collateral-unit and zero-position comparison against the official UI; private packet replay. Credentials, configuration, download export and observation file are mode 0600 in Git-ignored directories.

Subsequent acceptance and remaining limits:

1. Two user-operated testnet long/full-close lifecycles passed opening and settlement reconciliation, including returned collateral, both fees and account credit. One matched a pre-trade baseline. A separate model/UI liquidation-price comparison also passed; see [HISTORY_ACCEPTANCE.md](HISTORY_ACCEPTANCE.md). These results come from separate history/receipt evidence, not from an empty-position snapshot.
2. The public account workspace can recompute imported evidence in browser memory and offers a labeled synthetic full-cycle example. Hosted private-account integration remains disabled; the public service has no owner credentials or account packets.
3. The read key expires seven days after enrollment (2026-10-17 Asia/Shanghai). Renewal is manual; expiration must not be interpreted as an empty account. See [ACCOUNT_MONITOR.md](ACCOUNT_MONITOR.md) for the separate bounded-monitor acceptance.

Current automated coverage: signed requests, target allowlist, no-network preflight, identity mismatch stop, missing/empty/stale/unknown states, cross-account/instance/duplicate rejection, 429/451 stop behavior, replay tampering and private file permissions. Fixtures are synthetic and never count as actual users, funds or transactions.
