# Project Testing Flow

This is the end-to-end acceptance test for the phase plan in
[`ea-partner-code-access-plan.md`](../ea-partner-code-access-plan.md).
Run sections in order. A successful build is not proof that authentication,
database permissions, downloads, or MetaTrader trading restrictions work.

Status at creation: **Not run**. This document defines tests; it does not certify
the application or the uploaded EA binaries. Record results in
[`testing-results.md`](testing-results.md).

## 1. Prepare The Test Run

Use a dedicated Supabase test project and Vercel preview deployment for expiry,
permission, outage, rate-limit, and retention tests. Do not change real customer
accounts or place real-money trades. Use MetaTrader demo terminals and a private
EA test harness that records attempted order creation for live-account scenarios.
Synthetic website account approvals test application logic, not actual XM linkage.

1. Record the branch, commit (`git rev-parse HEAD`), URL, date, tester, browser,
   Supabase project, and EA binary versions in the results file.
2. Use the latest testing branch, which includes the Phase 10 changes. Do not
   test an older `main` deployment by mistake.
3. Confirm migrations `0001_initial_foundation.sql`,
   `0002_license_token_display.sql`, and `0003_production_hardening.sql` have
   been applied in order. Do not rerun the initial migration over an existing schema.
4. Confirm environment variables from `.env.example` in the test environment,
   including storage paths and the intended site URL. Never record secret values.
5. Confirm Supabase Auth site/redirect URLs match the test deployment. Record
   whether email confirmation is enabled and use inboxes you control.
6. Confirm the `ea-downloads` bucket is private and contains both compiled files
   at the configured paths. Keep EA source private; this GitHub repo is public.
7. Prepare an admin, User A (live accounts only), User B (isolation tests), and
   User D (demo trials only), each in a separate browser profile. This prevents
   an active demo entitlement from hiding a broken live-access restriction.
8. Reserve unique synthetic account numbers for MT4 and MT5. Record their IDs
   after submission. Use separate records for rejection and removal tests.
9. Run `npm install` if dependencies are missing, then `npm run typecheck` and
   `npm run build`. Record actual outputs. Start locally with `npm run dev --
   --port 3000` if using localhost; choose another port if occupied.

| ID | Action | Expected result |
| --- | --- | --- |
| SET-01 | Open `/api/health`. | HTTP 200, `ok: true`, empty `missing` list. This checks environment presence only, not database connectivity. |
| SET-02 | Sign in and load the portal, admin queue, and a permitted download. | Real database, role, and storage operations work; no missing-table or policy errors. |
| SET-03 | Record the exact compiled binaries and their integration provenance. | Evidence shows both binaries include licensing checks. Otherwise mark the EA section Blocked. |

## 2. Public Website And Authentication (Phases 0-3)

| ID | Action | Expected result |
| --- | --- | --- |
| WEB-01 | Open `/` logged out; inspect navigation, images, FAQ, demo and registration links. | Assets load, links reach the intended pages, and browser console has no application errors. |
| WEB-02 | Click the XM CTA and inspect its destination. | Destination is `https://affs.click/VJMdK`; partner code `R99D9` is displayed accurately. Do not create unnecessary broker accounts. |
| WEB-03 | Read live verification, demo, risk, performance, and legal content. | 14-day trial and manual live verification are clear; no guaranteed returns. Performance has an identifiable source and disclaimer; placeholders are recorded as unfinished. |
| AUTH-01 | Register a fresh user with name, email, and password. | Exactly one Auth user and matching profile exist, with normal user role. Confirmation, when enabled, leads back to a working sign-in flow. |
| AUTH-02 | Try duplicate email, malformed email, missing fields, and a rejected password. | Understandable feedback; no duplicate profile, unintended session, or raw server crash. |
| AUTH-03 | Sign in with correct and incorrect credentials; refresh a protected page. | Correct credentials work; incorrect ones fail; valid session survives refresh. |
| AUTH-04 | Log out, then open `/dashboard`, a ticket URL, and all `/admin` routes directly. | Protected content is inaccessible. Browser back/refresh does not restore an authenticated session. |
| AUTH-05 | Let a test session expire, then submit a form. | Reauthentication is required; no unauthorized mutation or false success. |
| AUTH-06 | Inspect a new user's portal and profile details. | Correct identity; empty account, license, and ticket states; no other user's data. |

