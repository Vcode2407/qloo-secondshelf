# Qloo submission checklist

**Current state: working local sample planner, implemented Qloo adapter, [public MIT repository](https://github.com/Vcode2407/qloo-secondshelf), and a successfully deployed owner-private [hosted demo](https://secondshelf-library.viku355.chatgpt.site). The approved API-key request was received on October 10, 2026. No issued key, verified live Qloo call, public audience or submitted entry yet.**

Deadline: **October 31, 2026, 9:15 am IST** (October 30, 11:45 pm EDT). [Official schedule](https://qloo.devpost.com/details/dates)

Published source checkpoint reviewed October 11: `d1a20d8c24e5e6e8fdf1a082bfd5f82f65628f65`; [successful exact-head CI](https://github.com/Vcode2407/qloo-secondshelf/actions/runs/38157794507) runs 39 distinct native/hosted tests on Ubuntu and Windows, plus the repeated 13-test hosted subset and Worker build. The [latest deployment proof](docs/HOSTED_STREAM_SAFETY_DEPLOYMENT.json) covers 13 actual owner-private cloud sample/input-validation requests with Qloo unconfigured. This is source/sample evidence, not live Qloo qualification.

- [x] Original, working software with inventory constraints, review, refinements, approval and export.
- [x] Clearly labelled synthetic sample data; no fabricated Qloo scores.
- [x] Real Qloo search/Insights adapter with reviewed IDs, provenance and recoverable errors.
- [x] Backend-only credential handling and bounded explicit calls.
- [x] Native and hosted streamed-response byte caps, early cancellation and strict UTF-8 handling; 39 local/injected regressions pass. These checks do not verify live Qloo access.
- [x] MIT license, reproducible setup, lockfile, demo walkthrough and meaningful tests.
- [x] Submit the event API-key request with participant-approved use agreement and rules; receipt confirmed October 10, 2026.
- [x] Deploy the reviewed hosted Worker with signed review capsules, atomic draft-state transitions, credential-free browser assets and conservative action/provider quotas. Repaired native deployment succeeded October 11; audience remains owner-private. [Actual private cloud sample workflow](docs/HOSTED_EVIDENCE.md) passed, including superseded/repeated-approval rejection.
- [ ] Receive an event-issued, individually attributable Qloo credential.
- [ ] Verify real API response shapes, book coverage and quotas end to end using that key.
- [ ] Demonstrate that Qloo materially changes the available-stock reading list, beyond what a generic language model could invent.
- [ ] Verify entrant majority age, residency, sponsor/judge conflicts and required rights. India is not specifically named among exclusions; this does not establish personal eligibility.
- [ ] Clarify any reliance on pre-existing work or cross-event reuse; keep dated original commit history and a clear contribution description.
- [ ] Publish a fully hosted external functional demo with reviewed credential/quota handling and verified usable judge access. The [Overview's external-hosting requirement](https://qloo.devpost.com/) excludes local-only/private-access entries, while [Rules section 4, Testing](https://qloo.devpost.com/rules) provides for private websites with login credentials. This discrepancy does not establish that the current owner-only Site qualifies: public publication and signed-out workflow verification remain pending; a private-login alternative needs organizer clarification.
- [x] Publish all source/assets/setup steps with a visible MIT license: https://github.com/Vcode2407/qloo-secondshelf.
- [x] Prepare the [English product description](docs/DESCRIPTION.md): library audience, inventory problem, reviewed resolution → available-book affinity workflow, actual Qloo role and disclosed limitations. Update the live evidence after the issued key is verified.
- [ ] Supply free, usable judge access through the end of judging: November 16, 2026, 11:45 pm EST (November 17, 10:15 am IST).
- [ ] Enter and verify all required Devpost fields before the deadline. Registration or a draft is not a submitted entry.

Video is **not required** by this event; a concise demo or screenshots can still help explain the workflow. [Official requirements](https://qloo.devpost.com/)

For technical evidence, include redacted request parameters, reviewed entity IDs, actual responses, setup steps and known limitations. The sponsor starter recommends reproducible provenance and clear product context. [Starter submission guidance](https://github.com/qloo/qloo-hackathon-kit/blob/main/docs/SUBMISSION.md)
