# SecondShelf — English Devpost description draft

Prepared October 10, 2026. SecondShelf is a working local sample agent with an implemented Qloo adapter. Live Qloo access, a public functional demo, a public repository, and submission remain pending. The authored sample matches and rankings are not Qloo data.

## Project name and tagline

**SecondShelf**

**From what they love to a good next read already on the shelf.**

Proposed entry: Qloo Agentic Hackathon, using a deterministic agentic-tool workflow. This build does not use an LLM or claim language-model reasoning.

## Inspiration and problem

A book recommendation is difficult to act on when the library has no available copy. Cultural discovery also involves more than a typed title: a favourite film, artist, or book needs to be resolved to the intended entity before it becomes a useful signal.

SecondShelf connects those two decisions. It starts with volunteered favourites and the books available in a catalogue, asks for review of identity matches, prepares a constrained reading draft, and leaves the final list to the librarian. The demo stock and cultural tags are authored fixtures. There is no connected library, patron study, user interview, or measured recommendation benefit in the current evidence.

## What actually works

The local application runs without an account or key. A person can search and filter the sample catalogue, choose one to six available books, and enter one to three movie, artist, or book favourites. Out-of-stock titles stay visible but cannot enter a shortlist.

The agent resolves the inputs and presents reviewable candidates. Every favourite needs a reviewed match; unknown names stay unresolved. Catalogue titles can be omitted. Sample mode offers an explicit action to accept the displayed fixture matches, while real Qloo mode requires individual review.

The planner then creates a draft from the reviewed, available shelf. The person can exclude books, choose a category, or change the requested list size and generate a replacement. A short result set is reported honestly rather than padded. Superseded drafts cannot be approved, and pending exclusions must be refined before approval.

Librarian approval saves the list locally. CSV and complete evidence JSON can then be downloaded, and saved evidence can be reopened after a restart. Approval does not reserve books, change stock, identify a patron, or contact anyone.

## Technical architecture and Qloo's intended role

SecondShelf uses Node.js 22.19.0 or newer, vanilla browser HTML/CSS/JavaScript, and atomic local JSON storage. It has no external runtime package dependency. The bounded deterministic orchestrator runs resolution → identity review → inventory grounding → ranking → refinement → approval → export.

In sample mode, resolution and tag-fit calculations use authored fixtures. Every sample score and ordering is labelled synthetic. Even a configured key makes no calls while this mode is selected.

The real adapter is implemented against `https://hackathon.api.qloo.com`. The backend supplies `X-Api-Key`; credentials never enter the browser or saved evidence. Explicitly selecting Qloo mode initiates `/search` requests for typed inputs. After review, `/v2/insights` uses `filter.type=urn:entity:book`, the reviewed favourite IDs in `signal.interests.entities`, and reviewed available catalogue IDs in `filter.results.entities`.

This is intended to make Qloo central: cross-domain cultural affinity determines the order within the available shelf. The live adapter preserves the actual response order and any returned affinity rather than inventing a language-model score. This intended live behavior is tested against provider stubs; it has not been verified with an issued Qloo key.

The adapter bounds calls and timeouts. Provider failures, unknown or duplicate returned IDs, conflicting identities, invalid affinity values, or empty results stop the action. The system does not replace failed live calls with sample rankings labelled as Qloo.

## Development challenges

**Keeping entity identity intact.** A typed query is not the reviewed entity name. The planner retains the entered query separately from the selected ID, name, and type. It rejects different local books mapping to the same Qloo UUID before insights. If a returned book name conflicts with the reviewed identity, the result is rejected instead of being relabelled as a different shelf book.

**Keeping the list actionable.** Availability, category, exclusions, and list-size constraints are applied to reviewed catalogue matches. The approval boundary prevents a replaced draft from becoming a saved list and makes pending exclusions visible before a replacement is generated.

**Keeping evidence across the whole workflow.** Search candidates, reviewed selections, request parameters, request IDs, and normalized returned entities are saved in their actual order, including results beyond the visible list limit. Refinement, approval, exports, and restart retain that evidence. Older live records lacking evidence are marked incomplete and cannot be approved or refined into a new live claim.

**Separating a useful demo from a real integration.** Tests prove that sample mode makes zero provider calls even with a configured credential. Other tests inject malformed responses, ambiguous mappings, and provider failures. These tests verify application behavior; they do not establish live Qloo access, coverage, or recommendation quality.

## Accomplishments and learning

