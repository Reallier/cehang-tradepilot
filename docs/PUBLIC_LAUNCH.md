# Current release — judge entry and submission materials

- Released 2026-10-12 at https://reallier.com/demos/tradepilot/?tab=competition . Runtime source `25aed1eeb03210c74b6a327740eca1f5d5ed661e`; image `localhost/tradepilot-demo:8ddc6ad456c6`; config digest `df05eecfbe761ffca60b183ef33fd53793f9be72ce9121c933b63ae2716883e1`; archive SHA-256 `8ddc6ad456c62fba40df00b7abbc9b56cda6b046386f4008c0d3f2bc579a4230`. Later documentation commits do not change this runtime.
- Judge entry provides direct links, source-category explanations, an anonymous acceptance download and a synthetic-case entry. Selected private archived evidence was replayed locally: 2 deduplicated closed long lifecycles, 1 with a matched earlier baseline; 0 short/staged-exit samples. No account identifiers, raw packets or financial results were published. This aggregate is not independently verifiable on-chain proof.
- Historical v2 limitations are now labeled historical; current v3 sequential-exit implementation and missing actual samples are explicit. Submission text, acquisition hypotheses, judge access, disclosure and a geometric brand source/PNG export command are ready. Videos, external feedback, organizer eligibility confirmation and final submission remain incomplete.
- 181/181 tests passed. 207-file privacy scan, source/runtime Gitleaks, build and whitespace checks passed. Canonical source synchronization preserved its pre-existing Git index. Dependencies and resource limits were unchanged.
- Local IAB acceptance verified the entry layout, anonymous download matching source JSON and one-click navigation to a baseline-matched fully settled synthetic case. Temporary tab/server were closed. No new public interactive-browser or mobile acceptance is claimed.
- Public HTTPS checks confirmed all 13 non-HTML application assets match; all 14 packaged application files match the running container. Internal build metadata was omitted from this package and remains 404. HTML retains its application prefix with existing Cloudflare injection. Health/session keep trading disabled; private paths remain unavailable and order endpoints return 403. Public synthetic evidence independently replays.
- Pod `tradepilot-596c7669f6-lww45` was 1/1 Ready with zero restarts; one sample was 1m CPU / 25 MiB, not a load benchmark. Rollback `releases/8ddc6ad456c6/previous-demo.yaml` restores `907b4c56ba56`.
- See [SUBMISSION.md](SUBMISSION.md), [JUDGE_GUIDE.md](JUDGE_GUIDE.md) and [EVIDENCE_SUMMARY.md](EVIDENCE_SUMMARY.md). The website is an off-chain interface to the existing Monad/Perpl protocol, not a newly deployed project-authored smart contract.

---

# Previous release — review repairs

- Released 2026-10-12 at https://reallier.com/demos/tradepilot/ . Runtime source `68056c6f69ae0788453f1e7701034f6c32abb3c2` is published on GitHub; subsequent documentation commits do not change this image.
- Image `localhost/tradepilot-demo:907b4c56ba56`; config digest `845b4805b671f6578a77e220c4e88c811163e5d2b966eb05e8ace17e8451c394`; archive SHA-256 `907b4c56ba5612c6b536d0ed3d049565f35ae21e55d06f8fe5f1d88d24e862a0`. Rollback `releases/907b4c56ba56/previous-demo.yaml` restores `0786389e5af5`.
- All 15 files in the runtime dist directory match the packaged local files: 14 application assets and internal build metadata. The metadata endpoint returns 404. All 13 public non-HTML application assets match over certificate-verified HTTPS; HTML application prefix matches with existing Cloudflare analytics/challenge injection. JS `b4091f6374fe69d5b29618c99958fc49f4f246fbc3eb781e3b67adec7cdd842d`; Worker `a77a28d52a240c0c8e94258b346d741f03f08be2f17edf76071e277632d503aa`. Running diagnostics source also matches the repaired source.
- Pod `tradepilot-5f57c96f8b-hbbbk` was 1/1 Ready with zero restarts; sampled 3m CPU and 25 MiB, not a load benchmark. Dependencies and resource limits are unchanged.
- 178/178 tests passed, including fixed-plan mismatches for all four fields, retained valid settlement evidence, historical archive replay/restore/merge, plan preparation, account subview navigation/export and overlapping diagnostic completion orders. Build, 198-file privacy scan, source/runtime Gitleaks and staged whitespace checks passed. Canonical synchronization preserved its existing Git index.
- New plans use structured constraints; evidence that fails those constraints is excluded from plan acceptance and comparison. Workspace/comparison v3 and test-plan v2 retain frozen replay support for prior versions. Old prose-only plans are explicitly marked as lacking declared structured constraints; historical evidence is not promoted to fixed-plan compliance.
- Scenario edits survive account subview navigation, and concurrent diagnostics retain events and successful read timestamps. Frontend interaction verification for this repair is offline DOM regression; no fresh local/public browser or mobile visual acceptance is claimed.
- Health/session keep both trading modes disabled; submit/close/reconcile return 403, private observations remain unavailable, protected paths return 404 and diagnostics remain passive/session-protected. Public synthetic guided evidence independently replays with opening, exit and baseline comparison verified. No new private collection, chain transaction or real-funds operation was performed.

---

# Previous release — research workflow and sequential settlement

