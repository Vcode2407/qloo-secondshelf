# Hosted sample evidence

The repaired SecondShelf Worker was deployed successfully on **October 11, 2026 at 13:00 IST** at https://secondshelf-library.viku355.chatgpt.site. The audience remains owner-private. The [hosted source](../hosting/README.md) mirrors the native source commit `81bd63c69bc7659743a198fe023a84f2913b6eff`.

Native saved version: `appgprj_6aca7d5e0ae881919134c388de998984~appgver_cc4f4e9bc68c8191b7477a05228522d6`. Deployment: `appgdep_6acb3ae8e53881919782e48546b9dbee`, status `succeeded`, environment revision 1. Runtime secret values are not included in this record or source.

At **13:00:59 IST**, a direct HTTPS check through the platform's owner-private service boundary exercised the actual deployed Worker and D1 database:

| Request | Actual status / result |
| --- | --- |
| Status and inventory | 200; Qloo not configured. |
| Resolve Interstellar against four available sample books | 200; reviewed candidates and signed resolution. |
| Prepare the selected three-book draft | 200. |
| Refine, excluding Dune | 200. |
| Approve the superseded original draft | 409, rejected. |
| Approve the refined draft | 200; The Martian, A Wizard of Earthsea and The Hobbit; sample provenance and evidence schema 1. |
| Approve the same draft again | 409, rejected. |

The sanitized [HTTP evidence](HOSTED_SAMPLE_EVIDENCE.json) contains no credential, capsule token, raw address or patron data. All inputs were authored fictional sample data. Provider requests were not instrumented in this cloud probe: it selected sample mode with Qloo unconfigured and requested no live-provider operation. This record does not verify Qloo access, returned cultural evidence or signed-out public playback.

The six hosted capsule/workflow/quota tests pass alongside the root application's twenty tests. A clean dependency installation and five-stage Worker build passed. The [dependency review](../hosting/SECURITY.md) records the repaired runtime and remaining unpatched build-tool advisory; the complete dependency tree is not audit-clean. The rebuilt deployment archive excludes secrets/runtime caches and contains the patched React Server Components 19.2.8 decoder.

Remaining gates: explicit public-audience instruction, signed-out workflow verification, an issued event key, real reviewed Qloo results and free usable judge access. No Devpost entry has been submitted.
