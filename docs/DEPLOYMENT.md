# Public demo deployment

This checkout now builds a complete independent frontend. It does not use the Data plugin or distribute its runtime, compiler, starter shell or assets. React/React DOM and a small authored SVG renderer provide the UI; risk calculations remain in the existing backend.

## Local reproduction

Node >=24.5; Node 26 was used for verification:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
npm start
```

Open `http://127.0.0.1:8780/`. A different local port may be selected with `TP_PORT=18781 npm start`.

## HTTPS host configuration

Set `TP_PUBLIC_ORIGIN=https://YOUR-DOMAIN` before starting the service. It must be a single HTTPS origin with no path, credentials or query. Incoming Host and browser Origin must match exactly. The service binds to loopback by default; terminate TLS in the reverse proxy. Containers can explicitly set `TP_LISTEN_HOST=0.0.0.0` behind a ClusterIP service and ingress policy. For a subpath, set `TP_BASE_PATH=/demos/tradepilot`; the gateway must preserve that prefix. Cookie scope and relative frontend URLs follow this path. Do not rewrite a foreign Host/Origin to trusted values to bypass the check.

`deploy/nginx.conf.example` is a template for TLS, body limits, per-peer limits and forwarded-header handling. `deploy/tradepilot-demo.service` uses a dedicated unprivileged account, Node installation and state directory. Replace the example domain in both files and supply actual certificates. These templates have not yet been installed or verified on a deployment host. Do not enable them on a shared host without checking existing ports and gateway configuration.

Runtime state contains only protocol cooldown/restriction flags; use a new dedicated directory. Do not reuse a private trading service's state or credentials. Preserve restriction flags across restarts and do not switch egress to bypass upstream access restrictions.

## Visitor isolation and resource limits

- 256-bit random, host-only HttpOnly session cookie; SameSite=Strict, Secure in HTTPS mode. No URL token or localStorage credential.
- Per-session CSRF token required for JSON mutations; both cookie and permitted Origin must match. Forwarded headers do not grant access.
- Each visitor has separate in-memory records. Record identifiers alone cannot access another visitor's data. A browser profile shares its session between tabs; this is an anonymous demonstration, not user-account authentication.
- Absolute 30-minute session lifetime; expiry makes records inaccessible immediately, periodic cleanup runs at most one minute later. All visitor records disappear on process restart. Export needed evidence before expiry. No durable feedback collection is promised.
- Default maximum 64 sessions, configurable with `TP_MAX_SESSIONS` from 1 to 256. Each session has at most 120 records and 2 MiB serialized records. JavaScript heap overhead is additional; the example service caps total process memory at 512 MiB.
- API limits: 240 requests/minute globally, 60 per session, 20 new sessions/minute; at most 16 in-flight API requests globally and 4 per session. API limit responses include Retry-After. The public health check is stateless.
- Reverse-proxy per-peer limits supplement the application limits. Application limits are not DDoS protection; review the real proxy topology before enabling real-IP processing.
- One Node process per instance; visitor state is not shared across replicas. Additional replicas need sticky routing or a redesigned shared session store. The existing protocol limiter is shared across visitors within the process; multiple instances sharing an egress would need coordinated upstream budgets.
- UI market reads refresh every 15 seconds only while visible; errors back off for at least 60 seconds and honor longer Retry-After. Upstream reads share cache/in-flight requests and retain the existing 40/minute process budget and persistent restriction flags.

## No trading or private account access

The server entry point removes inherited Perpl API keys, forces test orders off, disables account credential lookup, and rejects every `/api/testnet/` operation. This also applies when bypassing the npm launcher and starting `server/index.mjs` directly. Wallet access is unavailable. Protocol write modules remain in source for model/testing provenance but public HTTP routes cannot execute them.

Public markets and anonymous pre-trade calculations use allowed public API access. Exit and risk-watch demonstration use labeled synthetic cases. No synthetic result establishes real settlement or profitability.

## Deployment acceptance checklist

1. Domain, DNS and valid TLS certificate; unknown Host rejected, HTTP redirected.
2. From two independent browser profiles, complete a preview and verify that records and exports are isolated.
3. Verify Secure cookie, CSRF rejection, request limits, restart behavior and no inherited accounts.
4. Verify public data access from the actual allowed host, and failure/blocked states without fabricated data.
5. Run preview, same-snapshot comparison, saved evidence, synthetic audit/exit/watch and download/replay from the public URL.
6. Record the actual HTTPS URL and evidence. Local acceptance does not count as public deployment or Monad chain acceptance.

## Current self-hosted release

Public entry: https://reallier.com/demos/tradepilot/ . See `PUBLIC_LAUNCH.md` for the verified release and evidence. The existing domain and TLS gateway are reused; no new DNS record was necessary.

`deploy/k8s/demo.yaml.template` and `deploy/k8s/route.yaml` describe the dedicated single-replica deployment. Render the node, image and outbound proxy placeholders privately. The image is built from a reviewed runtime package (server, built frontend, production dependencies and package metadata), imported into the node image store, and retained in a release archive. This release is manually applied Kubernetes, not a GitLab/Flux pipeline.

The specific route has a gateway-wide 300 requests/minute bucket shared by all its visitors, plus the application's session limits. It does not identify each visitor by IP. Only the existing Envoy proxy pods may reach the app port through the ingress policy. Persistent storage holds protocol restriction flags, while anonymous visitor records remain in memory.

A rollout clears visitor sessions and may briefly interrupt the demo. Replicas must remain one until session state and upstream rate budgets support multiple instances.
