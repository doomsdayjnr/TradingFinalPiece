# Trading Final Piece EA Access Platform Plan

## Current Decision

Trading Final Piece has completed Phase 1 and now has the local Phase 2 Supabase foundation scaffolded.

The MVP is an EA access and licensing platform. It is not a copy-trading platform, signal service, managed trading service, education platform, or paid subscription product.

## Confirmed MVP Decisions

- Company/brand: Trading Final Piece.
- First broker: XM.
- Partner code: `R99D9`.
- Registration link: `https://affs.click/VJMdK`.
- Launch access model: free EA access.
- Live-account access rule: user must verify an XM MT4/MT5 account registered under partner code `R99D9`.
- Demo-account access rule: automatic 14-day demo license, no manual XM partner-code verification.
- Payment/subscription: none.
- Users: South Africa and international users.
- Product scope: EA access only.
- Support: ticket form inside the site only.
- Hosting: Vercel.
- Auth/database/storage: Supabase free tier.
- Admin users at launch: 1.
- Admin verification: one-by-one manual approval.
- Broker API/webhooks: not available from XM.
- Broker CSV export: available, but not required for MVP.
- Database schema: support multiple brokers from day one, but launch with XM only.
- Account submission fields: account number and platform type only.
- EA binaries: one shared compiled EA binary per platform.
- EA platforms: separate MT4 and MT5 EAs.
- EA source: existing source can be modified.
- Download rule: verified users only download the EA matching their verified account platform.
- Performance display: included in MVP using dynamic third-party integration and historical backtest data, with disclaimers.
- Failed license checks: logged, but no individual admin alerts.
- System-level license alerts: only for anomaly spikes, grace-period activation, or brute-force patterns.
- License log retention: detailed logs for 90 days, then monthly summary/archive up to 1 year.

## Product Boundary

The platform should say:

- Users must register their XM account using partner code `R99D9`.
- Live EA access is unlocked only for verified account numbers.
- Demo access is limited to a 14-day self-serve trial.
- Users remain responsible for their broker account, funds, risk settings, and trading decisions.
- Trading is high risk and losses are possible.
- Past performance is not indicative of future results.
- Trading Final Piece provides software tools only.

Important caution:

Although the platform is intended as software only, displaying performance claims adds regulatory and trust risk. Public wording must avoid guaranteed outcomes and should keep the risk disclaimer visible anywhere performance appears.

## MVP Public Pages

Phase 1 should include:

- Homepage.
- Login/register entry point.
- Basic FAQ section or page.
- Risk disclaimer section/component.
- Portal after login.

The first site does not need a separate education/course area, blog, payment page, or copy-trading dashboard.

## MVP User Flow

### Live Account Flow

1. User lands on the homepage.
2. User clicks the XM registration CTA.
3. User registers with XM using partner code `R99D9`.
4. User creates or logs into their Trading Final Piece account.
5. User submits XM account number and platform type: MT4 or MT5.
6. User accepts risk/EULA acknowledgement.
7. User sees `Pending verification`.
8. Admin checks the account manually in XM partner records.
9. Admin approves or rejects the account.
10. Approved user can download only the matching EA: `.ex4` for MT4 or `.ex5` for MT5.
11. EA validates the running account number against the license API.
12. EA runs only if the account is verified and licensed.

### Demo Flow

1. User creates or logs into their Trading Final Piece account.
2. User requests a demo license.
3. System generates a 14-day demo token automatically.
4. User downloads the MT4 or MT5 demo-compatible EA package.
5. EA runs on demo accounts during the active trial.
6. After 14 days, demo access expires and the user is prompted to verify a live XM account.

## Updated Build Phases

### Phase 0: Final Assets And Setup Inputs

Goal: Gather the few inputs needed to build Phase 1 cleanly.

Tasks:

