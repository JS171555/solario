-- Solário: progresso e configurações por jogador (login anônimo do Supabase Auth).
create table public.level_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  level smallint not null check (level between 1 and 999),
  best_steps integer check (best_steps >= 0),
  best_seconds integer check (best_seconds >= 0),
  plays integer not null default 0 check (plays >= 0),
  total_steps integer not null default 0 check (total_steps >= 0),
  total_seconds integer not null default 0 check (total_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, level)
);

create table public.player_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  volume smallint not null default 70 check (volume between 0 and 100),
  reduce_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.level_progress enable row level security;
alter table public.player_settings enable row level security;

create policy "progresso: ler o próprio" on public.level_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "progresso: criar o próprio" on public.level_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "progresso: atualizar o próprio" on public.level_progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "ajustes: ler os próprios" on public.player_settings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "ajustes: criar os próprios" on public.player_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "ajustes: atualizar os próprios" on public.player_settings for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
