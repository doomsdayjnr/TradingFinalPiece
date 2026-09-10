# Signup Confirmation And Demo Session Fix

## Verification (2026-09-10)

- Production build passed, including TypeScript validation.
- All 14 auth regression tests passed.
- A headless Edge browser tested the local production build against the
  configured Supabase project using a disposable, already-confirmed test user.
- Login, a background GET to `/logout`, dashboard refresh, MT4 and MT5 demo
  creation, visible matching tokens, duplicate-trial feedback, and explicit
  logout all passed. Exactly two demo records were created.
- The 390px mobile confirmation page had no horizontal overflow and was
  visually inspected; the browser reported no runtime errors.
- The disposable user, its associated trial data, and test funnel events were
  removed after the check. No email was sent by the browser test.
- Actual signup email delivery, its hosted redirect, and an expired-token
  browser round-trip remain to be retested after deployment/settings updates.

## Changes

- Signup without a session now shows `/register/check-email` instead of sending
  an unconfirmed user to the protected dashboard.
- Signup sets `emailRedirectTo` explicitly to the site's `/auth/callback` route.
  `NEXT_PUBLIC_SITE_URL` is the configured origin; production otherwise defaults
  to `https://trading-final-piece.vercel.app`.
- Callback exchange failures show login feedback. Successful exchanges go only
  to the dashboard; user-supplied external `next` URLs are ignored.
- Logout is an explicit server-action form on all five portal/admin headers.
  The legacy GET `/logout` no longer changes auth state. This eliminates session
  termination caused by a prefetch or other background GET.
- Next.js Proxy refreshes Supabase sessions before protected pages and actions,
  forwarding updated cookies to both downstream rendering and the browser.
- Signup/demo submit buttons show pending state; duplicate trial requests show
  useful feedback without signing the user out.

## Required Hosted Settings

Deploy branch `fix-auth-confirmation-demo-session` (or merge it into the branch
used for your Vercel production deployment). These changes do not require a new
EA build or database migration.

In Vercel, set this Config variable for Production and redeploy:

```text
NEXT_PUBLIC_SITE_URL=https://trading-final-piece.vercel.app
```

In Supabase, open Authentication > URL Configuration:

```text
Site URL:
https://trading-final-piece.vercel.app

Redirect URLs:
https://trading-final-piece.vercel.app/auth/callback
```

The default Confirm signup email template should use `{{ .ConfirmationURL }}`
as its link. If a custom template hardcodes localhost, correct that template
as well. Keep email confirmation enabled. Existing email links are not rewritten
by these settings; use a fresh registration for the confirmation-flow retest.
Already-confirmed users can simply log in again.

The localhost destination was reported by the tester. Project-level Supabase
URL settings cannot be changed through this repository, so confirm them in the
dashboard. Supabase documents the relationship between Site URL, allowed
redirects and email templates in [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Retest

1. Register a fresh test email; verify the Check Your Email screen appears.
2. Open the latest confirmation email in the same browser where registration
   occurred (the PKCE verifier is stored there). The link must return to Vercel.
3. Confirm the user reaches the dashboard or can log in after confirmation.
4. Leave the dashboard open, navigate to another portal page and back, then
   request MT4 demo access. The session must remain active and the token appear.
5. Request MT5 separately; check its own trial/token. Repeat a request and check
   that the existing trial is not reset and feedback appears on the dashboard.
6. Refresh/revisit the portal and verify the session remains active. Explicitly
   click Logout and verify protected routes then require sign-in.
7. For refresh-token testing, use an isolated short-lived test session and verify
   a subsequent page load and form action receive refreshed cookies.

`npm run test:auth` covers confirmation redirects, the read-only logout GET,
explicit logout, callback failures/open-redirect prevention, cookie propagation,
and MT4/MT5 demo actions using test doubles. Real email delivery and the hosted
confirmation round-trip still require the configured deployment and a test inbox.
