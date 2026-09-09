-- Phase 10 production hardening helpers.

alter table public.license_token_displays
add column if not exists last_viewed_at timestamptz;

create index if not exists broker_accounts_admin_search_idx
on public.broker_accounts(verification_status, platform, submitted_at desc);

create index if not exists license_entitlements_lookup_idx
on public.license_entitlements(license_token_hash, platform, kind, status);

create index if not exists funnel_events_created_at_idx
on public.funnel_events(created_at desc);

create index if not exists support_tickets_admin_queue_idx
on public.support_tickets(status, created_at desc);

create or replace function public.summarize_license_checks(target_month date default date_trunc('month', now() - interval '1 month')::date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_written integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can summarize license checks';
  end if;

  insert into public.monthly_license_log_summaries (
    month,
    result,
    platform,
    broker_name,
    total_checks,
    unique_accounts
  )
  select
    target_month,
    result,
    platform,
    broker_name,
    count(*)::integer,
    count(distinct account_number)::integer
  from public.license_checks
  where checked_at >= target_month
    and checked_at < (target_month + interval '1 month')
  group by result, platform, broker_name
  on conflict (month, result, platform, broker_name)
  do update set
    total_checks = excluded.total_checks,
    unique_accounts = excluded.unique_accounts;

  get diagnostics rows_written = row_count;
  return rows_written;
end;
$$;

create or replace function public.delete_license_checks_older_than(retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_deleted integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete license check logs';
  end if;

  delete from public.license_checks
  where checked_at < now() - make_interval(days => retention_days);

  get diagnostics rows_deleted = row_count;
  return rows_deleted;
end;
$$;
