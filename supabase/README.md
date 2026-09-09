# Supabase Foundation

Phase 2 adds the local Supabase foundation for Trading Final Piece.

## Apply The Schema

Use the Supabase SQL editor or Supabase CLI to run:

```text
supabase/migrations/0001_initial_foundation.sql
supabase/migrations/0002_license_token_display.sql
supabase/migrations/0003_production_hardening.sql
```

The migration creates:

- Auth-linked `profiles`.
- Multi-broker-ready broker/account tables.
- Manual live-account verification statuses.
- 14-day demo license tables.
- License entitlement and license check logs.
- Strategy performance snapshots.
- Support tickets and messages.
- Admin audit logs.
- Funnel events.
- Monthly license log summaries.
- Private `ea-downloads` storage bucket.

## EA Storage Access Pattern

The `ea-downloads` bucket is private. Users should not read directly from the bucket.

For Phase 5, the app should:

1. Check whether the signed-in user has a matching active entitlement.
2. Use the server-side Supabase admin client.
3. Generate a short-lived signed URL for the correct `.ex4` or `.ex5` file.
4. Return that URL to the verified user.

This prevents a normal authenticated user from browsing or guessing EA storage paths.

Default Phase 5 storage paths:

```text
ea-downloads/tfp-edge/mt4/tfp-edge.ex4
ea-downloads/tfp-edge/mt5/tfp-edge.ex5
```

You can override the object paths with:

```text
EA_MT4_STORAGE_PATH=
EA_MT5_STORAGE_PATH=
```

## First Admin User

After creating the first admin account through Supabase Auth, promote it in SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

Replace `admin@example.com` with the real launch admin email.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values from Supabase:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## Log Retention

For launch, retention can be handled manually from the Supabase SQL editor:

```sql
select public.summarize_license_checks();
select public.delete_license_checks_older_than(90);
```

Run the summary before deleting detailed logs. Monthly summaries are stored in
`monthly_license_log_summaries`.