- Released 2026-10-12 at https://reallier.com/demos/tradepilot/?tab=research . Runtime source `cde58161f9ad4cb5df02eee8914c31ffef09a5e9` is published on GitHub; later documentation commits do not change the image.
- Image `localhost/tradepilot-demo:0786389e5af5`; config digest `b94fb82f221a2cd2088d70c2863b4404d05c6875c7b2a1ca0bc01da69346c104`; archive SHA-256 `0786389e5af581d6b95f9782a109d91d75dfc1f6c5832c915096bf03d4dfece7`.
- JS `d3f1efcabd6710b6f3bbbb8c81eb78e477d07790b3095c0e2012269e4efb175a`; Worker `4cea77a7dfc8467022dd6970cff16a6f288602b40b5136c774e549c7aaee5293`. All 14 runtime asset files match the local build; 13 public business assets (including every JS chunk and license) match over certificate-verified HTTPS. Public HTML preserves the application prefix and receives the existing Cloudflare analytics/challenge injection, so full HTML bytes are not asserted equal.
- Pod `tradepilot-64d75ff4ff-k72xv`: 1/1 Ready, zero restarts at acceptance. One observation was 2m CPU / 25 MiB memory, not a load benchmark. Manual rollout; rollback `releases/0786389e5af5/previous-demo.yaml` restores `59a1cf2c1f4f`. Existing CPU/memory limits and dependencies were retained.
- 171/171 regression tests passed. Build, 193-file privacy scan, source/runtime Gitleaks and staged whitespace checks passed. Canonical source synchronization preserved its existing Git index.
- Local browser acceptance exercised actual Worker replay; opt-in IndexedDB save, refresh/restore and deletion; per-market shock/depth controls; passive diagnostics; and creation of six unexecuted experiment drafts with zero eligible lifecycles. Public acceptance covers HTTP/API and exact resources; no new public interactive-browser or mobile acceptance is claimed.
- Research v1/comparison v1 private archives replayed successfully: three experiments and one eligible saved-testnet lifecycle. Trade-review v2 retains its original verifier; v3 sequential reductions/full close are tested with synthetic long/short fixtures and invalid/missing/duplicate evidence. No new private account collection or transaction was performed.
- Public health/session still disable both trading modes; submit/close/reconcile reject with 403, private account/monitor observations remain unavailable, source/config paths return 404, and diagnostics require a visitor session without probing upstream. Public guided evidence remains synthetic and independently replays.
- See [RESEARCH_UPGRADE.md](RESEARCH_UPGRADE.md) for storage, Worker, ledger and scenario boundaries; [CURRENT_CAPABILITIES.md](CURRENT_CAPABILITIES.md) for the shared UI/document capability matrix. Actual new short/staged-exit samples and funding-cycle attribution remain pending, separately from implemented planning and synthetic regression.

---

# Previous release — atomic research archive merge

- Released 2026-10-12 at https://reallier.com/demos/tradepilot/?tab=research . Runtime source `acf22c8a75d400d47dda9e92f22cd02ecbce9cc0` is published on GitHub; later acceptance documentation does not change the runtime.
- Image `localhost/tradepilot-demo:59a1cf2c1f4f`; config digest `7bfe4f5f794a290cbd43fae853ab9006cf8b5484b24073139d74fd3abefab19b`; archive SHA-256 `59a1cf2c1f4f6084df7ee3c5c54077602f79d71e49a8d125390b9e6fdd4ffdce`.
- JS `b225a4397de44181a15e72a6a63dbe36bbe0077fe4a69363c5ea4a589af99c13`; CSS `695dc054a081303787084fe4fa877b951e95bec5be940c21091363660ede5600`. Local build, running container and certificate-verified public HTTPS asset bytes match.
- Pod `tradepilot-6f5db4c6cc-qv5vq`: 1/1 Ready, zero restarts at acceptance. Manual K3s rollout; rollback `releases/59a1cf2c1f4f/previous-demo.yaml` restores `11404a161019`.
- Full suite: 162 tests passed. Final summary-reset adjustment: all eight offline DOM interaction tests passed again. Build, 171-file tracked privacy scan and source/runtime Gitleaks scans passed.
- Research and comparison archives can now be merged locally in one batch. Existing drafts and selection remain; identical IDs/content are skipped, alternate versions reject the whole batch, and corrupted later files cannot partially write earlier files. Clear cancels pending reads. Inputs and final export retain explicit size/count limits.
- Private archived testnet research and comparison files were replayed together locally: three experiments retained, three identical records skipped, one eligible saved-testnet lifecycle. No private evidence or identifiers were deployed/published. No new account collection or transaction was performed.
- Public health/session retain both trading modes disabled, private observation/monitor endpoints unavailable, and the guided case explicitly synthetic. Acceptance is offline DOM interactions plus public HTTP/API and exact assets; no fresh browser visual acceptance is claimed.
- See TESTNET_EXPERIMENTS.md for merge versus replacement behavior and conflict resolution.

---

# Previous release — continuous testnet acceptance

- Released 2026-10-12 at https://reallier.com/demos/tradepilot/?tab=research . Runtime source `2f83ec98ac142da8eec03f32939d5982a5bafbb0` is published on GitHub.
- Image `localhost/tradepilot-demo:11404a161019`; archive SHA-256 `11404a1610191789981fa78d5346280d275203bff401eed7c7c05b660133512f`.
- JS `549992fe11cf6c7602116d08cde7f5d24c14e665d915cdbddd53400c01a09794`; CSS `695dc054a081303787084fe4fa877b951e95bec5be940c21091363660ede5600`. Local build, running container and certificate-verified public HTTPS assets match.
- Pod `tradepilot-55549bbcff-nxh27`: 1/1 Ready, zero restarts at acceptance. Manual K3s rollout; rollback `releases/11404a161019/previous-demo.yaml` restores `606b7b8d9a63`.
- 156 tests passed. Build, tracked privacy and source/runtime Gitleaks scans passed. Public health/session retain both trading modes disabled; private account endpoints remain unavailable. Offline DOM interaction tests cover the new progress panel. This release does not claim fresh browser visual acceptance.
- The original two-minute baseline window remains unchanged. Opening evidence, exit settlement, baseline matching and comparative eligibility are now displayed separately. The timer is local and pauses when the research tab is inactive.
- The offline archive tool was exercised against private saved-testnet opening evidence and a later targeted collection. Opening replay passed, no exit was present, and the expired baseline correctly excluded the sample from comparison. Only the selected current receipt was needed in the targeted collection. No private files or identifiers were published, no trade was submitted by this release, and no second comparable lifecycle is claimed.
- See CONTINUOUS_ACCEPTANCE.md for the batched collection/archive workflow, output permissions and evidence limitations.