- Add reference image for visual theme.
- Add logo and assets into the project asset folder.
- Confirm whether there are specific fonts or whether we should choose matching web fonts.
- Confirm final domain or temporary Vercel domain for WebRequest messaging.
- Confirm exact performance data source.
- Confirm exact historical backtest files/data to display.
- Confirm whether terms/privacy/EULA should be placeholders for MVP or supplied copy.

Deliverables:

- Asset folder ready.
- Phase 1 visual direction.
- Performance data source decision.

### Phase 1: Public Website And XM Funnel

Goal: Build the public-facing website and conversion path.

Tasks:

- Build homepage using supplied theme/assets.
- Add XM registration CTA: `https://affs.click/VJMdK`.
- Clearly display partner code: `R99D9`.
- Explain live-account verification.
- Explain 14-day demo license.
- Add login/register entry point.
- Add FAQ content.
- Add global `RiskDisclaimer` component.
- Add performance section only if data source is available.
- Use `StrategyCard` components for performance display.

`StrategyCard` should support:

```text
Strategy Name
Risk Level
Max Drawdown (%)
Profit Factor
Historical Monthly Avg (%)
Live Verification Status
```

Rules:

- No hardcoded profit guarantees.
- No copy-trading language.
- No signal-service language.
- No managed-account language.
- Risk disclaimer must appear on any page/section showing trading stats.

Deliverables:

- Responsive homepage.
- XM onboarding CTA.
- Demo trial CTA.
- Login/register route shell.
- FAQ and risk disclaimer.
- Strategy performance UI if data is ready.

### Phase 2: Supabase Foundation

Goal: Build the backend foundation for auth, account verification, licensing, downloads, support, and analytics.

Status: Local foundation created. The migration still needs to be applied to a live Supabase project.

Tasks:

- Configure Supabase Auth.
- Create multi-broker-ready schema.
- Enable Row Level Security.
- Add admin role support.
- Create private EA storage bucket.
- Add audit logging.
- Add license log retention structure.

Suggested tables:

```text
profiles
brokers
broker_accounts
demo_licenses
license_entitlements
license_checks
strategy_performance_snapshots
support_tickets
support_ticket_messages
admin_audit_logs
funnel_events
monthly_license_log_summaries
```

Suggested verification statuses:

```text
pending
verified
rejected
suspended
revoked
removed_by_user
```

Deliverables:

- Supabase schema.
- RLS policies.
- Admin role pattern.
- Private EA storage structure.

### Phase 3: User Portal

Goal: Let users manage live-account verification, demo access, downloads, and support.

Tasks:

- Build logged-in portal.
- Add profile area.
- Add live XM account submission form.
- Require platform type: MT4 or MT5.
- Allow multiple accounts per user.
- Prevent duplicate active account submissions.
- Allow users to remove submitted accounts themselves.
- Add 14-day demo license request flow.
- Show account/license statuses.
- Show matching EA download only when allowed.
- Add ticket creation form.

Portal states:

- No account submitted.
- Demo trial active.
- Demo trial expired.
- Live account pending verification.
- Live account verified.
- Live account rejected.
- Live account suspended/revoked.

Deliverables:

- User portal.
- Live account submission.
- Demo trial access.
- Matching-platform download UI.
- Ticket creation.

### Phase 4: Manual Admin Verification

Goal: Give the launch admin a controlled manual approval workflow.

Tasks:

- Build admin dashboard.
- Show pending live accounts.
- Search by account number, user email, broker, platform, and status.
- Approve accounts one by one.
- Reject accounts with reason.
- Suspend/revoke accounts.
- Add admin notes.
- Log every admin action.
- On approval, activate license entitlement for that exact account/platform.
- On rejection, show reason to the user.

Manual process:

1. Admin opens pending account in site admin.
2. Admin checks XM partner dashboard or exported data.
3. Admin confirms account is linked to partner code `R99D9`.
4. Admin approves account.
5. System unlocks the correct EA download and license API access.

Deliverables:

- Admin verification queue.
- One-by-one approval flow.
- Audit logs.

### Phase 5: EA Download Center

Goal: Securely serve the correct EA binary to the correct verified user.

