-- DegenOS full schema (run after or with messages.sql)
-- Dashboard → SQL Editor

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Watchlists (server-side)
create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  chain_id text not null,
  pair_address text,
  token_address text,
  symbol text,
  added_at timestamptz default now(),
  unique(user_id, chain_id, pair_address)
);

-- Alerts
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  chain_id text,
  token_address text,
  symbol text,
  condition text not null, -- 'price_above' | 'price_below' | 'volume_spike' | 'liquidity_drop'
  threshold numeric,
  active boolean default true,
  created_at timestamptz default now(),
  last_triggered timestamptz
);

-- Entitlements (Stripe)
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free', -- 'free' | 'pass_30' | 'pass_90' | 'pass_365'
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id)
);

-- Risk reports (cached evidence)
create table if not exists public.risk_reports (
  id uuid primary key default gen_random_uuid(),
  chain_id text not null,
  token_address text not null,
  score integer, -- 0-100 evidence score (higher = more signals present, not "safer")
  evidence jsonb,
  checked_at timestamptz default now(),
  unique(chain_id, token_address)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.watchlists enable row level security;
alter table public.alerts enable row level security;
alter table public.entitlements enable row level security;
alter table public.risk_reports enable row level security;

-- Profiles: users manage own
create policy "profiles_own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Watchlists: own only
create policy "watchlists_own" on public.watchlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Alerts: own only
create policy "alerts_own" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Entitlements: own read
create policy "entitlements_own_select" on public.entitlements for select using (auth.uid() = user_id);

-- Risk reports: public read
create policy "risk_reports_select" on public.risk_reports for select using (true);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'degen-' || substr(new.id::text, 1, 6)), coalesce(new.raw_user_meta_data->>'full_name', 'Researcher'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
