# SecondShelf hosted demo

This is the Cloudflare Worker/Sites deployment of the original [SecondShelf project](https://github.com/Vcode2407/qloo-secondshelf). The local Node application remains available in the repository root. This deployment uses the same catalogue, planner, Qloo adapter and memory-store behavior, with reviewed state carried in backend-signed capsules instead of a shared JSON file.

The default sample mode uses authored synthetic tags. No issued Qloo key or live provider result is verified yet. The hosted demo must become public and pass the issued-key workflow before satisfying Qloo's submission gate.

## Local reproduction

Use Node 22 and the pinned `package-lock.json`:

```text
npm run install:ci
node --test test/*.test.js
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_curious_silver_samurai.sql
npm start -- --port 4192
```

The seven hosted tests cover capsule integrity/expiry, the reviewed sample workflow, HTTP input boundaries, malformed favourite values, strict UTF-8 handling, approval replay and shared quota protection. Invalid UTF-8 bytes and null/primitive/array favourites return HTTP 400 before provider dispatch; a valid literal Unicode replacement character is preserved.

After each build, create an ignored `dist/server/.dev.vars` beside the generated Wrangler configuration with `SECONDSHELF_STATE_SECRET` set to a unique random value of at least 32 characters. Only add `QLOO_API_KEY` when the event credential has been issued. Hosted values belong in the Sites secret manager; they are never in browser code, a manifest or source. Do not run `prepare-secondshelf.py` again without first restoring the four original core modules and frontend files; it is a one-time port script, not a build step. The owned local core was ported from public source commit `8c5c9fe`, with an in-memory store and preservation of quota errors in the hosted provider adapter.

## Public-demo boundaries

The page requires no patron identity. Approved lists, drafts, favourites and their provider evidence stay in the visitor's own browser storage; exports are downloaded locally. This does not reserve stock or contact anyone. Clear browser data to remove saved records; export before clearing it. Browser-local records can be edited locally and are not a cryptographic provider attestation.

Backend-signed match/draft capsules expire after 30 minutes. They contain the same evidence shown in the browser and are **signed, not encrypted**. They prevent invented offered entity IDs or altered provenance from entering the planner. D1 holds only random draft IDs, state/expiry, and quota counters; it does not store favourites, book lists, raw IP addresses, emails or visitor accounts. Atomic draft state changes block approving a superseded or previously approved draft, including concurrent requests. There is no custom OAuth or login system.

All mutable routes require bounded same-origin JSON. Sample mode makes zero Qloo calls. Live mode performs at most nine explicit searches per resolution and one Insights request per plan/refinement; it has no automatic retries or synthetic fallback. The public-demo policy reserves each dispatched provider attempt before its request: **200 Qloo calls globally/day and 24 per network/day**, plus **2,000 actions globally/day and 100 per network/day**. These are conservative application limits, not verified event quota. Counts are keyed by UTC date; network keys are a daily HMAC of the trusted Cloudflare IP header, never the raw address. If that header is unavailable all requests share the same conservative network allowance. Failed attempts retain their reservation. Old quota/draft metadata is pruned during actions. The event's actual quota and book coverage remain pending validation.

The native Sites authentication boundary protects the initially private deployment. Making the finished demo public requires the owner's explicit audience instruction; a private deployed URL does not satisfy Qloo's public-demo requirement.

MIT licensed. No sponsor access or completed entry is implied by a successful build/deployment.
