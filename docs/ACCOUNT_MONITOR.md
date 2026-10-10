# Bounded read-only account updates

The account workspace includes observation-to-observation risk changes. Public visitors can load an explicitly synthetic sequence; actual private updates are available only through a loopback deployment. Public servers never receive account credentials or monitor files.

## Local collector

Use the existing independently enrolled testnet read-only credentials and eligibility configuration:

```sh
NO_PROXY=testnet.perpl.xyz,perpl.xyz,.perpl.xyz no_proxy=testnet.perpl.xyz,perpl.xyz,.perpl.xyz \
  node --use-env-proxy --env-file=data/account-readonly/credentials.env scripts/watch-account.mjs --config data/account-readonly/config.json --cycles 15
```

Both bypass variables are intentional for the previously verified local route: Node’s environment proxy agent gives `no_proxy` precedence over `NO_PROXY`. An inherited lowercase value can silently override an uppercase-only setting. Merge other required bypass entries for your environment; this is not an instruction to override protocol eligibility or a persistent restriction.

This is an explicitly started, bounded process, not a permanently scheduled account monitor. It permits 1–30 rounds, defaults to 15, and stops after at most 30 minutes plus any in-flight bounded request. Each round reads chain ID, wallet, positions, context and chain head sequentially. At least 60 seconds elapse after a successful round before another starts. Existing protocol restriction state and eligibility gates are preserved.

429 respects the longer of Retry-After and exponential backoff (60/120/240 seconds). Three consecutive failed rounds stop automatic collection, but the third failure still persists the later server/local deadline for a future manual restart. Authentication, restriction, identity and validation failures stop immediately. Next-attempt times are persisted even after stopping, so restarting does not erase a cooldown. A single-writer lock prevents two monitor processes using the same output directory. Other existing CLI readers are separate processes; their request budgets are not claimed to be globally coordinated.

Output: `<configured outputDir>/monitor/latest.json`, 0600, in a 0700 directory, atomic replacement with fsync. Contains at most two observations, safe status codes and timestamps. No raw error bodies or credential values are logged. Failed rounds preserve the last valid observation.

## Local frontend

Start a separate credential-free frontend process, with the monitor file's absolute path:

```sh
TP_PORT=8780 TP_LOCAL_MONITOR_FILE=/absolute/private/reports/monitor/latest.json node scripts/start-demo.mjs
```

Open `http://127.0.0.1:8780/?tab=account`. Choose **读取最新观察** or **自动读取**. Automatic reading checks the local file every 15 seconds while the account page is visible; it does not initiate upstream collection. Pausing the page does not stop the independent collector. The collector's bounded lifetime is shown separately from observation freshness.

`/api/local-monitor` enforces loopback listener, loopback origins, no public HTTPS configuration and no deployment subpath. It replays both saved observations. Public variants return only `available: false`, even when an inherited monitor filename is supplied. Existing session/origin checks still apply. `/api/local-observation` can read the monitor's latest validated packet for the ordinary account analysis view.

## Interpretation

- Both local collection time and protocol snapshot timestamps are checked. Data older than 45 seconds, future timestamps and incomplete observations are marked stale; a 60-second sampling interval intentionally includes periods outside that validity window.
- Compare only identical wallet/classification/chain and increasing observation time. Position joins require account, market and position identity; collateral identity changes or missing/invalid IDs, addresses or decimals disable numeric comparison. Addresses are compared case-insensitively; precision must match.
- Show mark-price, unrealized-PnL and margin-buffer deltas in their own collateral unit. Changed price, quantity, collateral, funding and maintenance inputs are listed as observed changes, not causal attribution.
- Newly observed or disappearing positions do not prove opening, closing, settlement or realized profit. Missing inputs do not become zero. No cross-token PnL total is created.
- Applying an observation to the workbench is an explicit action. Background file refresh does not replace an imported trade review or its baseline.

## Acceptance — 2026-10-10

110 automated tests pass, including concurrency/cooldown persistence, rate-limit backoff, auth/validation stop, missing/stale inputs, wallet mismatch, signed position changes, and public-route denial. Production build passes. Private live collection encountered HTTP 451 and stopped before a usable observation was collected; readiness configuration was present and no existing persistent restriction flag was cleared. A single bounded diagnostic identified the HTTP status. At that release check no further collection or proxy change was attempted; the later diagnostic below supersedes the access-failure status.

At that point, sustained continuous account updates remained **unaccepted**; the later single-cycle diagnostic established only bounded read access. The UI and synthetic risk-change example are not evidence of continuous refresh. A later public-demo walkthrough exercised the judge path; it did not open the local monitor file. The three-cycle run below is the current live-monitor evidence.

## Publication review fixes — 2026-10-10

Three new regression tests cover the third-429 stop/serialization/manual-restart path, missing or invalid asset identity on either side, and address case normalization versus changed token precision or address. These fixes were published and deployed in release `ddc14b8369fb`; see `PUBLIC_LAUNCH.md` for runtime and public HTTP evidence. No real account refresh was retried.


## Proxy-routing correction — 2026-10-10 19:44 Asia/Shanghai

The earlier monitor invocation set only uppercase `NO_PROXY`, while inherited lowercase `no_proxy` remained present. The installed Node environment proxy agent selects `process.env.no_proxy ?? process.env.NO_PROXY`; the uppercase override therefore did not establish the intended Perpl direct route. The previously successful account/history commands set both variables.

Restoring both variables to the previously verified Perpl bypass and running `--cycles 1` succeeded: testnet chain 10143, account report `empty_positions`, zero validation issues. The last success was `2026-10-10T11:44:03.338Z`; the collector then stopped normally with no failure code. No persistent restriction or eligibility state was cleared or rewritten, no order was submitted, and no ongoing polling was enabled. The private packet remains local and excluded from GitHub and public hosting.

## Three-cycle read — 2026-10-10 23:43 Asia/Shanghai

The same proxy bypass and `--cycles 3` then completed three rounds, each logged as `observing` with no failure code. The retained pair is testnet chain 10143, report `empty_positions`, zero validation issues, the same wallet, and an increasing snapshot time. Evaluation times were `2026-10-10T15:42:24.757Z` and `2026-10-10T15:43:27.779Z`, 63 seconds apart. Each position-block time was within a few seconds of its local observation. The collector stopped at the requested limit, with `nextAttemptAt` left at `2026-10-10T15:44:27.779Z` and `failures` at 0. The file keeps at most two observations, so the first round is in the process log rather than `latest.json`. No order was submitted, and eligibility state was not rewritten.

This accepts three consecutive bounded reads. It does not accept the default 15-round run, unattended scheduling, or a live recovery from HTTP 429 or 451. Those failure paths remain covered by automated tests only.
