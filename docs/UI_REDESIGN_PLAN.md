# TradePilot UI redesign plan

Status: implemented terminal revision, 2026-10-10. Public rollout verification is recorded separately in PUBLIC_LAUNCH.md.

## Evidence and scope

Initial planning inspected React and CSS while browser capture was unavailable. During implementation, native Chrome captured the old public white UI and the new terminal; public desktop calculation and local mobile rendering were subsequently verified. This document preserves the original plan below and records the implemented revision at the end; proposed acceptance targets are not all measured results.

Code-confirmed issues:

- Seven top-level navigation items give equal weight to trading analysis, privacy information and competition information.
- Header, navigation, session notice and a large introduction all precede the working area.
- Many data labels, tables and explanations use 10–12px text; the price headline is 35px. Numeric priority needs deliberate revision.
- The 300px ticket holds both inputs and a growing result list. Comparison and stress results are farther down the page.
- A static SVG chart lacks the inspection tools expected for price/risk exploration.
- Product explanations, model caveats, raw data, competition criteria and internal acceptance status are mixed into product navigation.
- Competition copy still says the HTTPS product address is unfinished after public deployment. Content must be audited against actual capability.

## Intended audience and outcome

Primary user: a trader rehearsing a small number of perpetual-position scenarios. Secondary user: a judge inspecting the product and its evidence in a short demo.

Primary journey: choose market → configure position assumptions → see cost and risk → compare an alternative → save/export evidence. Proposed usability target: a new visitor can explain the result and complete this journey within 90 seconds. This is a target, not measured evidence.

## Proposed direction

Professional, restrained trading-analysis workspace. Preferred first visual direction: charcoal surfaces, quiet separators, violet as the primary-action accent, restrained green/red for signed values, amber for warnings. Exact visual tokens should be chosen after reviewing a high-fidelity main-screen design. Dark mode alone is not the deliverable.

Use consistent numeric alignment, decimal precision and units. Primary body/control text should be approximately 14px, supporting metadata at least 12px; chart axes need separate legibility checks. Use real brand assets and a consistent icon library. Focus states, contrast and reduced-motion behaviour must be verified.

## Information architecture

1. Workbench: market, parameter ticket, risk result, scenario comparison.
2. Scenario records: saved inputs/results, original data time, compare/reopen/export actions.
3. Risk lab: labeled synthetic exit, risk-watch and execution-audit exercises under secondary tabs.

About, privacy, documentation, GitHub and competition material move to secondary access. The network/source mode and demo-only status stay visible and understandable. Clearly distinguish public live market data, model estimates and synthetic examples wherever decisions are made.

## Main workbench

Desktop working area:

- Compact top bar: brand, three primary destinations, source/network status, session time remaining.
- Left market list (about 190–210px): search, symbol, last price, change; one selected row.
- Central analysis area: compact market summary and dominant price chart, with order book/volume as secondary views.
- Right parameter panel (about 340–360px): direction, notional size, leverage and estimated margin together; holding period; optional assumptions disclosed progressively; one dominant Run rehearsal action.
- Results occupy the main analysis area rather than extending a narrow ticket indefinitely. Lead with margin requirement, total estimated cost, scenario PnL and margin buffer. Show reasons for blocked/incomplete results adjacent to the relevant metric.
- Compare A/B using aligned units, shared-snapshot timestamp and explicit metric differences. Do not imply that one plan is recommended or profitable.
- Sources, model assumptions and raw evidence open in a detail drawer. Export stays available from the result.

At a 1440×900 viewport, the initial ticket action should be visible without scrolling. After computation, the result summary should be visible without searching below unrelated sections. At narrower widths the market list collapses and the layout reflows rather than squeezing all three columns.

## Charts and feedback

Price chart: crosshair, values on hover/focus, volume alignment and usable zoom/range selection where the data supports it. Do not offer unsupported candle intervals. Order book: aligned bid/ask quantities with proportional depth visualisation and clear units.

Risk chart: annotate the selected shock scenario and modeled threshold only when available. Unknown values remain gaps. Net PnL remains a scenario calculation, not a forecast.

Forms and results: preserve inputs on errors; explain invalid values beside the control; use stable loading placeholders and a last-updated timestamp. Invalidate an old result when its parameters no longer match. Never silently present cached or synthetic values as fresh live observations.

Session expiry: show remaining time unobtrusively, provide an export reminder shortly before expiry, and explain how to start a new session. Do not discard visible inputs without explanation or pretend expired server records can be recovered.

## Implementation sequence

### 1. Capture and define the main screen

Capture the live page in a working browser, including a computed result. Produce a high-fidelity main-screen direction with the same representative content. Resolve information density, typography, chart/result relationship and contrast before redesigning every page.

Deliverable: main workbench design and component/token specifications.

### 2. Build the primary journey

Refactor the shell and split the large dashboard component into market, ticket, result and source-detail components. Implement real interactions against existing APIs. Keep parameter semantics, rounding, evidence hashes and model limitations unchanged.

Deliverable: working market → rehearsal → comparison → export flow with loading/error/unknown/expired states.

### 3. Extend the design system

Apply the approved components to records and the risk lab. Replace outdated competition copy and relocate internal acceptance notes. Implement a mobile task flow using Market / Parameters / Result views, not a scaled-down desktop grid.

Deliverable: coherent desktop and mobile product with every current capability reachable.

### 4. Verify and release

Verify keyboard navigation, labels, visible focus, contrast, numeric alignment, empty/error states and responsive layout at 1440, 1280, 768 and 390px. Recheck model/output equivalence, session isolation, transaction denial, subpath loading, exports and replay. Capture public-page screenshots and perform a timed demo rehearsal before marking the UI release complete.

## Efficiency and boundaries

The backend APIs and models are reused; redesigning their math would add risk and is not part of this UI work. Add a chart dependency only if the existing renderer cannot meet the required interactions; assess its bundle cost and license first. Do not add decorative animation or continuous polling that increases compute/upstream use without helping the task. Agree the main-screen visual target before rolling the new system across all pages to limit rework.

All trading remains disabled. No fabricated user counts, returns, successful chain settlement, balances or protocol support claims. Chain E2E evidence remains a separate competition acceptance task.


## Approved terminal revision

The user rejected the prior presentation as toy-like and explicitly selected a professional trading/research terminal. The implementation uses fixed data zones, aligned numeric columns, compact controls and simultaneous market/depth/parameter/risk views. Decorative copy and large promotional headings were removed from the primary workflow.

- Desktop: market table, market context, interactive hourly candles and volume, five-level depth, parameter ticket, risk analysis and comparison.
- Mobile: market, parameters and results are separate task steps.
- Native Chrome inspection covered real public data, scenario calculation, source dialog, comparison, record restoration and 390px layout. No new Chrome instance was launched.
- Public data, saved-snapshot estimates and synthetic lab examples remain explicitly distinguished.
- Existing model/server behavior is retained; public order routes remain disabled.