## 3. Live Accounts And Admin Verification (Phases 3-4)

Use User A without demo access. Keep User B separate throughout.

| ID | Action | Expected result |
| --- | --- | --- |
| LIVE-01 | Submit one MT4 and one MT5 XM account as A. | Both appear as pending with correct ownership/platform; no live tokens or download access yet. |
| LIVE-02 | Submit empty/invalid data and attempt submission without the required risk/EULA acknowledgement. | Invalid submissions are rejected server-side; required acknowledgement is enforced. Missing acknowledgement functionality is a failed requirement. |
| LIVE-03 | Resubmit the same active account as A, then as B; also double-click submit. | No duplicate active ownership or duplicate rows; useful error feedback. |
| LIVE-04 | Open `/admin` as admin and find each pending record. | Correct queue/status counts. Test account-number, email, broker, platform, and status search/filter requirements individually; record missing options. |
| LIVE-05 | Approve A's MT4 record after checking the test fixture. | Record becomes verified; matching active entitlement and visible token are created; MT4 unlocks and MT5 stays locked. |
| LIVE-06 | Approve A's MT5 record. | MT5 unlocks with its own token; MT4 remains valid. |
| LIVE-07 | Reject a separate pending account with a reason and admin-only note. | User sees rejection and reason, no access; private admin notes are not disclosed. |
| LIVE-08 | Suspend, then revoke an approved test account. | Account and entitlement reflect the change; new download requests and online validation deny access. |
| LIVE-09 | Remove an approved account as its owner. | Status becomes removed; its entitlement no longer grants download or API access. |
| LIVE-10 | Resubmit a removed account and approve the new submission. | New pending/approval cycle works; historical rows do not break validation or restore an old token. |
| LIVE-11 | Repeat an approval, including simultaneous requests; reapprove a suspended record if offered. | No duplicate usable licenses, partial success, or inconsistent portal state. Record token replacement behavior. |
| LIVE-12 | Try rejection of an already approved account if the UI/action permits it. | Either transition is rejected or all associated access is withdrawn consistently. |
| LIVE-13 | Inspect `admin_audit_logs` for each completed administrative change. | Actor, target, action, timestamp, and before/after values correspond to the action. No token secrets in audit evidence. |

## 4. Demo Trials And Downloads (Phases 3, 5)

Use D with no live entitlement. For expiry tests, in the test project's Table
Editor locate D's exact `demo_licenses` row and linked `license_entitlements`
row. Record original timestamps and set their `expires_at` just ahead of now.
Check before and after the boundary while status remains `active`, then test
explicit `expired` status. Never use a broad update against all users.

| ID | Action | Expected result |
| --- | --- | --- |
| DEMO-01 | Request an MT4 trial as D. | One trial, entitlement, and visible token; expiry is 14 days from creation; MT4 alone unlocks. |
| DEMO-02 | Request MT5, then repeat both requests and double-submit. | One trial per user/platform; each platform works independently; retries cannot extend the trial or orphan tokens. |
| DEMO-03 | Run the shortened expiry test, refresh, and validate/download again. | Access works before expiry and stops at/after expiry, even if stored status is still active. |
| DEMO-04 | Request another trial after expiry. | Trial cannot be reset for the same user/platform. |
| DL-01 | Download MT4 and MT5 when independently entitled. | Correct nonempty `.ex4`/`.ex5` file downloads and matches the intended released binary. Installation instructions are accessible. |
| DL-02 | Open `/api/downloads/ea?platform=MT4` and `MT5` as B, then logged out. | B gets HTTP 403 without entitlement; logged-out requests redirect to login. |
| DL-03 | Omit platform or send `MT6`. | HTTP 400; no file URL. |
| DL-04 | Request the opposite platform using an MT4-only or MT5-only user. | HTTP 403 even when typing the endpoint directly. |
| DL-05 | Capture a signed URL privately and retry it after more than five minutes with cache disabled. | It works initially and expires afterward. Treat it as a bearer link: logout/revocation does not invalidate a previously issued URL immediately. |
| DL-06 | Try listing the bucket or opening its unsigned object URL as anonymous and normal user. | Private files cannot be listed/downloaded directly; source files are absent. |
| DL-07 | Temporarily configure a nonexistent binary path in the test deployment, then restore it. | Clear unavailable-file response; no broken success or secret exposure. |

