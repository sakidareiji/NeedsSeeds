-- ============================================================================
-- M4: 運営 — 通報(reports)。管理操作はサービスロールで行う(§5)。
-- ============================================================================

create table public.reports (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid references public.users (id) on delete set null,  -- 通報者
  reason     text not null,   -- spam / abuse / privacy / sensitive / other
  status     text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
-- 同一ユーザーの同一投稿への重複通報を防ぐ。
create unique index reports_unique_user_post on public.reports (post_id, user_id)
  where user_id is not null;

alter table public.reports enable row level security;

-- 通報: ログインユーザーが自分名義で作成できる。閲覧・処理は admin(サービスロール)。
create policy "users insert own reports"
  on public.reports for insert with check (auth.uid() = user_id);
