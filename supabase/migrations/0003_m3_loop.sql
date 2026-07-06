-- ============================================================================
-- M3: 循環 — わかる、解決報告、貢献スコア、通知
-- ============================================================================

-- ---- empathies (「わかる」。1ユーザー1投稿1回・取り消し可 F5) -------------
create table public.empathies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index empathies_post_idx on public.empathies (post_id);

-- posts.empathy_count(非正規化キャッシュ)をトリガで維持する。
create or replace function public.bump_empathy_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set empathy_count = empathy_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set empathy_count = greatest(0, empathy_count - 1) where id = old.post_id;
  end if;
  return null;
end $$;

create trigger empathies_count_ins after insert on public.empathies
  for each row execute function public.bump_empathy_count();
create trigger empathies_count_del after delete on public.empathies
  for each row execute function public.bump_empathy_count();

-- ---- helpful_marks (他ユーザーの「私も解決した/役立った」F6。取り消し不可) --
create table public.helpful_marks (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- ---- contribution_logs (貢献スコアの監査・再計算のための履歴 F6) ----------
-- 内訳・基準はユーザーに非開示。RLSで遮断し、サービスロールのみ書き込み/参照。
create table public.contribution_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  post_id    uuid references public.posts (id) on delete set null,
  points     integer not null,
  reason     text not null,   -- ai_assessment / resolution / high_empathy_resolution / helpful_mark ...
  created_at timestamptz not null default now()
);

create index contribution_logs_user_idx on public.contribution_logs (user_id);
-- 1投稿につき「1回だけ」の加点(査定・解決・高共感ボーナス)の二重加点を防ぐ。
-- helpful_mark は投稿者へ複数付与されうるため対象外(reactor 側の unique で制御)。
create unique index contribution_logs_once_per_post_reason
  on public.contribution_logs (post_id, reason)
  where post_id is not null
    and reason in ('ai_assessment', 'resolution', 'high_empathy_resolution');

-- ---- notifications (アプリ内通知 F8) --------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       text not null,   -- empathy_milestone / solution_presented / contribution_earned / grade_up / resolution_milestone / admin
  payload    jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.empathies enable row level security;
alter table public.helpful_marks enable row level security;
alter table public.contribution_logs enable row level security;
alter table public.notifications enable row level security;

-- empathies: 自分の「わかる」だけ読み書き(件数は posts.empathy_count で公開)。
create policy "users read own empathies"
  on public.empathies for select using (auth.uid() = user_id);
create policy "users insert own empathies"
  on public.empathies for insert with check (auth.uid() = user_id);
create policy "users delete own empathies"
  on public.empathies for delete using (auth.uid() = user_id);

-- helpful_marks: 自分の記録のみ読める/付けられる。取り消し不可(delete政策なし)。
create policy "users read own helpful_marks"
  on public.helpful_marks for select using (auth.uid() = user_id);
create policy "users insert own helpful_marks"
  on public.helpful_marks for insert with check (auth.uid() = user_id);

-- contribution_logs: クライアントには非公開(内訳・基準を開示しない F6)。
-- SELECT/INSERT ポリシーを置かない = サービスロール専用。

-- notifications: 自分の通知のみ閲覧・既読化できる。作成はサービスロール。
create policy "users read own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "users update own notifications"
  on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
