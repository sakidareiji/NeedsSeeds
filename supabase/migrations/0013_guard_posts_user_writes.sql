-- ============================================================================
-- 権限昇格/改ざんの防止(第2弾): posts への直接書き込みを制限する
--
-- 背景: 0005 が authenticated に全テーブルの INSERT/UPDATE を付与し、posts の
-- RLS は行の所有(auth.uid()=user_id)しか検証しない。そのため一般ユーザーが
-- 公開 anon キー + 自分の JWT で PostgREST を直接叩き、自分の投稿に対して:
--   - status を 'hidden'(モデレーション非公開)から 'published' に戻す
--   - quality_score / empathy_count を任意値にしてランキング・信頼指標を偽装
--   - INSERT 時に status='published' / ai_status='done' として解析・モデレーションを回避
-- ができてしまう(いずれも直接 REST 呼び出しで再現確認済み)。
--
-- 列単位 GRANT では「status を deleted にするのは可・published に戻すのは不可」
-- のような値の制約を表現できないため、トリガーで一般ユーザーの書き込みを検証する。
-- service_role(管理クライアント・解析パイプライン)と postgres(マイグレーション)は
-- 信頼済み経路なので対象外。共感カウント維持の bump_empathy_count は SECURITY
-- DEFINER(所有者=postgres)で動くため、この関数内の empathy_count 更新も対象外。
-- ============================================================================

create or replace function public.guard_posts_user_writes()
returns trigger
language plpgsql
as $$
begin
  -- 一般ユーザー(authenticated / anon)の直接書き込みだけを検証する。
  -- service_role・postgres 等の信頼済みロールは素通しする。
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- 解析・モデレーションを必ず通し、ランキング指標は初期値に固定する。
    new.ai_status := 'pending';
    new.quality_score := null;
    new.empathy_count := 0;
    new.resolved_at := null;
    new.resolved_by := null;
    new.resolved_solution_id := null;
    new.resolution_note := null;
    return new;
  end if;

  -- UPDATE: ユーザーが触ってはいけない列は元の値に固定する。
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.quality_score := old.quality_score;
  new.empathy_count := old.empathy_count;

  -- 公開状態: 現状維持か、本人による取り下げ(deleted)のみ許可。
  -- モデレーション非公開(hidden)を published へ戻す等を防ぐ。
  if new.status is distinct from old.status and new.status <> 'deleted' then
    raise exception 'posts.status はユーザーからは変更できません(削除を除く)';
  end if;

  -- 解析状態: 現状維持か、追記・編集による再解析(pending)のみ許可。
  if new.ai_status is distinct from old.ai_status and new.ai_status <> 'pending' then
    raise exception 'posts.ai_status はユーザーからは変更できません';
  end if;

  return new;
end $$;

create trigger posts_guard_user_writes
  before insert or update on public.posts
  for each row execute function public.guard_posts_user_writes();