## 5. License API (Phase 6)

Use `POST /api/v1/license/validate`. This PowerShell example prompts for a token
without placing the literal token in command history. Do not share payloads or
screenshots containing tokens. Use the active test account's actual number and
platform. Change one field at a time for negative tests.

```powershell
$testBaseUrl = 'http://localhost:3000'
$testToken = Read-Host 'Test license token' -AsSecureString
$testCredential = New-Object System.Net.NetworkCredential('', $testToken)
try {
    $testPayload = @{
        account_number = 'REPLACE_WITH_TEST_ACCOUNT'
        account_type = 'live'
        platform_type = 'MT5'
        broker_name = 'XM'
        ea_product = 'tfp-edge'
        ea_version = '1.0.0'
        license_token = $testCredential.Password
    }
    Invoke-RestMethod -Method Post -Uri "$testBaseUrl/api/v1/license/validate" -ContentType 'application/json' -Body ($testPayload | ConvertTo-Json)
} finally {
    Remove-Variable testPayload, testCredential, testToken -ErrorAction SilentlyContinue
}
```

For HTTP error cases, use an API client to record both HTTP code and JSON body.
Business denials currently return HTTP 200 with `allowed: false`; HTTP 200 alone
must never be treated as a successful license check.

| ID | Input/state | Expected result |
| --- | --- | --- |
| API-01 | Verified live account with its active matching token; repeat on MT4 and MT5. | `allowed: true`, `status: active`, future `grace_until`; `last_validated_at` updates. |
| API-02 | Live account pending, rejected, suspended, revoked, or removed. | `allowed: false` for every state; appropriate status/message. |
| API-03 | Unknown account number. | `allowed: false`, `status: not_found`. |
| API-04 | Valid account with random token, another user's token, or demo token sent as live. | Denied; no cross-account access. |
| API-05 | Live token with wrong platform or broker. | Denied with platform/broker mismatch. |
| API-06 | Active demo token on matching platform and a demo account. | Allowed; wrong platform and expired/suspended/revoked trial denied. |
| API-07 | Expire each linked demo row separately, then both. | Neither an expired trial nor an expired entitlement grants access; inconsistencies do not bypass expiry. |
| API-08 | Set a test live entitlement's expiry in the past while keeping status active. | Denied; compare with download behavior. Record any disagreement as a defect. |
| API-09 | Missing required fields, invalid type/platform, malformed JSON, JSON `null`, arrays, numeric account number. | HTTP 400 with controlled denial; no uncaught 500 or granted access. |
| API-10 | Set `account_type` to `real`; use lowercase platform. | Supported normalization works for a valid live license. |
| API-11 | Send an unsupported `ea_product`. | Record whether product binding is enforced. Acceptance requires either rejection or an explicitly approved single-product limitation. |
| API-12 | Inspect logs after valid, denied, malformed, and throttled requests. | Check which attempts reach `license_checks` and analytics. Compare with the plan's every-check logging requirement; no raw token is logged. |
| API-13 | Make the database unavailable in the isolated test environment; restore and retry. | Controlled failure never grants access; recovery works. |

## 6. Actual MT4 And MT5 EAs (Phase 7)

Run every row separately on MT4 and MT5 and record terminal/compiler versions,
binary hash, Journal/Experts evidence, and attempted new orders. The repository
currently provides `.mqh` helpers and integration instructions, not integrated
EA source or compile results. Uploaded binaries alone do not establish that
licensing is enforced. Mark blocked tests explicitly until integration is proven.

Use real terminal operation for WebRequest checks. For expiry/outage timing use
a private test harness or controlled clock; do not wait 48 hours or alter the
production API. Capture attempted orders without executing live trades.