---

# Previous release — cross-experiment comparison

- Released 2026-10-11 at https://reallier.com/demos/tradepilot/?tab=research . Runtime source `1ff7f403bcd747381208dbe3846688307d2ea8e7` is published on GitHub. Later acceptance documentation does not change the runtime.
- Image `localhost/tradepilot-demo:606b7b8d9a63`; config digest `7ff6c17504771dfea5d940332a70fc28313dbbe8210845839b7da1ab2245f579`. Archive SHA-256 `606b7b8d9a636d9f5cb8907c24d8441c5787e64eef41f731f63801fb4c9f3899`.
- JS `3f9cd1e4bc67e56912f490d91188ba72cc796e6204d1ef9383bce5ce76776754`; CSS `163c4e315b354337736013ab6adc0ba52c97fd94d9a306c617755266ed2d863d`. Local build, running container and certificate-verified public HTTPS assets match.
- Pod `tradepilot-78fbb588cb-f5btd`: 1/1 Ready, zero restarts at acceptance. Manual K3s rollout; rollback `releases/606b7b8d9a63/previous-demo.yaml` restores `4de8150d3dc3`. Proxy, state volume, collection budgets and permissions are unchanged.
- 151 tests passed; build, tracked privacy scan and Gitleaks source/runtime scans passed. Public health/session retain both trading modes disabled and private account endpoints unavailable. The public synthetic case independently reproduces as one included sample plus one excluded duplicate when referenced by two experiments.
- Local browser inspected the populated descriptive statistics and per-lifecycle table. Public acceptance is HTTP/API and exact asset matching, not a repeated public visual test. A label-string check initially expected literal Chinese; bundler escaping was identified, and module presence was checked against the matching asset bytes instead.
- Existing private research files reproduce as one eligible saved-testnet lifecycle and one experiment missing a pre-trade baseline. No second comparable real sample is claimed, and private evidence was not deployed or published. No new protocol account read or trade was performed by this release.
- Comparison runs locally, partitions incompatible sources/scenarios, excludes conflicting duplicates, exports independently replayable evidence and preserves the old research archive format. See RESEARCH_COMPARISON.md for units and limits.

---

# Previous release — feed quality and research continuity

- Released 2026-10-11 at https://reallier.com/demos/tradepilot/ . Runtime source `8bd9ab24cc925ee58ce61c3f6ff121f9c545ed89` is published on GitHub. This later documentation commit does not change the runtime.
- Image `localhost/tradepilot-demo:4de8150d3dc3`; config digest `c3697b217b9003ea679f50b74781b7f4d849b1f1c0d3e0c07337b86146a121e8`. Archive SHA-256 `4de8150d3dc32bca57c04770aa83f8f72747c813c58a69e940f6aa2995975102`.
- JS `d4b202d66aedb4823e2b7d02b163b3ad2e3ceb071f3736f437744191d9ba0495`; CSS `a12137e592c438e690b04b806c95d089c27b65bc607b24d96dae1a6fb929d8d9`. Local build, running container and certificate-verified public HTTPS resources match.
- Pod `tradepilot-758859dfb4-s4gdw`: 1/1 Ready, zero restarts at acceptance. Manual K3s rollout; rollback `releases/4de8150d3dc3/previous-demo.yaml` restores `7525444ed3be` and the prior routing configuration. Protocol-state PVC was preserved.
- Shared testnet WebSocket snapshots now serve market display, preview and comparison; separate price/book freshness controls the overall data status. Both proxy exclusion variables retain their previous entries and additionally include only `testnet.perpl.xyz`; mainnet routing is unchanged.
- Public HTTPS acceptance returned chain 10143, WebSocket book provenance and approximately 7.5-second-old price/book samples. A short-direction risk preview passed its model gates; this was a simulation, not an order or proof of trading performance. A complete public preview evidence packet independently reproduced all ten checked model fields through the CLI.
- 145 tests passed, production build and privacy scan passed; Gitleaks source and runtime scans found no leaks. Offline DOM tests cover session renewal retaining research drafts, stale-request rejection, export and per-experiment draft retention.
- Local in-app browser verified switching between two experiments preserves an unsaved review note and displayed the updated research workspace. Public visual acceptance was not repeated under the existing Computer Use restriction; public acceptance here is HTTP/API and exact asset verification.
- Public health/session keep both order modes disabled; private observation/monitor endpoints remain unavailable. No new account collection or trade was performed. See FEED_CONTINUITY.md for cache bounds, renewal behavior and remaining work.

---

# Previous release — bounded experiment receipt collection