Tasks:

- Upload protected MT4 `.ex4` binary to Supabase Storage.
- Upload protected MT5 `.ex5` binary to Supabase Storage.
- Keep `.mq4` and `.mq5` source files private.
- Generate short-lived signed download URLs.
- Show MT4 download only to users with verified MT4 access or active MT4 demo access.
- Show MT5 download only to users with verified MT5 access or active MT5 demo access.
- Add basic installation instructions.

Deliverables:

- Verified-only download center.
- Demo download access.
- Signed download route.

### Phase 6: License Validation API

Goal: Let the EA validate live and demo access at runtime.

Recommended endpoint:

```text
POST /api/v1/license/validate
```

EA should send:

```json
{
  "account_number": "12345678",
  "account_type": "live",
  "platform_type": "MT5",
  "broker_name": "XM",
  "ea_product": "trading-final-piece-ea",
  "ea_version": "1.0.0",
  "license_token": "user-or-installation-token"
}
```

API should return:

```json
{
  "allowed": true,
  "status": "active",
  "message": "License active",
  "grace_until": "2026-08-30T12:00:00Z"
}
```

Rules:

- Live account must be verified.
- Demo account must have an active 14-day demo license.
- Account must match platform type.
- License entitlement must be active.
- Request must include valid token/signature.
- Every check must be logged.
- Logs remain detailed for 90 days.
- Monthly summaries can be retained for up to 1 year.
- Individual failed checks do not alert admins.
- Threshold spikes or brute-force patterns should trigger system alerts later.

Deliverables:

- License API route.
- Live and demo license decisions.
- License check logging.
- Rate limiting.
- EA integration specification.

### Phase 7: EA License Integration

Goal: Modify the existing MT4 and MT5 EAs so they only run under valid live or demo licenses.

Tasks:

- Add startup license check.
- Detect MetaTrader account login number.
- Detect or pass platform type.
- Validate live and demo licenses.
- Add local grace-period cache.
- Add periodic re-check.
- Add pre-trade validation if practical.
- Add unauthorized message.
- Add WebRequest-disabled message.
- Add demo-expired message.
- Avoid closing existing trades just because the license API is briefly offline.

Unauthorized message:

```text
--------------------------------------------------
 UNAUTHORIZED ACCOUNT / LICENSE EXPIRED
--------------------------------------------------
 Account #[ACCOUNT_NUMBER] is not verified under our partner link.

 HOW TO UNLOCK THIS EA:
 1. Visit: https://your-domain.com/dashboard
 2. Register/Link your MT4 or MT5 account under our IB code.
 3. Submit Account #[ACCOUNT_NUMBER] on your dashboard.

 [ If WebRequest is disabled: Go to MT5 -> Tools -> Options ->
   Expert Advisors -> Check 'Allow WebRequest' & add your-domain.com ]
--------------------------------------------------
```

Message variations:

```text
Account Not Submitted:
Account #[ACCOUNT_NUMBER] was not found in our system. Please add this account ID to your user dashboard to activate.

Pending Approval:
Account #[ACCOUNT_NUMBER] is currently pending IB verification. Please allow up to 24 hours for partner approval.

Demo Trial Expired:
Your 14-day Demo trial for account #[ACCOUNT_NUMBER] has expired. Please open a verified Live account to unlock unlimited access.
```

Recommended behavior:

- First run for live account: must validate online.
- First run for demo account: must validate active demo token online.
- Previously validated account: allow a 48-hour grace period if API is down.
- Unknown, pending, rejected, expired, revoked, or suspended account: do not open new trades.
- API unavailable: do not close existing trades automatically.
- Different MetaTrader account number: deny access unless separately verified or covered by active demo license.

Deliverables:

- MT4 license check added.
- MT5 license check added.
- Clear EA user messages.
- Test results for live verified, live pending, live rejected, demo active, demo expired, unknown account, and API unavailable.

### Phase 8: Support Tickets

Goal: Provide support inside the portal without WhatsApp or external email setup.

