# Production Launch Checklist

For the ordered acceptance tests, expected results, and release criteria, use
[Project Testing Flow](project-testing-flow.md) and record evidence in
[Testing Results](testing-results.md). The short checklist below does not replace
the full test run or verification of the integrated MT4/MT5 binaries.

## Supabase

- Apply migrations in order:
  - `0001_initial_foundation.sql`
  - `0002_license_token_display.sql`
  - `0003_production_hardening.sql`
- Confirm `ea-downloads` bucket is private.
- Confirm compiled files exist:
  - `tfp-edge/mt4/tfp-edge.ex4`
  - `tfp-edge/mt5/tfp-edge.ex5`
- Confirm first admin profile has `role = 'admin'`.
- Review RLS policies for profiles, broker accounts, entitlements, tickets, logs, and token displays.

## Vercel Environment

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EA_MT4_STORAGE_PATH`
- `EA_MT5_STORAGE_PATH`

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Functional Test Pass

- Register a new user.
- Login/logout.
- Request MT4 demo license.
- Request MT5 demo license.
- Confirm EA token appears in dashboard.
- Download MT4 with demo access.
- Download MT5 with demo access.
- Submit live XM MT4 account.
- Submit live XM MT5 account.
- Approve live account from `/admin`.
- Reject a live account with visible reason.
- Suspend/revoke a live account and confirm entitlement status changes.
- Create support ticket.
- Reply as user.
- Reply as admin.
- Update support ticket status.
- Validate license API with:
  - live verified
  - live pending
  - live rejected
  - live suspended
  - demo active
  - demo expired
  - unknown account
  - invalid token
  - wrong platform

## Operational Checks

- Visit `/api/health` and confirm `ok: true`.
- Visit `/admin/analytics`.
- Confirm funnel events appear after CTA clicks and portal actions.
- Confirm license checks appear after API validation calls.
- Watch failure rate indicator during testing.
- Run monthly retention manually until a scheduled job is added:

```sql
select public.summarize_license_checks();
select public.delete_license_checks_older_than(90);
```

## EA Deployment

- Replace `https://your-domain.com` in EA settings/docs with production domain.
- Add production domain to MetaTrader WebRequest allowed URLs.
- Compile `.mq4` to `.ex4`.
- Compile `.mq5` to `.ex5`.
- Upload compiled files only.
- Keep source files private.