- Released 2026-10-11 at https://reallier.com/demos/tradepilot/ . Runtime source `4dd33631f371a1f719f138fbe805d5cbdffbf020` is published on GitHub; later acceptance documentation does not change the runtime.
- Image `localhost/tradepilot-demo:7525444ed3be`; config digest `a33c76df38a63600af4b5dd1b552102471c87a92e3a35c3e5aa9a8d33eeb5539`. Archive SHA-256 `7525444ed3be3cc3f1492ffc7a2c028c4b2bcfc9d080ab0fa76b7793526689aa`.
- JS `18bc18095f08064a23d31c25a0c75ba0ac81bcd7700f37508ece760246b3dc45`; CSS `9b611f9599ccf40435356d23f1f07b31edacfc1f12d2d5f15dc00a475c6446bf`. Candidate, running container and verified public HTTPS resources match.
- Pod `tradepilot-764c57cb5c-pgdgx`: 1/1 Ready, zero restarts at acceptance. Manual K3s rollout; rollback `releases/7525444ed3be/previous-demo.yaml` restores `29fbab380ce1`.
- 130 tests pass; build, privacy and Gitleaks source/history checks pass. Source was checked against configured private credential/wallet strings with no matches. Public health/session keep both order modes disabled; private observation and monitor routes remain unavailable.
- One authorized local read-only collection retrieved exactly two targeted transaction receipts for an existing testnet lifecycle. Opening, full exit and prior baseline association reconciled; all observed history stayed intact and non-target receipt gaps stayed explicit. No new trade was performed. See TESTNET_EXPERIMENTS.md.
- The selected private evidence and research archive remain local. Public UI only exports a selection file; private collection runs through the local CLI. Browser visual acceptance was not repeated; actual short lifecycle testing remains pending.

---

# Previous release — testnet research workspace

- Released 2026-10-11 at https://reallier.com/demos/tradepilot/ . Runtime source `0203eaa7e611ea2ea3156bdb9eb38d0ad3b6ec82` is published on GitHub; this acceptance documentation is a later commit.
- Image `localhost/tradepilot-demo:29fbab380ce1`; config digest `642f11cc5ec8394b9558c9d707e968aa46ad2f7d335de06c6b7f02086540edf3`.
- Archive SHA-256 `29fbab380ce1b16bfbc4ff07f3220504fe5ce73f4d48f00f670885723f602501`.
- JS `bad645bebd793728d5f1acf53ba9e7d4097f384eadf5b4f0ff5f39f48d7fa3ab`; CSS `9b611f9599ccf40435356d23f1f07b31edacfc1f12d2d5f15dc00a475c6446bf`. Build, running container and certificate-verified public HTTPS assets match.
- Pod `tradepilot-96fcf8cb5-9227r`: 1/1 Ready, zero restarts at acceptance. Manual K3s rollout; rollback `releases/29fbab380ce1/previous-demo.yaml` restores `84ef06e4eeeb`.
- 126 tests pass, including offline React export/restore, tab retention and cancellation after clear. Build, tracked privacy scan and Gitleaks source/history scans pass. Runtime excludes development dependencies; private credential/wallet substring checks found no matches.
- Public health/session checks confirm both trading modes disabled; private observation/monitor routes return unavailable. Public synthetic guided review imports into the experiment engine and independently replays as one synthetic lifecycle and zero saved-testnet lifecycles.
- Existing private testnet baseline/trade files independently replay as one saved-testnet lifecycle. A different baseline remains uncounted. A prepared two-experiment archive remains on the owner's machine; no account data was published or deployed.
- This release performs no new upstream account collection or transaction. Browser visual acceptance was not repeated under the existing Computer Use restriction. Targeted receipt collection, broader lifecycle support and actual short testnet acceptance remain pending; see TESTNET_EXPERIMENTS.md.

---

# Previous release — budget sizing and complete account-page clear

- Released 2026-10-11 at https://reallier.com/demos/tradepilot/ . Runtime source `4894eeac1ac0f56d8e535ba603214d15250d022b` is published on GitHub. Later acceptance-documentation commits do not change this runtime.
- Image `localhost/tradepilot-demo:84ef06e4eeeb`; config digest `15ca8c7b2a3f7b302c33024137b9c68cea34b3f8f0d6b81f0f6f78beead03a03`; source revision label verified.
- Archive SHA-256 `84ef06e4eeebb60cafa27861d5fa43dd50b2236a7cb236d5d3d6dee750a35612`.
- JS `36c9dcd163fff06290d57278135b8eaab54604126ba53a8e59cc632af8344136`; CSS `0e67b697f3c52fda0900184e6193bf752eedd73342c32cc6b0722e405de36293`. Candidate, container and certificate-verified public HTTPS assets match.
- Pod `tradepilot-57b57d848b-h4bxb`: 1/1 Ready, zero restarts at acceptance. The deployed budget model hash matches the reviewed source.
- 120 tests passed, including bounded size-search/exhaustive-grid arithmetic and offline DOM interaction tests for full clear, late responses, budget invalidation, evidence reuse, transfer and export. Build, tracked privacy scan and Gitleaks source/history checks passed. Production dependencies exclude DOM testing and build tools.
- Public health/session checks keep both order modes disabled; local observation and monitor endpoints remain unavailable publicly. Eleven public markets loaded; a fresh saved comparison produced a budget interval and its exported packet replayed independently. The public synthetic guided lifecycle also replayed.
- No private account collection or transaction was performed for this release. Runtime-package scanning found no configured private credential or wallet strings.
- Offline DOM tests are not browser visual acceptance. Interactive browser acceptance was not repeated under the existing Computer Use restriction.
- Rollback `releases/84ef06e4eeeb/previous-demo.yaml` restores `ddc14b8369fb`. This is a manual update to the existing dedicated K3s deployment, not CI/Flux.

---

# Previous release — reviewed source publication and monitor fixes

