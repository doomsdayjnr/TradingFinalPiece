# Downloads, Verification And Portal Isolation

Branch: `fix-downloads-verification-isolation`. Includes the previous video,
homepage navigation, signup confirmation and session fixes.

## Root Causes And Fixes

- XM registration used a same-tab anchor. It now opens a new tab with
  `noopener noreferrer`; analytics still records the click.
- Supabase contained `tfp-edge/mt4/tfp_edge.ex4` and
  `tfp-edge/mt5/tfp_edge.ex5`, but the app expects hyphens in the filenames.
  Both existing objects matched the recorded version 1.03 binary hashes.
  They were copied within the private bucket to the expected paths below;
  neither original was deleted or overwritten.
- Personal dashboard lists depended solely on RLS. Administrators are allowed
  to read all rows, so their personal portal also showed other users' accounts,
  demos, licenses, tokens and tickets. Each personal list now explicitly filters
  by the signed-in user's ID. The admin verification queue retains admin visibility.
- The verification queue's `profiles(...)` join was ambiguous because
  `broker_accounts` references profiles through both `user_id` and `verified_by`.
  Supabase returned `PGRST201`, which the page incorrectly displayed as an empty
  queue. The query now selects `profiles!broker_accounts_user_id_fkey(...)` and
  displays a load error rather than claiming no records when the query fails.
- Removed the requested storage-administration wording from the personal portal.
  A future storage failure now returns the user to the dashboard with a useful
  message, not raw storage paths or upload instructions.

## Repaired Storage Paths

Bucket: `ea-downloads` (still private).

| Object | Verified SHA-256 |
| --- | --- |
| `tfp-edge/mt4/tfp-edge.ex4` | `b866b1d111405346a55651bffa7122424de9ffbc168cd2e57d62f4160603d41e` |
| `tfp-edge/mt5/tfp-edge.ex5` | `df1ec54f749e028307e217216265df8a3003a4a7752cfac576288a6da6c215ff` |

No source code was uploaded. Future binary replacements should use these
canonical paths, or explicitly configure `EA_MT4_STORAGE_PATH` and
`EA_MT5_STORAGE_PATH` for different object names.

## Verification (2026-09-10)

- Production build and TypeScript validation passed.
- All eight `npm run test:downloads` tests passed: matching-platform/owner access,
  expired/revoked/wrong-platform denial, logged-out behavior, signing paths,
  and friendly database/storage errors.
- Headless Edge tested the local production build against the configured
  Supabase project with disposable User A, User B and admin accounts.
- XM opened in a separate tab while the homepage remained open; popup opener
  was null. The external landing page was intercepted for this navigation test.
- User A submitted a unique synthetic MT5 account and started both demo trials.
  Both actual portal download buttons returned bytes matching the hashes above.
- User B and the admin's personal portal showed none of A's account/token rows
  and received HTTP 403 when requesting downloads without their own entitlement.
- Using B's normal authenticated Supabase client, queries for A's broker accounts,
  demo licenses, entitlements and token displays returned no rows. This verifies
  these cross-user reads, not a comprehensive review of every RLS policy.
- The admin pending queue displayed A's synthetic account with A's name. Approval
  changed its status in A's portal and created a visible MT5 live token.
  This was a controlled application test, not verification of real XM affiliation.
- All disposable users, synthetic account/license records, test audit entries
  and associated funnel events were removed after the checks.

Deploy this branch for the UI/query changes. The storage path repair has already
been applied to the configured Supabase project. No migration or EA recompilation
is needed. This work verifies downloads and portal workflows, not MetaTrader
runtime trading/license enforcement or the remaining full acceptance checklist.