| ID | Action | Expected result |
| --- | --- | --- |
| EA-01 | Integrate helpers privately, compile both EAs, install the exact downloadable binaries. | Compilation succeeds and startup, periodic, and pre-trade checks are connected to all order-entry paths. |
| EA-02 | First launch with verified live fixture or active demo token, matching actual account and platform. | Online check succeeds before new orders are permitted. |
| EA-03 | First launch without token, with invalid token, or while API is unreachable. | No new trades; useful message. |
| EA-04 | Disable WebRequest, then enable it and allow the test domain. | Clear setup message; validation works after configuration is corrected. |
| EA-05 | Test pending/rejected/suspended/revoked/unknown accounts and expired demos. | No new trades; correct denial explanation. |
| EA-06 | After success, suspend/revoke online and force the next check. | Explicit denial clears permission; cached success/grace does not override it. Record normal recheck latency (helper currently uses one hour). |
| EA-07 | After success, test network failure and HTTP 500/503 separately, before and after grace expires. | Previously validated identity can use bounded 48-hour outage grace; after it ends no new trades. First-run failure never grants grace. |
| EA-08 | Restart terminal during an outage after prior success; test timezone differences. | Cache behavior matches the required local grace policy; UTC expiry is interpreted correctly and cannot be extended by restart. |
| EA-09 | Change terminal account, token, broker, or platform while permission is cached. | Old live permission cannot authorize the new identity. Demo permission remains restricted to actual demo accounts. |
| EA-10 | On an actual live-account harness, set the editable account-type input to demo and use a demo token. | No live access through demo licensing; actual terminal account mode governs eligibility. |
| EA-11 | Let demo expiry occur during outage grace, including near the 14-day boundary. | Trial expiry is not extended by grace. |
| EA-12 | Keep existing positions open in a demo terminal while API fails or license is denied. | Licensing does not force-close positions; protective management continues, while unauthorized new entries stop. |
| EA-13 | Test a large MT5 account login and repeated failures with no incoming ticks. | Full account number is preserved; grace/retry timing remains bounded; alerts do not flood continuously. |

## 7. Support Tickets (Phase 8)

| ID | Action | Expected result |
| --- | --- | --- |
| SUP-01 | Create tickets covering each available category and optional broker/platform/account/error fields. | Correct details and initial message appear in user history and admin queue. |
| SUP-02 | Submit missing required fields and long text, quotes, and HTML-like content. | Validation is clear; text displays safely without executing markup or breaking layout. |
| SUP-03 | Admin replies with `waiting_on_user`; user replies. | Messages have correct author/order; user reply returns ticket to `open`. |
| SUP-04 | Admin marks resolved, then closed; user closes an owned ticket and attempts another reply. | Status persists; closed tickets reject user replies; no false-success notification. |
| SUP-05 | Add an attachment path/link to a reply and inspect it from both roles. | Value persists and is usable as supported. Current UI is a path/link field, not a file uploader; record that limitation. |
| SUP-06 | Open a nonexistent ticket and another user's ticket as B; attempt reply/close with its ID. | No private content exposed and no unauthorized change. |

## 8. Permissions And Abuse Resistance (Phases 2, 10)

Run these through Supabase using the anonymous key plus each test user's own
session JWT, not the service-role key or privileged SQL editor: elevated access
bypasses RLS and cannot prove user isolation. Use a private API client and confirm
database state after writes; zero-row updates can still return HTTP success.

| ID | Action | Expected result |
| --- | --- | --- |
| SEC-01 | As B/anonymous, read A's profile, accounts, demos, entitlements, tokens, checks, tickets, and messages by known ID. | Other-user records are inaccessible; public broker/performance data remains readable where intended. |
| SEC-02 | As B, update own `profiles.role` to admin or set another owner ID. | Privilege escalation denied; role stays user. |
| SEC-03 | As B, insert/update verified accounts, entitlements, token displays, audit records, or another user's data directly. | Unauthorized changes denied even when bypassing website forms. |
| SEC-04 | As B, invoke admin account/ticket actions and retention RPCs directly. | Server-side role checks deny actions; no state change. |
| SEC-05 | Inspect browser bundles, responses, console, and test evidence. | No service-role key, unrelated raw license token, or sensitive server diagnostics. Own token is intentionally visible in the portal. |
| SEC-06 | Locally send 61 license requests for the same IP/account within one minute; then retry after reset. | HTTP 429 with `Retry-After`, then recovery. Keep volume bounded. |
| SEC-07 | Locally send 31 download requests and 121 analytics requests within a minute. | Limits trigger and recover; downloads include `Retry-After`. |
| SEC-08 | Review repeated invalid-token attempts with changing account numbers and multiple server instances. | Record coverage gaps: current limiter is in-memory and keyed per IP/account for licensing; it does not prove distributed brute-force protection. |