- Released 2026-10-10 at https://reallier.com/demos/tradepilot/ .
- Runtime source commit `68912ba3188d6f8d176f7403efbf2bdc456a7d9f` is published to `Reallier/cehang-tradepilot` on GitHub. Subsequent documentation-only commits record this acceptance; they do not change the runtime.
- Image `localhost/tradepilot-demo:ddc14b8369fb`; config digest `7d56ac2354beea2b1b789c5acf1e58da8320637f831133c818f387c7442e2f70`. The image revision label matches the runtime source commit.
- Runtime archive SHA-256 `ddc14b8369fbaf131fc3688e5f8d3ebb4f870a86b6d21d6591082145712c2b62`.
- JS `cfd6b661f597c840be25b358070d116e247c1bdb4d3e780c1a6868e3c210f23b`; CSS `f8bf0c59652e3762d533cd05ca865473d9b7bc74f0e65d51cc78fff869a11258`. Public HTTPS assets and running-container assets match the candidate build.
- Pod `tradepilot-55796d589c-qdsxz`: 1/1 Ready, zero restarts at verification. The deployed account-monitor module hash also matches the reviewed source.
- All 110 tests passed before release. Three new regressions cover third-failure cooldown persistence across restart and missing/invalid/normalized collateral identity. Committed history and source privacy checks found no leaks.
- Public health/session checks confirm both mainnet and testnet orders disabled; local observation and monitor endpoints are unavailable publicly. The public guided case remains synthetic and its downloaded evidence independently replays.
- No private account evidence or credentials were deployed. No real account collection was retried during deployment. A later bounded diagnostic corrected an inherited lowercase proxy-bypass setting and succeeded once; see `ACCOUNT_MONITOR.md`. Interactive browser acceptance was not repeated in this release.
- Rollback manifest `releases/ddc14b8369fb/previous-demo.yaml` restores image `443174e50e95`. This is the existing manual K3s deployment, not a CI/Flux release.

---

# Previous release — bounded account updates and risk changes

- Image `localhost/tradepilot-demo:443174e50e95`; config digest `c85058d7eecfadcb95b74922ab02e62b87f0b24c0a3bc05dbe6b5fd57638dee3`.
- Runtime archive SHA-256 `443174e50e9509bae8b89db78b0ab9bc21592bb6a406ed1da0bcfa7e04b54ccf`.
- JS `96ee0c11dda65c70ed3e21caae522250dd92158c43832b9c794399e1ea79135a`; CSS `f8bf0c59652e3762d533cd05ca865473d9b7bc74f0e65d51cc78fff869a11258`.
- Pod `tradepilot-7bf75bcf5-24mcc`: 1/1 Ready, zero restarts at rollout. Rollback `releases/443174e50e95/previous-demo.yaml` restores `8dea6c8ca9b9`.
- 107 automated tests pass. Build, privacy scan and React rendering smoke pass. 79 first-party source/runtime files checked against private credential/wallet strings with no matches.
- Public risk-change example is synthetic; the local monitor endpoint refuses public configurations. No private reports or credentials deployed. Local HTTP validation confirms collection stopped on HTTP 451 with no accepted observation. This release does not establish successful live-account refresh.
- Public HTTPS JS/CSS match the local build; `/api/local-monitor` and `/api/local-observation` both return unavailable. Both trading flags remain false. Downloaded full-cycle synthetic case reproduces. Verification: ignored `data/deploy/monitor-public-verification.json`.
- Browser interactive acceptance remains pending under the existing Computer Use restriction. Manual K3s release, no GitHub push. See ACCOUNT_MONITOR.md.

---

# Previous release — preview-to-review path

- Image `localhost/tradepilot-demo:8dea6c8ca9b9`; config digest `c9bf98109a6832df43f2517d0f0760935019d3d929214f00f0e752199bbc623f`.
- Runtime archive SHA-256 `8dea6c8ca9b923ada7ead2434f90414a5ef5092b26f98e564b87b5cc21139358`.
- Public JS `bb6f2b07a12c24391591e2b4e5cdd5e427e043a3ed62066dfa03dc26cac4f98e`; CSS `3eebb6f64182c60abfe7382cfff5b7d32c48161ea607db9e6bd5ef511c5a81c5`.
- Pod `tradepilot-788977578d-fkkjn`: 1/1 Ready, zero restarts at rollout. Rollback `releases/8dea6c8ca9b9/previous-demo.yaml` restores `2f9012003571`.
- 101 tests pass, production build and React server-render smoke pass. Privacy scanner has no findings; 73 source/runtime files checked against actual private credentials and wallet with no matches.
- Certificate-verified public HTTPS resources match the local build byte for byte; both trading flags remain false and private observation is unavailable. Downloaded synthetic full-cycle packet reproduces with opening/exit reconciliation and baseline comparison. Evidence: ignored `data/deploy/flow-public-verification.json`.
- Adds compact action navigation and direct baseline transfer, distinguishes synthetic review from public-market preview, updates testnet acceptance copy. Account pressure calculations memoized rather than repeated on clock ticks.
- Manual K3s deployment; no GitHub push. See REVIEW_PATH.md for workflow and limits. Interactive browser acceptance has not been repeated because the existing Computer Use restriction remains in effect.

---

# Previous release — evidence import and remediation guidance

