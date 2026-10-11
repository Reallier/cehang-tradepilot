# Feed quality and research continuity

## Public market reads

The public server uses one shared `PublicBookFeed` for market display, preview and comparison. Mainnet retains REST book reads; testnet explicitly uses the bounded public WebSocket snapshot adapter. The response provenance identifies the transport. There is no automatic transport fallback.

Testnet requests for the same market coalesce, successful snapshots are cached for 15 seconds, and at most two socket acquisitions run concurrently. Failures are retained for 60 seconds to avoid repeated visitors creating reconnect storms. The cache holds at most 64 entries. Each acquisition retains the existing 12-second, 8-frame, 4-MiB and single-subscription limits; it closes after a confirmed complete snapshot and does not apply deltas. Protocol restriction/cooldown gates are checked even before serving a cached book; the shared protocol request budget remains in force. Freshness is always re-evaluated at display/calculation time, so a cached value can expire rather than being re-labelled current.

The deployment template excludes only `testnet.perpl.xyz` from proxy routing in both `NO_PROXY` and `no_proxy`. Use an allowed operating environment; routing configuration is not evidence that an account or jurisdiction is eligible. Mainnet routing is unchanged. No key, wallet connection or order-submission endpoint is enabled.

The UI reports price and book freshness separately. Both must be valid for the overall green status; a failed refresh keeps prior data visible but marks it unusable. Source labels distinguish REST and WebSocket snapshots, and the source drawer links the latter to its protocol documentation. The chart remains historical completed-hour bars, not a tick feed.

## Session and draft continuity

The anonymous server session still has an absolute 30-minute lifetime. The UI warns during the final two minutes and offers in-place recovery after expiry or a 401. Recovery makes one session request, never automatically repeats a failed POST, and rejects completions from the previous session generation. Old server record lists/results are cleared when the token changes; they are not claimed to be restored. The research workspace, imported account evidence, scenario inputs and saved baseline remain in page memory. Baseline expiry is not extended.

Research metadata drafts are kept separately per experiment while switching. Workspace export includes these drafts and remains independently replayable. Unexported research changes install a browser `beforeunload` warning; whether the browser presents a dialog depends on browser policy/user interaction. Explicit clearing or full-workspace replacement keeps its existing meaning. No localStorage, durable private-data storage, account upload or background collection is introduced. Closing/reloading the page still requires prior export to preserve data.

## Validation

145 regression tests pass, including offline DOM coverage of experiment switching/export, leaving-page warnings and session recovery without losing research drafts. A public HTTP integration fixture verifies that live display, preview and comparison share one snapshot and that trading routes stay forbidden. Transport tests cover stale/future books, wrong subscription identity, deltas, disconnects, timeout, limits and cooldown/restriction gates. A bounded direct read in the deployment container returned chain 10143 and an approximately 12-second-old public WebSocket snapshot before rollout. No testnet order was submitted by these checks.

These changes address the first three items in the product review. Cross-experiment analytics, broader chain lifecycle acceptance, long-running monitoring diagnostics and bundle/caching optimization remain separate work.