## 9. Analytics And Operations (Phases 9-10)

Record baseline counts before controlled actions and compare deltas afterward.
Download analytics count signed-link starts, not confirmed file completion.

| ID | Action | Expected result |
| --- | --- | --- |
| OPS-01 | Click each public CTA once; register, start demo, submit/approve/reject account, download each platform, validate and create ticket. | Corresponding events persist with correct user/platform; unrelated actions do not create duplicate events. |
| OPS-02 | Compare `/admin/analytics` against test database counts. | Users, active/expired demos, account states, platform download starts, open tickets, and 30-day license results reconcile. |
| OPS-03 | Generate at least 10 failed checks and a failure rate of at least 25% in the test dataset. | Failure indicator activates; no individual-failure email/SMS is expected. |
| OPS-04 | Check demo-expiry journey, users with no submission, and grace activation reporting against the plan. | Required signals are observable; absent event/metric/tracking is recorded as a gap, not assumed implemented. |
| OPS-05 | POST invalid JSON and an unapproved event name to `/api/analytics/track`. | HTTP 400; arbitrary event injection through this route rejected. |
| OPS-06 | Seed test logs older than 90 days and within 90 days; summarize every affected old month as an authenticated admin. | Monthly totals match detailed records; rerunning summaries does not double-count, including null grouping values. |
| OPS-07 | Back up the test data, then invoke `delete_license_checks_older_than(90)` as admin. | Only records older than cutoff disappear; summaries and newer logs remain. Never delete before verifying all affected monthly summaries. |
| OPS-08 | Try retention as normal user; inspect the documented SQL-editor workflow and one-year summary policy. | User is denied. Privileged SQL alone may lack an authenticated admin identity; record that workflow gap. Summary cleanup beyond one year must have an owned process. |
| OPS-09 | Export test database and storage inventory, then restore into a separate test project. | Restore succeeds and sample profile/account/ticket data and binary availability reconcile. Backup ownership and cadence are recorded. |
| OPS-10 | Repeat login/callback, authorized and denied downloads, API validation, and admin access on the intended Vercel deployment. | HTTPS, redirects, environment, database, storage, and EA WebRequest domain work together. |

## 10. Desktop, Mobile, And Final Retest

| ID | Action | Expected result |
| --- | --- | --- |
| UI-01 | Test 360px and 390px mobile, 768px tablet, and 1440px desktop widths. | Homepage, auth, portal, admin queue, tickets, and analytics fit without overlapping text or inaccessible controls. |
| UI-02 | Use long tokens, account IDs, names, errors, and ticket messages; zoom to 200%. | Content wraps or scrolls intentionally; important controls remain reachable. |
| UI-03 | Navigate forms with keyboard only and inspect focus, labels, errors, and status distinctions. | Visible focus, usable labels, readable feedback; status is not conveyed solely by color. |
| UI-04 | Repeat core journey in Edge/Chrome and a mobile browser; test refresh, back, slow requests, and double clicks. | Consistent behavior without duplicate mutations or misleading success. |

After each fix, rerun the failed case and its related journey. For changes to
authentication/RLS, rerun permission cases; for licenses, rerun downloads, API,
expiry, revocation, and both terminal cases.

## Release Decision

Use Pass, Fail, Blocked, or Not run for every case. Repeat platform-dependent
cases with separate MT4 and MT5 results. A missing feature is Fail; a missing
environment or integrated binary is Blocked. Neither counts as Pass.

Release requires all core journeys and permission/license enforcement cases to
pass, no unresolved access bypass or data exposure, verified integrated EA
binaries, and completed deployment/restore checks. Cosmetic defects may be
accepted explicitly with an owner. Record tester and project-owner sign-off.

Known areas requiring particular attention from source inspection are Phase 7
integration, acknowledgement enforcement, admin search coverage, approval retry
consistency, live expiry, demo grace boundaries, direct RLS privilege changes,
retention execution, and the analytics signals listed in OPS-04. These are test
targets, not claims that runtime testing has already been completed.

Archive redacted evidence and final results. Remove only the specifically
recorded test fixtures after sign-off; restore any temporary paths/settings.
