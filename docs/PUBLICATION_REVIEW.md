# Public source review

Review date: 2026-10-10. Scope: the initial tracked files of this source-only repository, not the developer's full workspace or deployed services.

## Initial publication: export boundary

The publication directory was created from an explicit selection of backend code, tests, authored frontend components, model documentation and utility scripts. It has a fresh Git history. Existing environment files, account data, evidence exports, observations, participant feedback, logs, screenshots, dependency installations, archives and proprietary runtime/build files were not copied.

Commit identity uses the owner's GitHub noreply email. No private remote URLs or credential-bearing URLs are configured for publication. `.gitignore` excludes runtime state and common sensitive file types; it is a convenience, not a substitute for inspecting tracked files.

## Initial publication: checks

- Gitleaks 8.30.1 from its official GitHub release; downloaded binary archive checked against the release's SHA256 list. Source scan used default rules and redacted reports, with no project-specific secret suppressions: no findings.
- Supplemental scan of tracked files: local home paths, private IPv4 ranges, personal mailbox providers, credential-bearing URLs, private-key headers, WeChat identifiers, forbidden paths, symlinks and unexpected binary files: no findings.
- Credential assignment locations were reviewed: environment reads, freshly generated session tokens and synthetic test inputs. No account credentials were included. Protocol token variables refer to assets, not authentication secrets.
- Existing backend test suite: 47 passed, 0 failed, in the publication checkout.
- Before push, the committed Git history is also scanned with Gitleaks. Only the new publication history is uploaded.

Scanners reduce exposure risk but do not prove that every possible sensitive value is absent. Future changes require the same tracked-file and history review. Reports print file/rule locations rather than credential values.

## Initial publication: limits

This is a publication privacy review, not an exhaustive vulnerability audit. It does not establish frontend redistribution rights, public hosting safety, strategy profitability, real chain settlement, user traction or competition eligibility. At that initial publication, the proprietary frontend runtime was excluded and a standalone UI had not yet been included.

## Subsequent local adaptation

The statement above describes the initial 49-file publication. The subsequent independent frontend implementation resolves that construction dependency without distributing the proprietary runtime. New public-demo source and deployment templates require a fresh staged-file scan before any update is pushed. The current standalone implementation has since been deployed. See `PUBLIC_LAUNCH.md` for deployment evidence and limits; publication and deployment are separate acceptance steps.


## Updated source candidate: 2026-10-10

Status: prepared and reviewed locally; this section does not assert a GitHub push.

- Exact candidate: 136 source, test, documentation and deployment-template files, based on initial public commit `c16f1785a93e98b7629df4235f0e22d5541d4c3f`.
- Prepared in an independent checkout, preserving the working repository's existing staging area.
- Reinstalled locked dependencies with `npm ci --ignore-scripts --no-audit --no-fund --offline`; the standalone frontend build succeeded. All 110 tests passed.
- Supplemental tracked-file privacy scan: 136 files, zero findings. An exact local comparison against the configured private account credentials and wallet found zero matches; those values and the comparison inputs are not included.
- Gitleaks 8.30.1 default-rule scan of the complete candidate source: zero findings. Scan of the existing one-commit Git history: zero findings. Any newly created publication commit must receive a history scan before push.
- Excluded: `.env` credentials, `data/`, private account packets, wallet identifiers, logs, node_modules, build output, archives and the separate Binance deployment. Public examples and fixtures are synthetic.
- Added judge instructions and a build disclosure. Existing project foundations and competition-period additions are identified separately; the initial public commit is not presented as proof of a pre-competition snapshot.

Historical testnet acceptance comprises two long/full-close lifecycles, including one pre-trade-baseline-linked cycle, in private evidence. The current bounded account refresh returned HTTP 451 and stopped; continuous real-account monitoring is **not accepted**. Neither historical acceptance nor synthetic examples prove current account freshness, trading profitability, human usability or competition eligibility. Video production/upload remains outstanding.

The exact reviewed file manifest and redacted scanner reports are retained locally outside the published source tree. Any source change after this review requires updating the manifest and scanning the final candidate again.

The source review found and corrected third-failure cooldown loss and comparison with missing collateral identity. Three additional regression tests bring the candidate suite to 110. These fixes are prepared locally; hosted deployment remains at the release documented in `PUBLIC_LAUNCH.md`.
