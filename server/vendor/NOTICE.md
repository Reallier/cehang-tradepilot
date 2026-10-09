# Perpl protocol schema provenance

`perpl-exchange-events.json` contains only the event ABI from
`perpl-sdk` 0.2.7, `abi/dex/Exchange.json`. No bytecode or contract is deployed.

- Publisher/repository: https://github.com/PerplFoundation/dex-sdk
- Reviewed package: https://crates.io/crates/perpl-sdk/0.2.7
- ABI sha256: `3db1ccbe08a86fbe4b66a8a5a7688e43503f7a57c81da8b2cac5fb39761e9553`
- MIT license retained in PERPL_LICENSE; ABI revision in PERPL_REVISION.
- Margin and Q16 entry price formulas checked against `src/state/position.rs`.
- Public API specification: https://github.com/PerplFoundation/api-docs
- Unknown upgraded event shapes deliberately fail verification.
