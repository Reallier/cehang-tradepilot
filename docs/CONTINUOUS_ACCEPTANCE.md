# Continuous testnet acceptance

The research panel separates opening verification, exit settlement, baseline matching and comparison eligibility. A local countdown shows the original two-minute window. The timer performs no requests and stops when the research tab is inactive. It never changes a saved timestamp or invalidates a historical trade whose execution matched the baseline. An expired baseline with a verified opening explicitly directs the user to finish the original lifecycle instead of opening a replacement trade.

## One collection, one offline archive

Prepare the test parameters first. Save a fresh baseline only near the user-operated transaction. Final wallet actions remain user-operated. After a complete exit, collect one bounded history snapshot with `scripts/read-history.mjs --target` using the exact experiment receipt target. Existing account restrictions, request budgets and four-receipt ceiling apply. Stop on provider errors; do not introduce a rapid polling loop.

Then run the offline archive command (no keys or network needed):

```sh
node scripts/archive-experiment.mjs \
  --workspace /private/path/research.json \
  --history /private/path/trade_history.json \
  --experiment EXPERIMENT_UUID \
  --target /private/path/receipt-target.json \
  --output-dir /private/path/new-acceptance-directory
```

The destination parent must exist and the destination directory must be new. Output permissions are 0700/0600. An interrupted output without `COMPLETE` is not a finished archive. The command preserves input files, original baseline, other experiments and exact selected lifecycle; changing the selected target or existing wallet, older observations, altered evidence and synthetic history are rejected.

Outputs:

- `research.json`: updated, independently replayable workspace, importable by the frontend.
- `comparison.json`: recomputed grouped comparison, also importable by the frontend.
- `summary.json`: private stage status and next action, with settlement PnL if verified. This is a convenience summary, not independent evidence or current chain state.
- `COMPLETE`: created only after all three outputs have been written.

`status: archived` means files were saved; it does not mean the lifecycle passed. Check the reported opening, settlement and baseline fields. Expired/mismatched baseline evidence is retained with exclusion reasons. No new baseline is generated after a trade. Settlement may pass while comparative eligibility fails. No private archive belongs in the public repository or runtime image.

## Batch order

1. Finish and archive any existing test position before initiating another lifecycle.
2. Validate the full offline flow, expiry handling, deduplication and import/export with fixtures.
3. Prepare the next necessary test end-to-end before asking for the unavoidable wallet action.
4. Collect once after user confirmation, using the exact receipt target; do the replay, archiving and comparison together.
5. Keep unmatched or incomplete samples visible and outside statistics. Do not trade merely to raise a sample counter.
