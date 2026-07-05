-- ============================================================================
-- M1: 骨格 — users, categories, posts + RLS
-- ============================================================================

-- ---- users (public profile, mirrors auth.users) ---------------------------
create table public.users (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text not null check (char_length(display_name) between 1 and 40),
  bio                text check (char_length(bio) <= 500),
  role               text not null default 'user' check (role in ('user', 'admin', 'seed')),
  contribution_score integer not null default 0,  -- 非正規化キャッシュ(F6)
  created_at         timestamptz not null default now()
);

comment on column public.users.contribution_score is
  '換金・交換不可の累積 reputation。contribution_logs から再計算可能なキャッシュ(F6/1.4)';

-- ---- categories -----------------------------------------------------------
create table public.categories (
  id         serial primary key,
  slug       text not null unique,
  name       text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

-- ---- posts ----------------------------------------------------------------
create table public.posts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users (id) on delete cascade,
  category_id          integer not null references public.categories (id),
  title                text not null check (char_length(title) between 1 and 60),
  body                 text not null check (char_length(body) between 1 and 2000),
  severity             smallint not null check (severity between 1 and 5),
  frequency            text check (frequency in ('daily', 'weekly', 'monthly', 'rarely')),
  status               text not null default 'published'
                         check (status in ('published', 'hidden', 'deleted')),
  ai_status            text not null default 'pending'
                         check (ai_status in ('pending', 'done', 'failed')),
  resolved_at          timestamptz,
  resolved_by          text check (resolved_by in ('solution', 'self', 'other')),
  resolved_solution_id uuid,  -- FK added in M2 when solutions table exists
  empathy_count        integer not null default 0,  -- 非正規化キャッシュ(F5)
  quality_score        smallint check (quality_score between 0 and 100),  -- AI査定(M2), 非表示
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index posts_status_created_idx on public.posts (status, created_at desc);
create index posts_category_idx on public.posts (category_id, created_at desc);
create index posts_user_idx on public.posts (user_id, created_at desc);
create index posts_ai_status_idx on public.posts (ai_status) where ai_status = 'pending';

-- ---- updated_at trigger ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---- auto-create public.users on auth signup ------------------------------
-- display_name is taken from signup metadata; falls back to a placeholder.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      'ユーザー' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;

-- users: profiles are public (display names appear on posts). Write own only.
create policy "users are viewable by everyone"
  on public.users for select using (true);

create policy "users can update own profile"
  on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

-- categories: active categories readable by everyone. Admin CRUD via service role.
create policy "active categories are viewable by everyone"
  on public.categories for select using (is_active = true);

-- posts: published posts are public; authors see and manage their own posts.
create policy "published posts are viewable by everyone"
  on public.posts for select using (status = 'published');

create policy "authors can view own posts"
  on public.posts for select using (auth.uid() = user_id);

create policy "authors can insert own posts"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "authors can update own posts"
  on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No DELETE policy: deletion is logical (status = 'deleted') to preserve data
-- assets (§5). Hard deletes only via service role / admin.
