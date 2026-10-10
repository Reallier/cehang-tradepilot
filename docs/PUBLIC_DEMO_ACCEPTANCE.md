# Public demo adaptation acceptance

Date: 2026-10-10. This records local development acceptance, not an internet deployment.

## Implemented

- Independent React shell, navigation, tables, SVG line/bar charts, source-row inspection and CSS; no Data plugin build/runtime inputs.
- Explicit HTTPS origin configuration with exact Host/Origin validation. Reverse-proxy templates preserve those checks.
- Anonymous visitor sessions with isolated in-memory records, a 30-minute lifetime, capacity/storage/request/concurrency limits and credential-free operation.
- All HTTP testnet transaction operations rejected. API credential lookup is disabled even when the server is started directly with inherited credentials.
- CSP, frame denial, MIME enforcement, same-site cookies and per-session CSRF checks. Known browser assets only; source/build metadata are not served.
- Public source lockfile includes React 19.3.0, React DOM 19.3.0 and esbuild 0.28.2. Full React-family license notices are included in generated assets.

## Verified

- Final full test run passed all 51 tests (47 original, three isolation/limit and one HTTP integration). The initial sandbox attempt could not bind a local port; the authorized full rerun passed without failures.
- HTTP integration: A/B visitor separation, cross-session token rejection, foreign Host/Origin rejection, ignored forged forwarded headers, absent sessions, oversized bodies, unavailable source files, disabled inherited credentials and rejected transaction routes.
- Independent frontend build completed; build metadata contained 20 inputs and no Data/Codex/plugin inputs.
- A fresh export of the staged files completed `npm ci` using the local package cache and `npm run build`; the main JavaScript asset was 324,430 bytes and full license notices were included.
- Gitleaks and the repository public-file scan found no secrets or privacy findings in the reviewed files (61 staged files). The staged whitespace check passed.
- Browser: actual public Perpl market/book/candles loaded; a risk preview and same-snapshot A/B comparison completed; the comparison opened its saved evidence record.
- Browser: synthetic full-fill audit, partial position exit and healthy-to-unknown risk observation completed. Missing equity/ratio remained unknown; unknown chart samples were absent rather than zero.
- The audit was downloaded through the browser and replayed with the repository script: reproduced, synthetic_execution_audit, receiptConsistent=true.
- At 390px viewport width the evidence page had 390px document width, without page-level horizontal overflow. Desktop and mobile screenshots are retained locally under ignored `data/evidence/`.

## Remaining

This local acceptance record preceded the public launch. See PUBLIC_LAUNCH.md for the subsequent deployment, HTTPS/API verification and remaining public-browser limitation. Actual Monad account/settlement evidence and video production remain separate work.

The demo deliberately uses temporary anonymous sessions rather than durable user accounts. Data is shared between tabs in one browser session, expires after 30 minutes and is cleared by restarts. This tradeoff is disclosed in the UI and deployment guide.