The local product is complete enough to prepare, refine, approve, export, and reopen a reading list. The current automated suite contains 39 passing tests: 26 root application tests and 13 hosted capsule/workflow/quota/provider-stream regressions. They cover the actual HTTP workflow, restart persistence, reviewed identities, provider boundaries, provenance, exports, refinements, and recovery. UTF-8 favourites survive transport chunks, while malformed UTF-8 and malformed favourite rows are rejected before provider requests in both local and hosted routes. Both provider adapters enforce a 1,500,000-byte streamed-response cap, cancel oversized bodies before reading their remaining tail, and decode UTF-8 strictly. Injected tests cover split characters, a valid literal replacement character, the exact limit, sanitized stream failures and preserved hosted quota HTTP 429; they do not prove live Qloo use. The root checks also cover atomic replacement/approval conflicts during delayed refinements. Approved drafts cannot be refined; changes require a new list. Syntax checks pass.

The implementation demonstrates that agentic orchestration can be deterministic and still carry out a meaningful sequence of tools and decisions. It also shows why recommendation provenance needs the reviewed identity and actual returned order, not just a score next to a title.

## Limits and next steps

The catalogue, copy counts, sample favourites, and sample cultural tags are fictional demonstration data. There is no library-system connection or live patron data. Qloo's aggregate cultural affinities are not proof of an individual's preferences or identity. Entity editions, coverage, response details, and quotas need verification with the event-issued credential.

The local Node server uses loopback Host/Origin checks. A separate hosted Worker is deployed owner-private, with backend-signed review capsules, atomic draft-state changes, browser-local saved lists and conservative network/global quotas. Its actual cloud sample workflow passed resolution, planning, refinement, approval and stale/repeated-approval rejection. Public audience and an issued-key Qloo workflow remain pending; private sample execution does not satisfy the event's real Qloo use or public functional-demo gate. See [the deployment evidence](HOSTED_EVIDENCE.md).

Next steps are to obtain an attributable event key, verify a small live shelf end to end, retain redacted evidence, demonstrate Qloo's actual effect on the list, and publish the functional application and licensed source. Customer validation and a real inventory connector belong to later product work.

## Demo outline — optional 2 minutes 40 seconds

Video is optional for this event. The following local walkthrough can be recorded now, with sample mode clearly labelled. A later live recording must use actual Qloo responses.

| Time | Action to record |
| --- | --- |
| 0:00–0:20 | Introduce the available-stock problem and show the sample/synthetic status. |
| 0:20–0:40 | Search for Good Omens and show its zero-copy selection disabled. |
| 0:40–1:10 | Use Interstellar and David Bowie, review the favourite/book matches, and prepare a draft. |
| 1:10–1:40 | Explain the sample tag-fit evidence. Exclude a book, select Science fiction, refine, and show the honest short result set. |
| 1:40–2:10 | Approve the list and download CSV plus evidence JSON. Show entered queries separately from reviewed identities. |
| 2:10–2:40 | Reload or restart, reopen saved evidence, and explain the implemented live adapter and remaining Qloo/public-demo gates. |

For a later verified live demo, replace the sample resolution/ranking scene with the real reviewed candidates and insights response. Keep the key out of screenshots, narration, exports, and source.

## Fields and links to complete

| Material | Draft value or pending work |
| --- | --- |
| Project name and tagline | SecondShelf; draft above. |
| English product description | Draft above; review before pasting. |
| Built with | JavaScript, Node.js, HTML/CSS, deterministic orchestration, local JSON; Qloo search/Insights adapter implemented, live use pending. |
| Public licensed repository | https://github.com/Vcode2407/qloo-secondshelf; MIT license, lockfile, root and hosted source, setup and tests are available. |
| External functional demo | URL and reviewed public credential/quota handling pending. Local `http://127.0.0.1:4182` is not a public demo link. |
| Real Qloo access and runtime evidence | Event key, actual calls, reviewed entity/edition matches, coverage, quotas, and redacted provenance pending. |
| Judge access | Arrange free usable access through November 16, 2026, 11:45 pm EST / November 17, 10:15 am IST. |
| Screenshots or optional video | Local sample walkthrough available; final assets/links pending. |
| Original work and cross-entry clarification | Retain dated contribution history; clarify any reliance on earlier work rather than assume identical cross-entry permission. |
| Entrant/team eligibility and rights | Human verification pending. |
| Devpost project/submission URL | Pending; no submitted entry is claimed. |

Deadline: **October 30, 2026, 11:45 pm EDT / October 31, 9:15 am IST**. The remaining actual Qloo, public-demo and submission gates are tracked in [SUBMISSION.md](../SUBMISSION.md). See the [official rules](https://qloo.devpost.com/rules), [schedule](https://qloo.devpost.com/details/dates), and [event developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide) before final submission.
