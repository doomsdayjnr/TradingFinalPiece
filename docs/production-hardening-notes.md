# Production Hardening Notes

Implemented for Phase 10:

- Shared in-memory rate limiter for public analytics, EA downloads, and license validation.
- `Retry-After` response header for rate-limited download and license requests.
- Supabase indexes for admin queues, entitlement lookup, analytics, and support queues.
- Admin-only SQL helpers for monthly license log summaries and 90-day detailed-log deletion.
- Environment readiness endpoint at `/api/health`.
- Launch checklist covering Supabase, Vercel, portal flows, EA validation, and retention.

Known limitations for MVP:

- Rate limits are in-memory and reset per server instance. For heavier traffic, move limits to Redis, Upstash, or Supabase-backed counters.
- Anomaly alerts are surfaced as the admin analytics failure-rate indicator, not external email/SMS alerts.
- Backups should be configured in Supabase project settings according to the selected plan.
- File attachments currently accept a path/link field. Direct storage upload UI can be added after launch if needed.
