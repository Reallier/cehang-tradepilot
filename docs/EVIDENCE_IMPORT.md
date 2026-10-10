# Evidence import guidance — 2026-10-10

## Scope

Account workspace now explains file selection, import failures, historical coverage gaps, unsupported order/lifecycle structures and baseline association failures. This is a presentation/import-flow enhancement: the underlying account, receipt, settlement and baseline validators are unchanged.

- File guide lists accepted schemas, source and purpose. It explicitly excludes credentials, wallet secrets and environment files; max file size is 4 MiB.
- The importer validates a complete candidate before applying any workspace state. Unsupported/invalid JSON, tampered results and incompatible structures leave existing evidence intact. Raw parser or runtime exception text is not echoed because it may contain file contents.
- Account workflow review exports now reopen, restoring selected position and shock; portfolio exports preserve their original shock. Trade workspace imports respect an explicit null baseline; raw trade/history imports retain the separately imported baseline.
- Import success means the material was read and reproduced, not that all orders passed. The coverage panel counts source orders, processed candidates and failures, distinguishing missing pages/receipts, unsupported types, nonterminal states and zero/missing fills.
- Failed order checks give a plain-language reason and corrective step. Technical identifiers remain available; successful checks use neutral labels, avoiding phrases such as “price mismatch” beside a success tick.
- Baseline mismatch distinguishes time window, parameters and unresolved opening association. No after-the-fact baseline fabrication is suggested. Missing exit evidence never prompts the user to trade merely to complete a demo.
- Complex lifecycle/fill/fee structures explicitly require model support. Instructions never suggest removing events, changing amounts, or editing hashes/completeness flags to pass.
- The application still evaluates saved evidence only. A complete page flag is not proof of all account history or current consensus finality. PnL stays unknown when required validation fails.

## Verification

98 tests passed. Six new tests cover export/reimport, baseline replacement semantics, rejection with sanitized messages, missing receipt diagnostics without upgraded settlement, pagination/unsupported-order distinctions and neutral check labels. The existing numerical and receipt suites remain unchanged and pass.

Native Chrome local acceptance: import a generated synthetic history with its exit receipt intentionally absent. It shows two processed orders, one not passed, missing receipt coverage, specific receipt remediation and unknown settlement. Import malformed synthetic JSON next: actionable JSON error appears and the original two-order review remains available. No private file or credential was used for this test.

No new API endpoint, polling, backend service, permission or trade is added. Files remain in browser memory; public bundle includes only reusable code and synthetic literals. Source publication is separate from runtime deployment.

Public HTTPS assets match the release build. Native Chrome public acceptance passed for file-guide expansion and full synthetic review (two processed orders, zero failures, matched baseline, opening 18/18 and exit 19/19). Both public trading flags remain false and private observation unavailable.
