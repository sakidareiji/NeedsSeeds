-- ============================================================================
-- 公開前のセキュリティ/プライバシー修正(P0)
--
-- 0005 が anon/authenticated へ全テーブルの SELECT を付与しているため、RLS で
-- 「行」を絞れても「列」は絞れていない。0012(users の UPDATE)・0013(posts の
-- 書き込み)に続き、ここでは読み取り側と「わかる」の書き込み経路を塞ぐ。
--
--   1. users.gender / age  … 全ユーザーの性別・年齢が anon から読めていた
--   2. posts.quality_score … 秘匿前提の AI 査定値が anon から読めていた
--   3. empathies / helpful_marks … REST 直叩きで自己共感・上限回避ができていた
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. 性別・年齢を本人だけが読める別テーブルへ退避する
--
-- users は「表示名が投稿に出る」ため select ポリシーが using (true) であり、
-- RLS は行単位なので同じテーブルに置いたままでは本人限定にできない。属性は
-- 公開する必要がないので、RLS を本人限定にできる別テーブルへ移す。
-- ---------------------------------------------------------------------------
create table public.user_private (
  user_id    uuid primary key references public.users (id) on delete cascade,
  gender     text check (gender in ('male', 'female', 'other', 'unspecified')),
  age        smallint check (age between 0 and 150),
  updated_at timestamptz not null default now()
);

comment on table public.user_private is
  '本人にしか見えないプロフィール属性(§F1 実名不要・任意入力)。公開プロフィールは public.users。';

-- 既存の入力値を移してから列を落とす。
insert into public.user_private (user_id, gender, age)
  select id, gender, age
  from public.users
  where gender is not null or age is not null;

alter table public.users
  drop column gender,
  drop column age;

alter table public.user_private enable row level security;

-- 本人のみ読み書き。anon は行が一致しないので実質アクセス不可(多重防御で revoke も行う)。
create policy "users read own private profile"
  on public.user_private for select using (auth.uid() = user_id);
create policy "users insert own private profile"
  on public.user_private for insert with check (auth.uid() = user_id);
create policy "users update own private profile"
  on public.user_private for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.user_private from anon;
grant select, insert, update on public.user_private to authenticated;


-- ---------------------------------------------------------------------------
-- 2. posts.quality_score を一般ロールから隠す
--
-- AI 査定値は「攻略対象なので出さない」方針(0002 のコメント / F3-6)で
-- post_analyses を RLS で遮断しているが、posts 側の複製列は公開 SELECT の
-- ポリシー配下にあり `select=quality_score` で読めてしまう。列単位 GRANT で
-- 塞ぐ(注目順の算出はアプリがサービスロールで読む)。
--
-- NOTE: 列単位 GRANT にすると anon/authenticated からの `select=*` は
-- permission denied になる。posts を読むクエリは必ず列を明示すること。
-- ---------------------------------------------------------------------------
revoke select on public.posts from anon, authenticated;

grant select (
  id, user_id, category_id, title, body, severity, frequency,
  status, ai_status, resolved_at, resolved_by, resolved_solution_id,
  resolution_note, empathy_count, created_at, updated_at
) on public.posts to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 3. 「わかる」「私も解決した」の書き込みを DB 側でも検証する
--
-- 自己共感の禁止と1日あたりの上限は Server Action にしかなく、公開 anon キー +
-- 自分の JWT で empathies に直接 INSERT すれば両方回避できた(empathy_count は
-- SECURITY DEFINER のトリガーが維持するので注目順まで動く)。0013 で posts に
-- 行ったのと同じ「信頼できない直接書き込み」の封じ込めを行う。
-- ---------------------------------------------------------------------------

-- 対象投稿の所有者・公開状態を RLS を跨いで確認する(投稿者本人以外は hidden を
-- 読めないため、ポリシー内の副問い合わせでは判定できない)。
create or replace function public.can_react_to_post(p_post_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.status = 'published'
      and p.user_id <> auth.uid()
  )
$$;

comment on function public.can_react_to_post(uuid) is
  'リアクション可能な投稿か(公開中 かつ 自分の投稿でない)。empathies / helpful_marks の RLS から使う。';

-- 24時間あたりの「わかる」の絶対上限。プロダクト上の上限(config/limits.ts の
-- empathiesPerDay)はアプリ側で丁寧なメッセージとともに効かせ、こちらは REST を
-- 直接叩かれたときの被害を抑えるための天井として余裕を持たせた値にする。
create index if not exists empathies_user_created_idx
  on public.empathies (user_id, created_at desc);

drop policy "users insert own empathies" on public.empathies;
create policy "users insert own empathies"
  on public.empathies for insert with check (
    auth.uid() = user_id
    and public.can_react_to_post(post_id)
    and (
      select count(*)
      from public.empathies e
      where e.user_id = auth.uid()
        and e.created_at > now() - interval '24 hours'
    ) < 500
  );

drop policy "users insert own helpful_marks" on public.helpful_marks;
create policy "users insert own helpful_marks"
  on public.helpful_marks for insert with check (
    auth.uid() = user_id
    and public.can_react_to_post(post_id)
  );

-- レートリミット集計(events の user_id + type + 期間)を支えるインデックス。
create index if not exists events_user_type_created_idx
  on public.events (user_id, type, created_at desc);
