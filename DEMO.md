# SecondShelf walkthrough

Use the running local application at `http://127.0.0.1:4182`. This script demonstrates sample behaviour, not a live Qloo integration.

1. Point to **Sample mode · no Qloo account connected**, the synthetic-evidence note and the public-submission gate. “This local tool works without an account, but these cultural signals are authored sample fixtures.”
2. Search the shelf for `Good Omens`. Show zero available copies and the disabled selection. Clear the filter. “Recommendations cannot come from unavailable stock.”
3. Press **Use the sample briefing**. It selects six available books and uses Interstellar plus David Bowie.
4. Press **Review entity matches**. Inspect favourites and catalogue titles; press **Accept displayed sample matches**. “Real Qloo mode requires each candidate to be selected individually.”
5. Press **Prepare reading draft**. Open **Evidence trail**. “These are synthetic tag-overlap calculations. The live adapter uses real search IDs and Qloo response order instead.”
6. Exclude the first recommendation, choose Science fiction and press **Refine this draft**. Show that the excluded book is absent and that a short result set is reported honestly rather than padded.
7. Press **Approve reading list**. Download the CSV. Show its `sample` evidence column and the approved-list card. “The librarian controls the final list. We have not reserved books or contacted anyone.”
8. Reload. The approved list persists.

For an unresolved-name check, change one favourite to `An Unknown Unpublished Film`, resolve again and show the missing match. Attempting to prepare a draft cannot invent an ID. Correct it to a supported sample favourite to recover.

For actual Qloo validation later: configure a privately issued event key, choose live mode, resolve a small shelf, review entity/edition matches, generate a draft and inspect the real request/result trail. Keep credentials out of recordings. Verify the published app works freely for judges through the judging period before describing it as a qualifying entry.
