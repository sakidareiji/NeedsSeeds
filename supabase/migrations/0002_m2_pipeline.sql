-- ============================================================================
-- M2: 核 — AI解析(post_analyses)、解決策マスタ(solutions)、自動提示、計測
-- ============================================================================

-- ---- solutions (解決策マスタ / 案件) --------------------------------------
create table public.solutions (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text not null default '',
  url              text not null,
  is_affiliate     boolean not null default false,  -- PR表記の強制フラグ(F4)
  commercial_types text[] not null default '{}',     -- 解決策タイプ(F3-2)
  category_ids     integer[] not null default '{}',
  status           text not null default 'active' check (status in ('active', 'paused')),
  created_at       timestamptz not null default now()
);

create index solutions_status_idx on public.solutions (status);

-- 遅延していた FK(M1): 解決報告で参照する解決策
alter table public.posts
  add constraint posts_resolved_solution_fk
  foreign key (resolved_solution_id) references public.solutions (id);

-- ---- post_analyses (AI解析結果。1投稿1行) ---------------------------------
create table public.post_analyses (
  id                  uuid primary key default gen_random_uuid(),
  post_id             uuid not null unique references public.posts (id) on delete cascade,
  sub_tags            jsonb not null default '[]',      -- 自由生成サブタグ(最大5)
  commercial_type     text,                             -- 解決策タイプ or 'none'
  moderation_flags    jsonb not null default '{}',      -- {abuse,pii,sensitive,spam}
  is_sensitive        boolean not null default false,   -- 健康/借金/法律 → F4無効化
  quality_score       smallint check (quality_score between 0 and 100),  -- 非表示(F3-6)
  follow_up_question  text,                             -- 追記促し(F3-7)
  raw_llm_output      jsonb,                            -- 監査用の生出力
  model               text,
  created_at          timestamptz not null default now()
);

-- ---- post_solutions (投稿ごとの提示。マスタ or 一般アドバイス) ------------
create table public.post_solutions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  solution_id uuid references public.solutions (id),     -- null = 一般アドバイス
  source      text not null check (source in ('master', 'ai_generated')),
  pitch_text  text not null,                             -- 提示文 / 一般アドバイス本文
  rank        smallint not null default 0,
  created_at  timestamptz not null default now()
);

create index post_solutions_post_idx on public.post_solutions (post_id, rank);

-- ---- events (計測。F9) ----------------------------------------------------
create table public.events (
  id          bigint generated always as identity primary key,
  type        text not null,   -- post_create / solution_imp / solution_click / empathy / resolution
  user_id     uuid references public.users (id) on delete set null,
  post_id     uuid references public.posts (id) on delete set null,
  solution_id uuid references public.solutions (id) on delete set null,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index events_type_created_idx on public.events (type, created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.solutions enable row level security;
alter table public.post_analyses enable row level security;
alter table public.post_solutions enable row level security;
alter table public.events enable row level security;

-- solutions: 掲載中(active)は全員閲覧可。CRUD は admin(サービスロール)。
create policy "active solutions are viewable by everyone"
  on public.solutions for select using (status = 'active');

-- post_solutions: 公開投稿に紐づくものは全員閲覧可(解決のヒント表示)。
create policy "post_solutions for published posts are viewable"
  on public.post_solutions for select
  using (exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'published'
  ));

-- post_analyses / events: クライアントには一切公開しない(サービスロール専用)。
-- quality_score・モデレーションフラグは攻略/秘匿対象のため RLS で遮断する(F3-6)。
-- 追記促し(follow_up_question)とサブタグのみ、下記ビュー経由で公開する。

-- ---- 公開ビュー: 追記促し + サブタグのみを露出(quality/モデレーションは除外) ----
create view public.post_public_analysis
with (security_invoker = off) as
  select pa.post_id, pa.sub_tags, pa.follow_up_question
  from public.post_analyses pa
  join public.posts p on p.id = pa.post_id
  where p.status = 'published';

grant select on public.post_public_analysis to anon, authenticated;
