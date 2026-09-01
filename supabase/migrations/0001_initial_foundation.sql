-- Trading Final Piece Phase 2 Supabase foundation.
-- Run this in the Supabase SQL editor or via the Supabase CLI.

create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'admin');
create type public.platform_type as enum ('MT4', 'MT5');
create type public.broker_account_kind as enum ('live', 'demo');
create type public.verification_status as enum (
  'pending',
  'verified',
  'rejected',
  'suspended',
  'revoked',
  'removed_by_user'
);
create type public.license_status as enum ('active', 'inactive', 'expired', 'suspended', 'revoked');
create type public.license_kind as enum ('live', 'demo');
create type public.license_check_result as enum (
  'allowed',
  'denied_unknown_account',
  'denied_pending',
  'denied_rejected',
  'denied_suspended',
  'denied_revoked',
  'denied_expired',
  'denied_platform_mismatch',
  'denied_invalid_token',
  'grace_allowed',
  'server_error'
);
create type public.support_ticket_category as enum (
  'license_verification',
  'mt4_mt5_setup',
  'broker_ib_issue',
  'performance_trading_query',
  'other'
);
create type public.support_ticket_status as enum ('open', 'waiting_on_user', 'resolved', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  launch_partner_code text,
  registration_url text,
  created_at timestamptz not null default now()
);

create table public.broker_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  broker_id uuid not null references public.brokers(id),
  account_number text not null,
  platform public.platform_type not null,
  account_kind public.broker_account_kind not null default 'live',
  account_type_label text,
  verification_status public.verification_status not null default 'pending',
  verification_method text not null default 'manual_admin',
  rejection_reason text,
  admin_notes text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  rejected_at timestamptz,
  removed_at timestamptz,
  verified_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint broker_accounts_account_number_not_blank check (length(trim(account_number)) > 0)
);

create table public.demo_licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform public.platform_type not null,
  license_token_hash text not null unique,
  status public.license_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint demo_licenses_valid_dates check (expires_at > starts_at),
  constraint demo_licenses_one_trial_per_user_platform unique (user_id, platform)
);

create table public.license_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  broker_account_id uuid references public.broker_accounts(id) on delete cascade,
  demo_license_id uuid references public.demo_licenses(id) on delete cascade,
  kind public.license_kind not null,
  platform public.platform_type not null,
  ea_product text not null default 'tfp-edge',
  ea_version text,
  status public.license_status not null default 'active',
  license_token_hash text not null unique,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint license_entitlements_one_source check (
    (kind = 'live' and broker_account_id is not null and demo_license_id is null)
    or
    (kind = 'demo' and demo_license_id is not null and broker_account_id is null)
  )
);

create table public.license_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  broker_account_id uuid references public.broker_accounts(id) on delete set null,
  demo_license_id uuid references public.demo_licenses(id) on delete set null,
  license_entitlement_id uuid references public.license_entitlements(id) on delete set null,
  account_number text,
  account_kind public.broker_account_kind,
  platform public.platform_type,
  broker_name text,
  ea_product text,
  ea_version text,
  result public.license_check_result not null,
  message text,
  request_ip inet,
  user_agent text,
  checked_at timestamptz not null default now()
);

create table public.strategy_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  strategy_name text not null,
  risk_level text not null,
  max_drawdown numeric(8, 3),
  profit_factor numeric(10, 3),
  historical_monthly_avg numeric(8, 3),
  live_verification_status text not null default 'integration_pending',
  source_name text,
  source_url text,
  snapshot_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category public.support_ticket_category not null,
  broker_id uuid references public.brokers(id),
  broker_account_id uuid references public.broker_accounts(id),
  platform public.platform_type,
  account_kind public.broker_account_kind,
  account_number text,
  error_code text,
  subject text not null,
  description text not null,
  status public.support_ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  attachment_path text,
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  session_id text,
  created_at timestamptz not null default now()
);

create table public.monthly_license_log_summaries (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  result public.license_check_result not null,
  platform public.platform_type,
  broker_name text,
  total_checks integer not null default 0,
  unique_accounts integer not null default 0,
  created_at timestamptz not null default now(),
  unique (month, result, platform, broker_name)
);

