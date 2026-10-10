# Independent frontend

The authored React pages now use `ui.jsx`, an independent navigation, evidence table and SVG chart implementation. It uses React and React DOM from npm; it has no import from or build dependency on the proprietary Data app runtime.

Run `npm ci --ignore-scripts`, then `npm run build` from the repository root. `dist/` contains the browser JavaScript/CSS, HTML and third-party license notices. The backend serves only the explicitly allowed browser assets; build metadata and source files are not served.

`dashboard/` preserves the existing business workflows and risk disclosures, adapted to the temporary public visitor-session model. Transaction controls are not offered. Private evidence files are parsed in browser memory without upload; actual account-monitor files are served only by an explicitly configured loopback deployment. Public account-update examples are synthetic. Source data can be inspected through expandable evidence panels; missing chart values remain gaps rather than zeros.