- Image `localhost/tradepilot-demo:2f9012003571`; config digest `4b7503427d0643d99aa396cff84c61669e914b1370ab83e175f654026127d782`.
- Runtime archive SHA-256 `2f9012003571d69302c348dcb7500b37d47db4c0d066d72ae47cc00a18e3d5a0`; JS `344fbe8da320be0f99bc94034308e66e0ed7af372347a81be00d4c5d87fbf8c4`; CSS `d4a17a42aa8e90634bec909bdce2499ae55eec2900fc23a389b12303ea0d8b1f`. Verified HTTPS resources match local build.
- Pod `tradepilot-7cfc5899b5-qhsq5`: 1/1 Ready, zero restarts at release check. Rollback `/opt/tradepilot-demo/releases/2f9012003571/previous-demo.yaml` restores `23bcd6e9a7e1`.
- 98 tests pass; build/diff checks and tracked privacy scan passed. Actual private key/secret/wallet values checked across 70 runtime/source files with no matches. No private packets in runtime archive.
- Local Chrome verified missing exit receipt produces precise remediation and unknown PnL; malformed JSON leaves the previous two-order workspace intact. The accepted schema list includes account workflow exports and restores position/shock when reimported (automated coverage).
- Public Chrome at approximately 2026-10-10 14:51 Asia/Shanghai: file guide expands, all expected document categories visible; full synthetic case imports, coverage shows two checked orders / zero failures, opening 18/18 and exit 19/19 pass, baseline remains matched.
- Public health confirms both trading modes disabled, private observation unavailable. No new background requests or backend service. Current validators unchanged; only import routing and explanatory presentation added.
- Manual K3s runtime deployment; no GitHub push. See EVIDENCE_IMPORT.md for scope and limits.

---

# Previous release — account portfolio risk

- Image `localhost/tradepilot-demo:23bcd6e9a7e1`; config digest `e0ebfcd1204ce162d179a03f15988a11e74f2d56c4fe046fb415119a34f7cfde`.
- Runtime archive SHA-256 `23bcd6e9a7e19e3c138cb10de0c9c2021916dff8db41e3368ee4b86af3cee4aa`; JS `e86e02b02f20d9aae39bc4a22106ca8f0d4d5844bd4738890cd93d4daa479b84`; CSS `a10828cf85a921ae73f5d3dd46ce96f730f55d5f9fe6f4e01203260c7991f9e1`. HTTPS assets match local build.
- Pod `tradepilot-849cfdd485-j6r5z` 1/1 Ready, zero restarts at release check. Rollback `/opt/tradepilot-demo/releases/23bcd6e9a7e1/previous-demo.yaml` restores `ae5a498a1911`.
- 92 tests passed. Build/diff check and privacy scan passed; 66 runtime/source files checked for actual private key/secret/wallet values, no matches. Runtime excludes private reports.
- Local Chrome: synthetic three-position/two-group case, −20% gives two individual threshold flags; export independently reproduced with CLI; reimport restores −20% and both flags.
- Public Chrome at approximately 2026-10-10 14:34 Asia/Shanghai: synthetic case → −20% → two threshold flags → BTC long drilldown shows price 84 and margin buffer −2 → return preserves −20%. Both account/token groups and table visually inspected.
- Public HTTP check: both trading flags false, private observation unavailable. Local-only portfolio calculations introduce no additional API polling. No real trades or credential changes occurred.
- Manual release to existing K3s application; no GitHub push. See PORTFOLIO_RISK.md for model limits and evidence scope.

---

# Previous release — pre-trade decision comparison

- Image `localhost/tradepilot-demo:ae5a498a1911`; config digest `b7b0e223cdb96626b3057fb513a704e177ca55943ac9491437e548e34b60ca29`.
- Runtime archive SHA-256 `ae5a498a191151eadedb3a8c673dfa72e4c75b9797b6a04ae549dda81d755705`; public JS SHA-256 `6c3e5d5f8afbcfa2420fba55230f23722c52b7f0adbbd26c111838345e582cb2`. JS and CSS matched local build over verified HTTPS.
- Pod `tradepilot-7466598cdc-rtpfl`: 1/1 Ready, zero restarts at check. Rollback `/opt/tradepilot-demo/releases/ae5a498a1911/previous-demo.yaml` restores `886f0ca69c8f`.
- 87 tests passed; build, diff check and privacy checks passed. Runtime/source private-value scan checked 62 files with no actual credential or private wallet address matches. Private reports excluded from deployment.
- Public HTTP acceptance: one context/book snapshot shared by both plans, same-size fees and PnL identical when only leverage changes, margin doubles for half leverage, complete comparison evidence retrieved and decision wrapper independently replayed.
- Native Chrome public acceptance: half-size shortcut set B to 50 with leverage/time unchanged; comparison succeeded; transfer B restored notional 50 and cleared the old preview; fresh risk analysis passed and exposed a new baseline save action. The final calculation was observed at 2026-10-10 14:18 Asia/Shanghai.
- Local browser budget editing and evidence export/replay also passed. See PLAN_DECISION.md.
- Mainnet/testnet trading remain disabled; private observation unavailable. User budget values stay in the browser and local exports. No additional polling or private-account calls introduced.
- Manual K3s deployment, not a GitHub push. Private testnet evidence and credentials were not published.

---

# Previous release — trade-level lifecycle review

- Image `localhost/tradepilot-demo:886f0ca69c8f`; config digest `9b49410e66a9e17eb6133e143e8cbf68bd7297ef7285493baa451cf07be600d8`.
- Runtime archive SHA-256 `886f0ca69c8fc6a9449b9b3a923863f8cd274f958747171f58e770c3aea8b4b7`; public JS `d15d79ef5c713edf957f005ec3e6187636856927b436d724fbc8de01796c491f`. Public JS and CSS match the local build over certificate-verified HTTPS.
- Rollout `tradepilot-5cc44698ff-sz6rx`: 1/1 Ready, zero restarts at check. Rollback `/opt/tradepilot-demo/releases/886f0ca69c8f/previous-demo.yaml` restores `7977b2597b3a`.
- 82/82 automated tests passed. Build and tracked-source privacy scan passed; all runtime/source files were also checked for the actual private credentials and wallet address, with no matches. No private packet is in the runtime archive.
- Real two-trade testnet packet reproduced independently and passed local browser import/switching: corresponding baseline, exit and net change together; tiny fee delta remains visible. Empty position selector is absent in closed-trade review.
- Public health retains both trading modes disabled; local observation unavailable. The public synthetic case independently replays. Native Chrome public acceptance passed: one-click synthetic case renders the new trade table, 50.2513 bps comparison, cost attribution, and expandable 18/18 plus 19/19 checks. No additional upstream account traffic is introduced by the new view.
- Manual release to the existing dedicated K3s deployment, not a GitHub push. See PRODUCT_ITERATION.md for scope and next priorities.

