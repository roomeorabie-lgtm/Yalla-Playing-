-- Schema for Yalla Playing in Supabase
-- Run this in your Supabase SQL Editor to enable Realtime and tables

-- 1. Rooms Table
create table if not exists public.rooms (
  code text primary key,
  target_score int not null default 150,
  stage text not null default 'LOBBY',
  current_round int not null default 1,
  current_letter text,
  host_id text not null,
  letter_picker_id text,
  used_letters jsonb default '[]'::jsonb,
  countdown_seconds int,
  first_submitter_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Players Table
create table if not exists public.players (
  id text not null,
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null,
  avatar text default '🌸',
  is_host boolean default false,
  total_score int default 0,
  is_connected boolean default true,
  last_active timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, room_code)
);

-- 3. Answers Table
create table if not exists public.answers (
  id uuid default gen_random_uuid() primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  player_id text not null,
  round_number int not null,
  category text not null,
  answer text,
  points int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.answers enable row level security;

-- 5. Public Access Policies (Allow all players to read, insert, update rooms & players)
create policy "Allow public read rooms" on public.rooms for select using (true);
create policy "Allow public insert rooms" on public.rooms for insert with check (true);
create policy "Allow public update rooms" on public.rooms for update using (true);

create policy "Allow public read players" on public.players for select using (true);
create policy "Allow public insert players" on public.players for insert with check (true);
create policy "Allow public update players" on public.players for update using (true);

create policy "Allow public read answers" on public.answers for select using (true);
create policy "Allow public insert answers" on public.answers for insert with check (true);
create policy "Allow public update answers" on public.answers for update using (true);

-- 6. Enable Realtime Replication
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.answers;