create index broker_accounts_user_id_idx on public.broker_accounts(user_id);
create index broker_accounts_status_idx on public.broker_accounts(verification_status);
create index broker_accounts_lookup_idx on public.broker_accounts(account_number, platform, account_kind);
create unique index broker_accounts_unique_active_submission_idx
on public.broker_accounts(broker_id, account_number, platform, account_kind)
where verification_status <> 'removed_by_user';
create index demo_licenses_user_id_idx on public.demo_licenses(user_id);
create index license_entitlements_user_id_idx on public.license_entitlements(user_id);
create index license_checks_checked_at_idx on public.license_checks(checked_at);
create index license_checks_result_idx on public.license_checks(result);
create index support_tickets_user_id_idx on public.support_tickets(user_id);
create index support_tickets_status_idx on public.support_tickets(status);
create index funnel_events_event_name_idx on public.funnel_events(event_name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger broker_accounts_set_updated_at
before update on public.broker_accounts
for each row execute function public.set_updated_at();

create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.create_admin_audit_log(
  action text,
  target_table text,
  target_id uuid,
  previous_data jsonb default null,
  new_data jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create admin audit logs';
  end if;

  insert into public.admin_audit_logs (admin_id, action, target_table, target_id, previous_data, new_data)
  values (auth.uid(), action, target_table, target_id, previous_data, new_data)
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.remove_own_broker_account(account_id uuid)
returns public.broker_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_account public.broker_accounts;
begin
  update public.broker_accounts
  set
    verification_status = 'removed_by_user',
    removed_at = now(),
    updated_at = now()
  where id = account_id
    and user_id = auth.uid()
  returning * into updated_account;

  if updated_account.id is null then
    raise exception 'Broker account not found or not owned by current user';
  end if;

  return updated_account;
end;
$$;

alter table public.profiles enable row level security;
alter table public.brokers enable row level security;
alter table public.broker_accounts enable row level security;
alter table public.demo_licenses enable row level security;
alter table public.license_entitlements enable row level security;
alter table public.license_checks enable row level security;
alter table public.strategy_performance_snapshots enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.funnel_events enable row level security;
alter table public.monthly_license_log_summaries enable row level security;

create policy "Users can read own profile" on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy "Users can update own profile details" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid() and role = 'user');

create policy "Admins can manage profiles" on public.profiles
for all using (public.is_admin()) with check (public.is_admin());

create policy "Anyone can read active brokers" on public.brokers
for select using (is_active = true or public.is_admin());

create policy "Admins can manage brokers" on public.brokers
for all using (public.is_admin()) with check (public.is_admin());

create policy "Users can read own broker accounts" on public.broker_accounts
for select using (user_id = auth.uid() or public.is_admin());

create policy "Users can submit own broker accounts" on public.broker_accounts
for insert with check (
  user_id = auth.uid()
  and verification_status = 'pending'
  and account_kind = 'live'
);

create policy "Admins can manage broker accounts" on public.broker_accounts
for all using (public.is_admin()) with check (public.is_admin());

create policy "Users can read own demo licenses" on public.demo_licenses
for select using (user_id = auth.uid() or public.is_admin());

create policy "Admins can manage demo licenses" on public.demo_licenses
for all using (public.is_admin()) with check (public.is_admin());

create policy "Users can read own license entitlements" on public.license_entitlements
for select using (user_id = auth.uid() or public.is_admin());

create policy "Admins can manage license entitlements" on public.license_entitlements
for all using (public.is_admin()) with check (public.is_admin());

create policy "Users can read own license checks" on public.license_checks
for select using (user_id = auth.uid() or public.is_admin());

create policy "Admins can manage license checks" on public.license_checks
for all using (public.is_admin()) with check (public.is_admin());

create policy "Anyone can read strategy performance snapshots" on public.strategy_performance_snapshots
for select using (true);

create policy "Admins can manage strategy performance snapshots" on public.strategy_performance_snapshots
for all using (public.is_admin()) with check (public.is_admin());

create policy "Users can read own support tickets" on public.support_tickets
for select using (user_id = auth.uid() or public.is_admin());

create policy "Users can create own support tickets" on public.support_tickets
for insert with check (user_id = auth.uid());

create policy "Users can update own open support tickets" on public.support_tickets
for update using (user_id = auth.uid() and status in ('open', 'waiting_on_user'))
with check (user_id = auth.uid());

create policy "Admins can manage support tickets" on public.support_tickets
for all using (public.is_admin()) with check (public.is_admin());

create policy "Users can read messages for own tickets" on public.support_ticket_messages
for select using (
  public.is_admin()
  or exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_ticket_messages.ticket_id
      and support_tickets.user_id = auth.uid()
  )
);

create policy "Users can create messages for own tickets" on public.support_ticket_messages
for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_ticket_messages.ticket_id
      and support_tickets.user_id = auth.uid()
  )
);

create policy "Admins can manage support ticket messages" on public.support_ticket_messages
for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins can read admin audit logs" on public.admin_audit_logs
for select using (public.is_admin());

create policy "Users can create funnel events" on public.funnel_events
for insert with check (user_id is null or user_id = auth.uid());

create policy "Admins can read funnel events" on public.funnel_events
for select using (public.is_admin());

create policy "Admins can manage monthly license summaries" on public.monthly_license_log_summaries
for all using (public.is_admin()) with check (public.is_admin());

insert into public.brokers (name, slug, launch_partner_code, registration_url)
values ('XM', 'xm', 'R99D9', 'https://affs.click/VJMdK')
on conflict (slug) do update set
  launch_partner_code = excluded.launch_partner_code,
  registration_url = excluded.registration_url,
  is_active = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ea-downloads',
  'ea-downloads',
  false,
  52428800,
  array[
    'application/octet-stream',
    'application/x-msdownload',
    'application/zip'
  ]
)
on conflict (id) do update set public = false;

create policy "Admins can manage EA binaries" on storage.objects
for all using (
  bucket_id = 'ea-downloads'
  and public.is_admin()
) with check (
  bucket_id = 'ea-downloads'
  and public.is_admin()
);