---

# Previous release — guided review and testnet simulation parameters

- Image `localhost/tradepilot-demo:7977b2597b3a`; config digest `a49329700f0f7b559794bfad3038aa0ea76b1dbb00a735eea1f58a3fce58eb31`.
- Archive SHA-256 `7977b2597b3a79fd16ffc3a6295853469257967c08f2b43bc0d4d4cbe563dc89`; public JS `5c9cf7c19882c5fa9052b9f70de246825823ba9c870a686088ded94af81c5eb8` matched over verified HTTPS.
- Rollout pod `tradepilot-85ccbc8d54-l7tfn` 1/1 Ready, zero restarts. Rollback `/opt/tradepilot-demo/releases/7977b2597b3a/previous-demo.yaml` restores `e88242610c03`.
- 77/77 tests passed; build and privacy checks passed. The deployment excludes private files and actual credentials/account address.
- Browser local acceptance: switch mainnet → testnet retains notional 100, reads fresh testnet data, produces valid analysis; saving a baseline shows exact quantity, leverage, network and deadline.
- Guided case import/export and CLI replay passed locally. Public HTTPS case also independently reproduced opening, closing and baseline comparison; public asset matched local and both trading modes remain disabled.
- Native Chrome public acceptance also passed: one-click case rendered the synthetic warning, opening/exit consistency and 50.2513 bps baseline deviation.
- Synthetic case is built only from literals and labeled on screen and in JSON. See GUIDED_REVIEW.md. Actual baseline-to-fill validation remains a separate user-operated testnet acceptance.
- No GitHub push was performed. Release used the existing dedicated K3s deployment.

---

# Current release — account trade review and baseline

- Runtime archive: `e88242610c030b07ae02067d04c49f2b8bc9b538753423a205a3c3852064931e`.
- Image: `localhost/tradepilot-demo:e88242610c03`; config digest `c97f63cbee449a7e77d8e936417f75517e3a729ce95c7ae347d2581abede136f`.
- Public JS SHA-256: `96a67950bb1a285358977722ef3247e839a133c6dd45cba6b3142b3a3c33497e`, equal to local build over verified HTTPS.
- Rollout: `tradepilot-679984c96c-mgwh7`, 1/1 Ready, zero restarts at check. Rollback: `/opt/tradepilot-demo/releases/e88242610c03/previous-demo.yaml` restores `840f4aa3e806`.
- 75/75 regression tests passed; production build and source privacy scanner passed. Runtime scan found no actual key/secret or full private wallet address.
- Public health reports both transaction modes disabled; private observation unavailable. Public live context returned 11 markets; fresh public risk preview and baseline replay passed.
- Native Chrome: public risk analysis → Save pre-trade baseline → downloaded JSON → CLI reproduction passed. Local Chrome: actual closed-account history import → opening and settlement display → exported review → CLI reproduction passed.
- Actual testnet long/full-close evidence is private; see HISTORY_ACCEPTANCE.md for boundaries. Trading PnL excludes separately denominated MON gas and deposit/withdrawal transaction costs.
- Receipt/settlement validation is browser-local and memoized per imported packet. The deployment contains no private account packet or API credential. Native Chrome public account import was then verified: the browser-exported private review reimported successfully, zero open positions remained visible, opening 18/18 and exit 19/19 checks passed, with net PnL displayed. The file was processed locally, not uploaded.
- This is a manual K3s runtime release. No GitHub push/release occurred this turn. Video production/upload remains unfinished. Mainnet funds remain disabled.

---

# Public launch — 2026-10-10 (Asia/Shanghai)

Entry: **https://reallier.com/demos/tradepilot/**

## Receipt compatibility repair — 2026-10-10

Current runtime supersedes the releases below: `localhost/tradepilot-demo:840f4aa3e806`.

- Runtime archive SHA-256: `840f4aa3e8068b561ba8f8fd564d740f37e1380a089830dafd3372104445de6e`.
- Image config SHA-256: `ddff1d610817cdc4350af1a2c23abd14f6aec1b19b1f38d11b5485124c9a9672`.
- Public frontend unchanged, SHA-256 `b64fcb37b7948b6b86e1b682ea55d7af5b15f94f1a6bc317476134ee63aa952c`, reverified equal to the local build.
- 70/70 local tests passed. Dedicated runtime archive scan found no actual credentials or full private wallet address. The deployment rolled out with one ready pod and zero restarts at acceptance.
- HTTPS API acceptance: corrected synthetic full-fill audit returns `rechecked`, downloaded packet reproduces through the CLI; mainnet/testnet trading remain disabled and local observation remains unavailable publicly.
- Private real opening/history/model acceptance is documented in HISTORY_ACCEPTANCE.md. Private data and credentials were not copied to the deployment. That private report is not yet an importable public account-workspace view.
- Rollback manifest: `/opt/tradepilot-demo/releases/840f4aa3e806/previous-demo.yaml`, restoring `localhost/tradepilot-demo:6e1cc861536c`. No new GitHub publication was performed.

## Account workspace release — 2026-10-10

This release supersedes the runtime identity below. Entry: `?tab=account`.

