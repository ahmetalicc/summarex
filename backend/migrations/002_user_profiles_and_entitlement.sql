-- Run this in the Supabase SQL editor BEFORE deploying the entitlement code.

create table if not exists public.user_profiles (
  user_id        uuid        primary key references auth.users(id) on delete cascade,
  tier           text        not null default 'free' check (tier in ('free', 'pro')),
  pro_expires_at timestamptz null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "users_read_own_profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();
