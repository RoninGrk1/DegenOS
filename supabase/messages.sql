-- DegenOS chat message history
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'degen-lounge',
  username text not null,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Indexes for fast history loading
create index if not exists messages_room_created_idx on public.messages (room, created_at desc);

-- Enable Row Level Security
alter table public.messages enable row level security;

-- Allow anyone to read messages (public lounge)
create policy "messages_select_public"
  on public.messages for select
  using (true);

-- Allow anyone to insert (anonymous chat; rate-limit in app if needed)
create policy "messages_insert_public"
  on public.messages for insert
  with check (true);

-- Enable Realtime for the table (so clients get live inserts)
-- In Supabase Dashboard → Database → Replication, add "messages" to the supabase_realtime publication
-- Or run:
-- alter publication supabase_realtime add table public.messages;
