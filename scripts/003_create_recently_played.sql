-- Create recently_played table to track user's song play history
create table if not exists public.recently_played (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text not null,
  song_data jsonb not null,
  played_at timestamptz not null default now(),
  duration_played integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for efficient queries by user and date
create index if not exists idx_recently_played_user_date 
  on recently_played(user_id, played_at desc);

-- Enable RLS
alter table recently_played enable row level security;

-- Policy: users can only see their own recently played songs
create policy "users_see_own_recently_played"
  on recently_played for select
  using (auth.uid() = user_id);

-- Policy: users can only insert their own recently played songs
create policy "users_insert_own_recently_played"
  on recently_played for insert
  with check (auth.uid() = user_id);

-- Policy: users can delete their own recently played songs
create policy "users_delete_own_recently_played"
  on recently_played for delete
  using (auth.uid() = user_id);
