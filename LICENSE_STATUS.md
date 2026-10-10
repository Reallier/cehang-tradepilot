# Licensing status

- Project-authored code is available for inspection. No open-source license has been selected; public visibility alone is not a general reuse grant.
- `server/vendor/perpl-exchange-events.json` is derived from perpl-sdk 0.2.7. Its MIT license, source revision and provenance are retained beside it.
- The locked ethers dependency and its dependencies are installed from npm with their own notices and license files. They are not vendored in this repository.
- The proprietary Data app runtime, compiler, templates and bundles are excluded. The frontend now uses an independent project-authored shell, charts and evidence components, with no dependency on that runtime.
- lightweight-charts, fancy-canvas and lucide-react retain their own license/notice requirements; chart notices are stored in `docs/licenses/`, and dependency license texts are assembled at build time.
- React, React DOM and scheduler retain MIT license notices; `npm run build` copies the complete notices to `dist/licenses.txt`. esbuild is a development dependency under its own license.

This file records distribution scope; it does not grant rights to third-party software.
