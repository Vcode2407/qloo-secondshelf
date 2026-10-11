# Hosted sample evidence

The baseline repaired SecondShelf Worker was deployed successfully on **October 11, 2026 at 13:00 IST** at https://secondshelf-library.viku355.chatgpt.site. The audience remains owner-private. The [hosted source](../hosting/README.md) initially mirrored the native source commit `81bd63c69bc7659743a198fe023a84f2913b6eff`; the current source and deployment are recorded below.

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

## Favourite-input validation repair

On **October 11, 2026 at 18:02:29 IST**, the canonical source `f92fbca8792e81892442f3d3f2e185c4f40b55ff` was privately deployed successfully. Saved version: `appgprj_6aca7d5e0ae881919134c388de998984~appgver_ee6aeeb28954819188af8209d8210ebc`. Deployment: `appgdep_6acb81c2437481919af0ae439ad0aaef`, status `succeeded`, environment revision 1. The production URL remains https://secondshelf-library.viku355.chatgpt.site and its audience is still owner-private.

Null, primitive and array favourites now receive HTTP 400 instead of an internal error. Strict UTF-8 decoding also rejects malformed bytes rather than silently changing a favourite query. At that deployment, the exact `hosting/` mirror contained all 134 canonical source files, with no extra files or byte differences, and **31 tests passed: 24 root tests and seven hosted tests**. The seventh hosted test included invalid-byte rejection before provider dispatch and preservation of a valid literal Unicode replacement character. The historical 20 + 6 test count above describes the earlier baseline; the newer local streamed-response checks are recorded below.

At **18:03:38 IST**, the actual deployed Worker and D1 database passed the owner-private HTTPS probe:

| Request | Actual status / result |
| --- | --- |
| Null, array and string favourites | 400 for each; actionable favourite validation error. |
| JSON string containing an invalid raw `0xff` byte | 400; no query was silently repaired. |
| Valid literal Unicode replacement character | 200; the entered query was preserved exactly. |
| Sample resolve, plan, refinement and approval | 200; approved The Martian, A Wizard of Earthsea and The Hobbit, excluding Dune. |
| Superseded original draft and repeated approval | 409 for both. |

The sanitized [input-validation HTTP evidence](HOSTED_INPUT_VALIDATION_EVIDENCE.json) records these outcomes without credentials, signed capsules or visitor data. It selected sample mode with Qloo unconfigured; provider calls were not instrumented, and no live-provider operation was requested. The five-stage canonical build and deployment archive check passed, preserving the patched React Server Components 19.2.8 decoder and the documented remaining build-tool advisory. This repair does not establish public access or live Qloo qualification.

## Streamed provider-response local validation

On **October 11, 2026**, the final canonical source at `5597c34d638ddfe25262f606cfa1ca7cd34a8efd` was copied into the public `hosting/` mirror from its exact Git blobs. [Mirror verification](HOSTED_SOURCE_MIRROR_VERIFICATION.json) confirms **135 files**, all byte-identical to that canonical commit, with no missing or extra source files. The change adds the hosted streamed-response reader and six injected provider tests. The final canonical update corrects the hosted README to 13 tests; all code and test blobs are unchanged from the preceding locally tested source. The older 134-file/31-test figures above describe the previous deployment.

The full native-plus-hosted suite passes **39 tests: 26 native tests and 13 hosted tests**. Both Qloo adapters cap streamed responses at **1,500,000 bytes**, cancel an oversized stream before reading its remaining tail and reject malformed UTF-8 without silently replacing bytes. Tests preserve valid multibyte characters split across chunks and valid literal replacement characters. Hosted tests additionally check exact-limit acceptance, sanitized stream/cancellation failures and unchanged HTTP 429 from the quota-aware fetch wrapper. Native syntax checks pass; the identical canonical Worker source has a successful local five-stage build.

These are local checks with injected provider responses. No live Qloo request or credential is involved, and local checks do not establish deployment of this repair, public-audience access, actual provider coverage or hackathon qualification. Existing cloud evidence remains tied to its recorded source/version/deployment IDs above; new deployment results must be recorded separately after verification.
