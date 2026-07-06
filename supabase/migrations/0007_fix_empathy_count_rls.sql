-- ============================================================================
-- 「わかる」を押しても empathy_count が増えないバグの修正
--
-- bump_empathy_count は呼び出しユーザーの権限で posts を UPDATE していたが、
-- posts の UPDATE ポリシーは「投稿者本人のみ」(authors can update own posts)。
-- 他人の投稿への「わかる」ではトリガー内 UPDATE が RLS で 0 行に絞られ、
-- empathy_count が加算されなかった(自分の投稿には押せないため常に増えない)。
--
-- 集計キャッシュの維持はRLSを跨いで行うべき処理なので SECURITY DEFINER 化する
-- (0001 の handle_new_user と同じ規約)。search_path も固定する。
-- ============================================================================

create or replace function public.bump_empathy_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set empathy_count = empathy_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set empathy_count = greatest(0, empathy_count - 1) where id = old.post_id;
  end if;
  return null;
end $$;