- Runtime archive SHA-256: `6e1cc861536c43fd589aa53473bcbb5b1d91879e0bc7df33711c5a89a372a09c`.
- Image: `localhost/tradepilot-demo:6e1cc861536c`; image config SHA-256: `5b92a1a923a23c9b4246e863ab159b6285bfe4a9aaaccf1dc2820f5e7592aa70`.
- Public JS SHA-256: `b64fcb37b7948b6b86e1b682ea55d7af5b15f94f1a6bc317476134ee63aa952c`, verified equal to local `dist/app.js` over certificate-verified HTTPS.
- Kubernetes rollout completed with one ready pod and zero restarts at verification. No GitHub publication was performed for these changes.
- 64/64 local tests passed; frontend production build passed. Runtime archive scan found none of the actual private API credentials or full account address.
- Public health confirms mainnet and testnet trading disabled. `/api/local-observation` returns `available: false`; the public service has no private observation configured.
- Native Chrome public acceptance: imported a previously collected testnet position observation using browser-local file handling; inspected quantity and entry, changed price shock from -10% to -20%, and opened review. Values updated consistently with the local model. No observation upload occurs in this flow.
- Local browser review export was reproduced by the CLI. The packet proves internal model consistency, not upstream authenticity or chain settlement. Missing pre-trade baseline, receipt and realized PnL remain unverified.
- The observation is explicitly historical, not live account monitoring. Private API keys and observation files remain outside the deployed package. Mobile visual acceptance was not repeated for this revision.

Rollback: apply `/opt/tradepilot-demo/releases/6e1cc861536c/previous-demo.yaml` on the deployment host. It restores image `localhost/tradepilot-demo:80663378c76f`; preserve the protocol-state PVC. The host's current manifest was updated after rollout succeeded.

The first automated HTTP check through the local environment proxy returned 403. The established direct verification client subsequently passed, and the native Chrome public flow passed. No gateway or TLS protection was changed.

## Release identity — professional terminal revision

- Dedicated `tradepilot-demo` namespace; one restricted, unprivileged Node container.
- Runtime archive SHA-256: `80663378c76f34dd9de55481e7421137dde8b7d90456f7e1b3df0d74cc46544d`.
- Node base: 24.21.0, pinned image digest in `deploy/Dockerfile`.
- Running image config SHA-256: `e76a05a35ddccf0b22065790862cc720c69f93b9503b65551ba67d777fcabf78`.
- Imported image manifest SHA-256: `4c34ffd3d6db872de0d28ce2fbbd28a28fd370eaed762845b63f3a698d987f9d`.
- Public frontend JS SHA-256: `68b9df39f2b55d612fe9dc67c6a134bc0a00f5c5762925d1cb76161663761924`, equal to the local release asset.
- Manually applied Kubernetes release; source changes are local and are not yet a new GitHub release or a Flux-managed deployment.

## Verified from the public HTTPS URL

- TLS verified without disabling certificate checks; HTML/assets return 200 with no-store, CSP, HSTS and frame-denial headers.
- Existing Gateway accepted the specific HTTPRoute and its independent rate policy. No existing route was edited.
- Secure, HttpOnly, SameSite=Strict visitor cookies scoped to `/demos/tradepilot/`.
- Two independent HTTP cookie jars: one visitor's records are absent for the other; guessed record IDs return 404; a mutation without the session token returns 403.
- Real read-only Perpl mainnet context, order book and 48 hourly candles loaded (11 markets at acceptance).
- Preview and same-snapshot two-plan comparison saved evidence successfully.
- Synthetic execution audit, partial position exit and healthy-to-unknown risk observation completed.
- All five downloaded evidence packets reproduced with `scripts/replay.mjs`.
- Account lookup reports unconfigured; submit, close and reconcile endpoints reject with 403. Health reports both mainnet and testnet trading disabled.
- The terminal revision rolled out successfully: one ready pod, zero container restarts. The earlier release sampled approximately 28 MiB memory and 1m CPU; this is historical observation, not a capacity claim for the current revision.
- Full local regression: 52/52 tests passed including root-path and deployed-subpath isolation tests. Publication scanner and Gitleaks found no findings in the reviewed source.

Public HTTP evidence is saved under ignored `data/deploy/`. Cookie and CSRF values were not printed or committed. Runtime package and image recovery copies are retained in the deployment host release directory.

## Limits and recovery

Public desktop visual acceptance completed in the existing native Chrome instance at the HTTPS URL: real market rows, candles, depth, parameter ticket and a completed risk calculation were inspected. Screenshots: ignored `data/ui-review/public-terminal.png` and `public-terminal-result.png`. Local 390px verification covered market, parameter and completed-result steps; it is not a public mobile-device test. Broad accessibility certification and timed first-user usability testing were not performed.

Real-money trading and testnet order submission are disabled. Actual Monad account/settlement acceptance and videos are separate, unfinished competition deliverables. Synthetic audit results are not chain settlement evidence.

Visitor records expire after 30 minutes and disappear on restart. One replica only; requests are bounded by the route-wide gateway budget and application limits. Public upstream reads use the host's existing outbound proxy with TLS verification enabled; no upstream eligibility restriction was bypassed.

Deployment sources: `deploy/k8s/demo.yaml.template`, `deploy/k8s/route.yaml`. Render node/image/proxy privately, import the reviewed immutable image into the selected node, apply the workload, wait for readiness, then apply the route. Preserve the dedicated protocol-state PVC across updates.

To withdraw the public demo, delete only HTTPRoute `tradepilot` in namespace `tradepilot-demo`; the existing website routes continue to serve. Keep the namespace/state/release image for diagnosis. To roll back this UI revision, reapply `releases/80663378c76f/previous-demo.yaml` from the deployment host release root; the previous image `localhost/tradepilot-demo:1c8d3b18c5d6` is retained. The current host manifest was updated only after readiness succeeded.
