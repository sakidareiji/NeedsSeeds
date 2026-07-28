-- ============================================================================
-- 解析の二重実行を防ぐ(ワーカーの排他制御)
--
-- 背景: /api/analyze は ai_status='pending' の投稿を拾って解析するが、拾った
-- 時点では状態を変えず、完了時に初めて 'done' にしていた。Vercel Cron は毎分
-- 走り、1回の実行は最大10件を直列に LLM へ投げるため、実行が60秒を超えると
-- 次の Cron が同じ投稿を拾い、同じ投稿を二重に解析する(= LLM 課金の二重取り
-- + post_solutions の delete/insert が競合する)。
--
-- 対策: 'processing' を追加し、「拾う」=「UPDATE で自分のものにする」に変える。
-- 単一行の UPDATE は直列化されるので、後発のワーカーは0行になり手を引く。
-- ワーカーが落ちて 'processing' のまま残っても、ai_started_at が古くなれば
-- 再び拾い直せる(可視性タイムアウト方式)。
-- ============================================================================

alter table public.posts drop constraint posts_ai_status_check;
alter table public.posts
  add constraint posts_ai_status_check
  check (ai_status in ('pending', 'processing', 'done', 'failed'));

-- 解析を開始した時刻。stale な 'processing' の再取得判定に使う。
alter table public.posts add column ai_started_at timestamptz;

comment on column public.posts.ai_started_at is
  '解析ワーカーが投稿を確保した時刻。一定時間を過ぎた processing は落ちたとみなして再取得する。';

-- キュー走査は pending と(stale な)processing の両方を見るため、部分インデックスを張り直す。
drop index if exists posts_ai_status_idx;
create index posts_ai_status_idx
  on public.posts (ai_status, ai_started_at)
  where ai_status in ('pending', 'processing');

-- 0013 のガードに ai_started_at を追加する(ユーザーが古い時刻に書き換えて
-- 処理中の投稿を再取得させられないようにする)。他の内容は 0013 のまま。
create or replace function public.guard_posts_user_writes()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.ai_status := 'pending';
    new.ai_started_at := null;
    new.quality_score := null;
    new.empathy_count := 0;
    new.resolved_at := null;
    new.resolved_by := null;
    new.resolved_solution_id := null;
    new.resolution_note := null;
    return new;
  end if;

  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.quality_score := old.quality_score;
  new.empathy_count := old.empathy_count;
  new.ai_started_at := old.ai_started_at;

  if new.status is distinct from old.status and new.status <> 'deleted' then
    raise exception 'posts.status はユーザーからは変更できません(削除を除く)';
  end if;

  -- 解析状態: 現状維持か、追記・編集による再解析(pending)のみ許可。
  if new.ai_status is distinct from old.ai_status and new.ai_status <> 'pending' then
    raise exception 'posts.ai_status はユーザーからは変更できません';
  end if;

  return new;
end $$;
