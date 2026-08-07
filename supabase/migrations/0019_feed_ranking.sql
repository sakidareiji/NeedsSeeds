-- ============================================================================
-- 一覧(注目順/新着)のランキングを DB 側へ移す
--
-- 背景: これまでは「新着で100件ほど取得 → アプリ側で加重ソート → その窓の中で
-- ページング」だった。そのため
--   - 窓より古い高共感の投稿は、どれだけ注目されていてもランク外に落ちる
--   - 運営投稿の除外がアプリ側フィルタなので、ページ境界が正確に切れない
--   - 投稿が増えるほど毎回100件超を転送してソートする
-- という問題があった。全件を DB でスコア順に並べ、ページに必要な id だけを返す。
--
-- 係数は `ranking_weights`(1行だけのテーブル)に置く。運用中に UPDATE すれば
-- デプロイなしで調整でき、かつ**クライアントからは読めない**。
-- (係数が分かると、並び順から非公開の quality_score を逆算できてしまうため。
--  同じ理由で、この関数はスコア値そのものを返さず id の並びだけを返す。)
--
-- NOTE: 公開投稿を全件スキャンしてソートする。数万件規模までは問題ないが、
-- それを超えたらスコアを列にマテリアライズして部分インデックスを張ること。
-- ============================================================================

create table public.ranking_weights (
  -- 単一行であることを型で保証する(true しか入らない主キー)。
  id              boolean primary key default true check (id),
  recency_weight  double precision not null default 1.0,
  empathy_weight  double precision not null default 0.6,
  quality_weight  double precision not null default 0.8,
  half_life_hours double precision not null default 48,
  -- quality_score 未査定(null)の投稿に暫定適用する 0〜1 の品質係数。
  neutral_quality double precision not null default 0.5,
  updated_at      timestamptz not null default now()
);

comment on table public.ranking_weights is
  '注目順スコアの重み(F11)。score = recency_weight * 0.5^(経過時間/half_life_hours) + empathy_weight * log10(1 + わかる数) + quality_weight * (quality_score/100 、未査定なら neutral_quality)';

insert into public.ranking_weights (id) values (true);

alter table public.ranking_weights enable row level security;
-- ポリシーなし + GRANT 剥奪 = サービスロール(と下記の SECURITY DEFINER 関数)専用。
revoke all on public.ranking_weights from anon, authenticated;


-- ---------------------------------------------------------------------------
-- 一覧に出す投稿の id を、指定の並び順で返す。
--
-- 返すのは id だけで、本体は呼び出し側が通常の(RLS が効く)経路で取得する。
-- quality_score と重みは関数の内側に閉じ込め、外へは一切出さない。
--
-- p_sort: 'featured'(注目順)/ 'new'(新着)
-- p_search: 事前に LIKE のメタ文字(\ % _)をエスケープした語。null で絞り込みなし
-- ---------------------------------------------------------------------------
create or replace function public.feed_post_ids(
  p_sort            text default 'featured',
  p_category_id     integer default null,
  p_search          text default null,
  p_exclude_post_id uuid default null,
  p_limit           integer default 30,
  p_offset          integer default 0
)
returns setof uuid
language plpgsql
stable
security definer set search_path = public
as $$
declare
  w public.ranking_weights%rowtype;
begin
  select * into w from public.ranking_weights limit 1;

  if p_sort = 'new' then
    return query
      select p.id
      from public.posts p
      join public.users u on u.id = p.user_id
      where p.status = 'published'
        -- 運営(admin)の投稿はユーザー向け一覧に出さない(種投稿=seed は出す)。
        and u.role <> 'admin'
        and (p_category_id is null or p.category_id = p_category_id)
        and (p_exclude_post_id is null or p.id <> p_exclude_post_id)
        and (
          p_search is null
          or p.title ilike '%' || p_search || '%'
          or p.body ilike '%' || p_search || '%'
        )
      order by p.created_at desc, p.id
      limit p_limit offset p_offset;
  else
    return query
      select p.id
      from public.posts p
      join public.users u on u.id = p.user_id
      where p.status = 'published'
        and u.role <> 'admin'
        and (p_category_id is null or p.category_id = p_category_id)
        and (p_exclude_post_id is null or p.id <> p_exclude_post_id)
        and (
          p_search is null
          or p.title ilike '%' || p_search || '%'
          or p.body ilike '%' || p_search || '%'
        )
      order by
        w.recency_weight
          * power(
              0.5::double precision,
              (extract(epoch from (now() - p.created_at)) / 3600.0) / w.half_life_hours
            )
        + w.empathy_weight * log(1 + greatest(p.empathy_count, 0))
        + w.quality_weight * coalesce(p.quality_score / 100.0, w.neutral_quality)
        desc,
        p.created_at desc, p.id
      limit p_limit offset p_offset;
  end if;
end $$;

comment on function public.feed_post_ids(text, integer, text, uuid, integer, integer) is
  '一覧・関連投稿の並び(F11)。id のみ返し、本体は呼び出し側が RLS 経由で取得する。';

grant execute on function public.feed_post_ids(text, integer, text, uuid, integer, integer)
  to anon, authenticated, service_role;
