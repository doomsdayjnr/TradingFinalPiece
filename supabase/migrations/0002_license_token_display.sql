-- Phase 6 follow-up: keep user-visible license tokens for EA setup.
-- Raw tokens are needed by the EA input flow; validation still uses hashed tokens.

create table if not exists public.license_token_displays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  license_entitlement_id uuid not null references public.license_entitlements(id) on delete cascade,
  platform public.platform_type not null,
  kind public.license_kind not null,
  token text not null,
  created_at timestamptz not null default now(),
  unique (license_entitlement_id)
);

create index if not exists license_token_displays_user_id_idx
on public.license_token_displays(user_id);

alter table public.license_token_displays enable row level security;

create policy "Users can read own license token displays" on public.license_token_displays
for select using (user_id = auth.uid() or public.is_admin());

create policy "Admins can manage license token displays" on public.license_token_displays
for all using (public.is_admin()) with check (public.is_admin());