Ticket fields:

```text
Category
Broker Name
Platform Type
MT4/MT5 Account ID
Account Type: Live / Real or Demo
Error Message / Code
Subject
Message / Description
Log / Screenshot Attachment
```

Ticket categories:

```text
License & Verification
MT4/MT5 EA Setup
Broker / IB Issue
Performance & Trading Query
Other
```

Ticket statuses:

```text
open
waiting_on_user
resolved
closed
```

Deliverables:

- User ticket form.
- User ticket history.
- Admin ticket dashboard.
- Ticket replies.
- Optional attachments.

### Phase 9: Funnel And Operational Analytics

Goal: Track the user journey inside the platform and spot drop-offs.

Track:

- Landing page CTA clicks.
- Demo license starts.
- Site signups.
- Live account submissions.
- Approvals/rejections.
- EA downloads by platform.
- Successful license validations.
- Failed license validations.
- Demo expiries.
- Users stuck before account submission.

Admin metrics:

- Total users.
- Active demo trials.
- Expired demo trials.
- Pending live accounts.
- Verified live accounts.
- Rejected live accounts.
- EA downloads by platform.
- License check status breakdown.
- Failure-rate spike indicator.

Deliverables:

- Internal funnel analytics.
- Admin metrics dashboard.

### Phase 10: Production Hardening

Goal: Prepare the platform for real users.

Tasks:

- Add rate limits to public APIs.
- Add brute-force detection for license endpoint.
- Add anomaly alert logic for high failed-license rates.
- Add grace-period activation tracking.
- Review RLS policies.
- Review admin access checks.
- Add Vercel environment variables.
- Add Supabase storage access review.
- Add backup/export process.
- Add log-retention job or documented manual retention process.
- Test desktop and mobile layouts.
- Test MT4 and MT5 license validation.
- Test demo trial expiry.

Deliverables:

- Production deployment on Vercel.
- Supabase production configuration.
- Launch checklist.

## Deferred / Not In MVP

These should not be built until approved later:

- Paid subscriptions.
- Payment providers.
- Copy trading.
- Managed trade execution.
- Signal dashboard.
- Broker password/investor-password storage.
- Education/course/LMS portal.
- Automated CSV import.
- Broker API integrations.
- Multiple live brokers in the UI.
- Bulk admin approval.
- Individual failed-license admin alerts.

## Remaining Questions

Only a few questions remain before Phase 1:

1. What is the exact performance data source for the dynamic third-party integration?
2. Do you already have the historical backtest data files, screenshots, or links?
3. What final domain should be used in the EA messages and WebRequest instructions, or should we use a placeholder until Vercel/domain setup?
4. Should terms/privacy/EULA pages use temporary placeholder copy in Phase 1, or will you supply final copy?
5. For the theme, will the reference image and assets be added before we start Phase 1?

## EA / Source Code Handling

We do not need the EA source code for Phase 1 through Phase 6.

We can build the website, portal, Supabase schema, admin verification, download center, demo licensing, and license API without seeing the `.mq4` or `.mq5` files.

We will need the EA source code only for Phase 7 if you want me to add the runtime license checks directly. If the EA developer will handle Phase 7, then I only need to provide the API contract and integration requirements.

If I modify the EAs directly later, I will need:

- MT4 `.mq4` source file.
- MT5 `.mq5` source file.
- Any included library files used by the EAs.
- Current EA version names.
- Expected compile process.
- Confirmation of which MetaTrader version/compiler is used.

Protected distribution rule:

- Keep source files private.
- Compile to `.ex4` and `.ex5`.
- Protect compiled files where possible.
- Upload only compiled binaries to Supabase Storage.

## Ready For Phase 1?

Yes, we are ready for Phase 1 once the theme reference image and asset folder are available.

Phase 1 can start with the homepage, XM funnel, demo-trial CTA, login/register route shell, FAQ, risk disclaimer, and performance-card UI shell. The performance data can be wired fully once the third-party source and backtest data are confirmed.
