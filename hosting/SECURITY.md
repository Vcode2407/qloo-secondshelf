# Hosted demonstration controls

This is a limited hackathon demo with fictional catalogue/sample signals. Live Qloo remains disabled until the issued event key and real results are verified. Deployment and passing sample tests do not establish provider qualification.

Keep `SECONDSHELF_STATE_SECRET` and any `QLOO_API_KEY` in the hosting secret manager. Local `.dev.vars` files, authentication credentials, dependency caches and runtime records are ignored and excluded from deployment/source archives. Capsules are signed, not encrypted; they contain the same reviewed evidence visible in the browser and expire after 30 minutes. D1 stores draft state and quota metadata. Browser-local lists can be edited by their owner and are not a provider attestation.

Mutable routes accept bounded same-origin JSON. Draft approval uses a conditional database update so a replay or concurrent stale action cannot approve the same draft twice. Network limits are checked before global allowance is consumed; sample requests make zero provider calls. See [README.md](README.md) for quotas and retention.

## Dependency review

The lock file pins the runtime and build tree. The October 11, 2026 repair updates React, React DOM and React Server Components to **19.2.8**, Next to **16.4.0**, and the affected image/parser/tool dependencies. React Server Components must be checked in the compiled Worker too, because the Vite plugin has vendored copies and npm's dependency classification alone does not prove which code is deployed. See the [React advisory](https://github.com/react/react/security/advisories/GHSA-wx67-qw84-cm4g).

The full dependency audit still reports `braces` through build/lint glob-processing chains. The [upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched release. This application passes owned source/configuration patterns to those tools and does not expose a public glob-processing endpoint. That limited input path does not make the entire dependency tree audit-clean. Do not process visitor-supplied glob patterns in the affected tools, suppress the finding, or downgrade the framework to satisfy npm's suggested repair. Recheck upstream and the exact pinned tree before future builds.

Reproduce the sample tests and build using the commands in README. Audit both production and development dependencies; framework code can be compiled from packages classified as development dependencies.
